import { effect, inject, Service, signal } from '@angular/core';
import { RoomInfoService } from './room-info-service';
import { SocketService } from './socket-service';
import { LocalStreamService } from './local-stream-service';
import { DirectStreamService } from './direct-stream-service';
import { SfuSignallingService } from './sfu-signalling-service';
import {
  RTC_CONFIGURATION,
  SfuSessionDescription,
  closePeerConnection,
  waitForIceGathering,
} from './rtc-utils';

interface SfuPrepareResult {
  sessionId: string;
  sessionDescription: SfuSessionDescription;
}

interface SfuSubscribeResult {
  sessionId: string;
  sessionDescription: SfuSessionDescription;
  streamId: string;
  mid: string;
}

interface SfuStreamReadyEvent {
  room_id: string;
  stream_id: string;
  label?: string;
}

interface SfuStreamUnavailableEvent {
  room_id: string;
  stream_id: string;
}

@Service()
export class WebrtcSubscriberService {
  errorMessage = signal<string | null>(null);
  activeWebrtcStream = signal<MediaStream | null>(null);

  private rtcPeerConnection: RTCPeerConnection | null = null;
  private sessionId: string | null = null;
  private targetStreamId: string | null = null;
  private subscribedStreamId: string | null = null;
  private generation = 0;
  private negotiating = false;
  private retryRequested = false;

  private roomInfoService = inject(RoomInfoService);
  private socketService = inject(SocketService);
  private localStreamService = inject(LocalStreamService);
  private directStreamService = inject(DirectStreamService);
  private signalling = inject(SfuSignallingService);

  constructor() {
    this.socketService.socket.on('sfu_stream_ready', (data: SfuStreamReadyEvent) => {
      const activeRoom = this.roomInfoService.activeRoom();
      if (activeRoom?.id === data.room_id && activeRoom.stream.activeStreamId === data.stream_id) {
        this.sync(true);
      }
    });

    this.socketService.socket.on('sfu_stream_unavailable', (data: SfuStreamUnavailableEvent) => {
      if (this.roomInfoService.activeRoom()?.id === data.room_id) {
        this.dropActiveStream();
      }
    });

    effect(() => this.sync());
  }

  private sync(force = false) {
    const activeRoom = this.roomInfoService.activeRoom();
    const streamId = activeRoom?.stream.activeStreamId ?? '';
    const shouldSubscribe =
      !!activeRoom &&
      !!streamId &&
      activeRoom.activeMode === 'stream' &&
      activeRoom.stream.webrtcStreaming &&
      (this.roomInfoService.isAdminRoom() || activeRoom.stream.streamToClients) &&
      !this.directStreamService.parentLocalStreams()[streamId] &&
      !this.localStreamService.localStreams()[streamId];
    if (!shouldSubscribe) {
      void this.close();
      return;
    }
    if (!force && this.rtcPeerConnection) {
      this.targetStreamId = streamId;
      return;
    }
    if (!force && this.targetStreamId === streamId) {
      return;
    }
    if (force && this.subscribedStreamId === streamId) {
      return;
    }
    if (this.negotiating) {
      this.retryRequested = true;
      return;
    }
    void this.subscribe(streamId);
  }

  private async subscribe(streamId: string) {
    const generation = ++this.generation;
    this.targetStreamId = streamId;
    this.negotiating = true;
    try {
      if (!this.rtcPeerConnection || !this.sessionId) {
        await this.release();
        if (generation !== this.generation) {
          return;
        }
        const prepared = await this.prepareConnection(generation);
        if (!prepared || generation !== this.generation) {
          return;
        }
      }

      const rtcPeerConnection = this.rtcPeerConnection;
      if (!rtcPeerConnection) {
        throw new Error('Could not prepare the subscriber connection.');
      }

      const response = await this.signalling.emit<SfuSubscribeResult>('sfu_subscribe', {
        room_id: this.roomInfoService.activeRoomId(),
        stream_id: streamId,
      });
      if (generation !== this.generation) {
        return;
      }
      if (!response.success) {
        if (response.error === 'not_ready') {
          return;
        }
        this.errorMessage.set('Error subscribing to WebRTC stream: ' + response.error);
        await this.close();
        return;
      }

      this.sessionId = response.data.sessionId;
      const applied = await this.applyRemoteDescription(
        rtcPeerConnection,
        response.data.sessionId,
        response.data.sessionDescription,
        generation,
      );
      if (!applied || generation !== this.generation) {
        return;
      }
      this.errorMessage.set(null);
      this.subscribedStreamId = streamId;
    } catch (error) {
      if (generation === this.generation) {
        this.errorMessage.set('Error subscribing to WebRTC stream: ' + (error as Error).message);
        await this.close();
      }
    } finally {
      if (generation === this.generation) {
        this.negotiating = false;
        if (this.retryRequested) {
          this.retryRequested = false;
          this.sync(true);
        }
      }
    }
  }

  private async prepareConnection(generation: number): Promise<boolean> {
    const rtcPeerConnection = new RTCPeerConnection(RTC_CONFIGURATION);
    this.rtcPeerConnection = rtcPeerConnection;

    const response = await this.signalling.emit<SfuPrepareResult>('sfu_prepare_subscription', {
      room_id: this.roomInfoService.activeRoomId(),
      stream_id: this.targetStreamId,
    });
    if (generation !== this.generation) {
      if (response.success) {
        await this.signalling.emit('sfu_close', { session_id: response.data.sessionId });
      }
      return false;
    }
    if (!response.success) {
      throw new Error(response.error);
    }

    this.sessionId = response.data.sessionId;
    return this.applyRemoteDescription(
      rtcPeerConnection,
      response.data.sessionId,
      response.data.sessionDescription,
      generation,
    );
  }

  private async applyRemoteDescription(
    rtcPeerConnection: RTCPeerConnection,
    sessionId: string,
    sessionDescription: SfuSessionDescription,
    generation: number,
  ): Promise<boolean> {
    // A prepared connection is reused across subscriptions, so the track
    // handler must be refreshed for the current generation. Otherwise the
    // handler installed during the prepare phase treats the new track as stale
    // and stops it before it can be shown.
    rtcPeerConnection.ontrack = this.createTrackHandler(generation);
    await rtcPeerConnection.setRemoteDescription(sessionDescription);
    if (generation !== this.generation) {
      return false;
    }
    if (sessionDescription.type !== 'offer') {
      return true;
    }
    const answer = await rtcPeerConnection.createAnswer();
    await rtcPeerConnection.setLocalDescription(answer);
    await waitForIceGathering(rtcPeerConnection);
    if (generation !== this.generation) {
      return false;
    }
    const localDescription = rtcPeerConnection.localDescription;
    if (!localDescription?.sdp) {
      throw new Error('Could not prepare the WebRTC answer.');
    }
    const renegotiateResponse = await this.signalling.emit('sfu_renegotiate', {
      session_id: sessionId,
      sdp: localDescription.sdp,
    });
    if (generation !== this.generation) {
      return false;
    }
    if (!renegotiateResponse.success) {
      throw new Error(renegotiateResponse.error);
    }
    return true;
  }

  private createTrackHandler(generation: number) {
    return (event: RTCTrackEvent) => {
      if (generation !== this.generation) {
        event.track.stop();
        return;
      }
      this.setActiveStream(event.track);
    };
  }

  private setActiveStream(track: MediaStreamTrack) {
    this.stopActiveStream();
    this.activeWebrtcStream.set(new MediaStream([track]));
  }

  private stopActiveStream() {
    this.activeWebrtcStream()
      ?.getTracks()
      .forEach((track) => track.stop());
    this.activeWebrtcStream.set(null);
  }

  private dropActiveStream() {
    this.subscribedStreamId = null;
    this.stopActiveStream();
  }

  private async close() {
    this.generation++;
    this.targetStreamId = null;
    this.negotiating = false;
    this.retryRequested = false;
    await this.release();
  }

  private async release() {
    const rtcPeerConnection = this.rtcPeerConnection;
    const sessionId = this.sessionId;
    this.rtcPeerConnection = null;
    this.sessionId = null;
    this.subscribedStreamId = null;
    closePeerConnection(rtcPeerConnection);
    this.stopActiveStream();
    if (sessionId) {
      await this.signalling.emit('sfu_close', { session_id: sessionId });
    }
  }
}
