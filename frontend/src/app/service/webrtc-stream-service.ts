import { effect, inject, Service, signal } from '@angular/core';
import { RoomInfoService } from './room-info-service';
import { SocketService } from './socket-service';
import { LocalStreamService } from './local-stream-service';
import { DirectStreamService } from './direct-stream-service';
import { ApiResponse } from '../model/api';

interface SfuSessionDescription {
  type: RTCSdpType;
  sdp: string;
}

interface SfuPublishResult {
  sessionId: string;
  sessionDescription: SfuSessionDescription;
  trackName: string;
  mid: string;
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
export class WebrtcStreamService {
  private static readonly sfuRequestTimeoutMs = 15000;
  private static readonly rtcConfiguration: RTCConfiguration = {
    iceServers: [{ urls: 'stun:stun.cloudflare.com:3478' }],
    bundlePolicy: 'max-bundle',
  };

  errorMessage = signal<string | null>(null);
  activeWebrtcStream = signal<MediaStream | null>(null);

  private rtcPeerConnection: RTCPeerConnection | null = null;
  private subscriberRtcPeerConnection: RTCPeerConnection | null = null;
  private publisherSender: RTCRtpSender | null = null;
  private appliedBitrateKbps: number | null = null;
  private publisherSessionId: string | null = null;
  private subscriberSessionId: string | null = null;
  private publisherTargetStreamId: string | null = null;
  private subscriberTargetStreamId: string | null = null;
  private subscriberSubscribedStreamId: string | null = null;
  private publisherGeneration = 0;
  private subscriberGeneration = 0;
  private subscriberNegotiating = false;
  private subscriberRetryRequested = false;

  private roomInfoService = inject(RoomInfoService);
  private socketService = inject(SocketService);
  private localStreamService = inject(LocalStreamService);
  private directStreamService = inject(DirectStreamService);

  constructor() {
    this.socketService.socket.on('sfu_stream_ready', (data: SfuStreamReadyEvent) => {
      const activeRoom = this.roomInfoService.activeRoom();
      if (
        !activeRoom ||
        activeRoom.id !== data.room_id ||
        activeRoom.stream.activeStreamId !== data.stream_id
      ) {
        return;
      }
      if (this.localStreamService.localStreams()[data.stream_id]) {
        return;
      }
      if (this.subscriberSubscribedStreamId === data.stream_id) {
        if (this.subscriberNegotiating) {
          this.subscriberRetryRequested = true;
        }
        return;
      }
      this.syncSubscriber(true);
    });
    this.socketService.socket.on('sfu_stream_unavailable', (data: SfuStreamUnavailableEvent) => {
      const activeRoom = this.roomInfoService.activeRoom();
      if (!activeRoom || activeRoom.id !== data.room_id) {
        return;
      }
      // A room has a single publication, so any live subscription is to it.
      if (this.subscriberRtcPeerConnection) {
        void this.closeSubscriber();
      }
    });

    effect(() => {
      this.syncPublisher();
    });

    effect(() => {
      this.syncSubscriber();
    });
  }

  closeRtcPeerConnection() {
    void this.closePublisher();
  }

  async openRtcPeerConnection(stream: MediaStream) {
    const activeRoom = this.roomInfoService.activeRoom();
    if (!activeRoom || !activeRoom.stream.activeStreamId) {
      return;
    }
    await this.publishActiveStream(
      stream,
      activeRoom.stream.activeStreamId,
      activeRoom.stream.webrtcBitrateKbps,
    );
  }

  private syncPublisher() {
    const activeRoom = this.roomInfoService.activeRoom();
    if (!activeRoom) {
      void this.closePublisher();
      return;
    }
    const activeStreamId = activeRoom.stream.activeStreamId;
    const activeStream = this.localStreamService.localStreams()[activeStreamId];
    const shouldPublish =
      activeRoom.activeMode === 'stream' && !!activeStream && activeRoom.stream.webrtcStreaming;
    if (!shouldPublish) {
      void this.closePublisher();
      return;
    }
    if (this.publisherTargetStreamId === activeStreamId) {
      void this.applyBitrate(activeRoom.stream.webrtcBitrateKbps);
      return;
    }
    void this.publishActiveStream(
      activeStream.stream,
      activeStreamId,
      activeRoom.stream.webrtcBitrateKbps,
    );
  }

  private syncSubscriber(force = false) {
    const activeRoom = this.roomInfoService.activeRoom();
    if (!activeRoom) {
      void this.closeSubscriber();
      return;
    }
    const activeStreamId = activeRoom.stream.activeStreamId;
    const shouldSubscribe =
      activeRoom.activeMode === 'stream' &&
      !!activeStreamId &&
      activeRoom.stream.webrtcStreaming &&
      (this.roomInfoService.isPresenter() || activeRoom.stream.streamToClients) &&
      !this.directStreamService.parentLocalStreams()[activeStreamId] &&
      !this.localStreamService.localStreams()[activeStreamId];
    if (!shouldSubscribe) {
      void this.closeSubscriber();
      return;
    }
    // Prefer reusing the live subscriber connection. A room update (not a
    // publication-ready event) only retargets, so a renegotiation is not
    // started before the publisher has announced the new stream.
    if (!force && this.subscriberRtcPeerConnection) {
      this.subscriberTargetStreamId = activeStreamId;
      return;
    }
    if (!force && this.subscriberTargetStreamId === activeStreamId) {
      return;
    }
    if (force && this.subscriberSubscribedStreamId === activeStreamId) {
      return;
    }
    if (this.subscriberNegotiating) {
      this.subscriberRetryRequested = true;
      return;
    }
    void this.subscribeToActiveStream(activeStreamId);
  }

  private async closePublisher() {
    this.publisherGeneration++;
    this.publisherTargetStreamId = null;
    await this.releasePublisher();
  }

  private async releasePublisher() {
    const rtcPeerConnection = this.rtcPeerConnection;
    const sessionId = this.publisherSessionId;
    this.rtcPeerConnection = null;
    this.publisherSender = null;
    this.appliedBitrateKbps = null;
    this.publisherSessionId = null;
    if (rtcPeerConnection) {
      rtcPeerConnection.ontrack = null;
      rtcPeerConnection.onconnectionstatechange = null;
      rtcPeerConnection.close();
    }
    if (sessionId) {
      await this.emitSfu('sfu_close', { session_id: sessionId });
    }
  }

  private async closeSubscriber() {
    this.subscriberGeneration++;
    this.subscriberTargetStreamId = null;
    this.subscriberNegotiating = false;
    this.subscriberRetryRequested = false;
    await this.releaseSubscriber();
  }

  private async releaseSubscriber() {
    const rtcPeerConnection = this.subscriberRtcPeerConnection;
    const sessionId = this.subscriberSessionId;
    this.subscriberRtcPeerConnection = null;
    this.subscriberSessionId = null;
    this.subscriberSubscribedStreamId = null;
    if (rtcPeerConnection) {
      rtcPeerConnection.ontrack = null;
      rtcPeerConnection.onconnectionstatechange = null;
      rtcPeerConnection.close();
    }
    const activeWebrtcStream = this.activeWebrtcStream();
    if (activeWebrtcStream) {
      activeWebrtcStream.getTracks().forEach((track) => track.stop());
    }
    this.activeWebrtcStream.set(null);
    if (sessionId) {
      await this.emitSfu('sfu_close', { session_id: sessionId });
    }
  }

  private canReplacePublisherTrack(): boolean {
    const rtcPeerConnection = this.rtcPeerConnection;
    if (!rtcPeerConnection || !this.publisherSender || !this.publisherSessionId) {
      return false;
    }
    return (
      rtcPeerConnection.connectionState !== 'closed' &&
      rtcPeerConnection.connectionState !== 'failed'
    );
  }

  private async applyBitrate(kbps: number) {
    const sender = this.publisherSender;
    if (!sender || !Number.isFinite(kbps) || kbps <= 0 || this.appliedBitrateKbps === kbps) {
      return;
    }
    const parameters = sender.getParameters();
    if (!parameters.encodings || parameters.encodings.length === 0) {
      parameters.encodings = [{}];
    }
    for (const encoding of parameters.encodings) {
      encoding.maxBitrate = kbps * 1000;
    }
    this.appliedBitrateKbps = kbps;
    try {
      await sender.setParameters(parameters);
    } catch (error) {
      this.appliedBitrateKbps = null;
      this.errorMessage.set('Error applying WebRTC bitrate: ' + (error as Error).message);
    }
  }

  private async publishActiveStream(stream: MediaStream, streamId: string, bitrateKbps: number) {
    const generation = ++this.publisherGeneration;
    this.publisherTargetStreamId = streamId;
    try {
      const [track] = stream.getVideoTracks();
      if (!track) {
        this.errorMessage.set('The active stream does not contain a video track.');
        await this.closePublisher();
        return;
      }

      // Switching between streams from the same host only swaps the source
      // track on the existing sender. The SFU session and subscribers stay up.
      if (this.canReplacePublisherTrack()) {
        await this.publisherSender!.replaceTrack(track);
        if (generation !== this.publisherGeneration) {
          return;
        }
        const switchResponse = await this.emitSfu('sfu_switch_stream', {
          session_id: this.publisherSessionId,
          stream_id: streamId,
          label: this.localStreamService.localStreams()[streamId]?.label ?? '',
        });
        if (generation !== this.publisherGeneration) {
          return;
        }
        if (!switchResponse.success) {
          throw new Error(switchResponse.error);
        }
        this.errorMessage.set(null);
        await this.applyBitrate(bitrateKbps);
        return;
      }

      await this.releasePublisher();
      if (generation !== this.publisherGeneration) {
        return;
      }

      const rtcPeerConnection = new RTCPeerConnection(WebrtcStreamService.rtcConfiguration);
      this.rtcPeerConnection = rtcPeerConnection;
      const transceiver = rtcPeerConnection.addTransceiver(track, { direction: 'sendonly' });
      this.publisherSender = transceiver.sender;
      const offer = await rtcPeerConnection.createOffer();
      await rtcPeerConnection.setLocalDescription(offer);
      await this.waitForIceGathering(rtcPeerConnection);
      if (generation !== this.publisherGeneration) {
        return;
      }

      const mid = transceiver.mid;
      const localDescription = rtcPeerConnection.localDescription;
      if (!mid || !localDescription?.sdp) {
        throw new Error('Could not prepare the WebRTC offer.');
      }

      const response = await this.emitSfu<SfuPublishResult>('sfu_publish', {
        room_id: this.roomInfoService.activeRoomId(),
        stream_id: streamId,
        sdp: localDescription.sdp,
        mid,
      });
      if (generation !== this.publisherGeneration) {
        if (response.success) {
          await this.emitSfu('sfu_close', { session_id: response.data.sessionId });
        }
        return;
      }
      if (!response.success) {
        throw new Error(response.error);
      }

      this.publisherSessionId = response.data.sessionId;
      await rtcPeerConnection.setRemoteDescription(response.data.sessionDescription);
      if (generation !== this.publisherGeneration) {
        await this.emitSfu('sfu_close', { session_id: response.data.sessionId });
        return;
      }

      const readyResponse = await this.emitSfu('sfu_publish_ready', {
        session_id: response.data.sessionId,
      });
      if (generation !== this.publisherGeneration) {
        return;
      }
      if (!readyResponse.success) {
        throw new Error(readyResponse.error);
      }
      this.errorMessage.set(null);
      await this.applyBitrate(bitrateKbps);
    } catch (error) {
      if (generation === this.publisherGeneration) {
        this.errorMessage.set('Error publishing WebRTC stream: ' + (error as Error).message);
        await this.closePublisher();
      }
    }
  }

  private async subscribeToActiveStream(streamId: string) {
    const generation = ++this.subscriberGeneration;
    this.subscriberTargetStreamId = streamId;
    this.subscriberNegotiating = true;
    try {
      const existingPeerConnection = this.subscriberRtcPeerConnection;
      const reusing = existingPeerConnection !== null && this.subscriberSessionId !== null;
      if (!reusing) {
        await this.releaseSubscriber();
        if (generation !== this.subscriberGeneration) {
          return;
        }
      }

      const rtcPeerConnection = reusing
        ? existingPeerConnection
        : new RTCPeerConnection(WebrtcStreamService.rtcConfiguration);
      this.subscriberRtcPeerConnection = rtcPeerConnection;
      rtcPeerConnection.ontrack = (event: RTCTrackEvent) => {
        if (generation !== this.subscriberGeneration) {
          event.track.stop();
          return;
        }
        const previousStream = this.activeWebrtcStream();
        if (previousStream) {
          previousStream.getTracks().forEach((track) => track.stop());
        }
        this.activeWebrtcStream.set(new MediaStream([event.track]));
      };

      const response = await this.emitSfu<SfuSubscribeResult>('sfu_subscribe', {
        room_id: this.roomInfoService.activeRoomId(),
        stream_id: streamId,
      });
      if (generation !== this.subscriberGeneration) {
        if (response.success && !reusing) {
          await this.emitSfu('sfu_close', { session_id: response.data.sessionId });
        }
        return;
      }
      if (!response.success) {
        if (response.error === 'not_ready') {
          const retry = this.subscriberRetryRequested;
          this.subscriberRetryRequested = false;
          await this.closeSubscriber();
          if (retry) {
            this.syncSubscriber();
          }
        } else {
          this.errorMessage.set('Error subscribing to WebRTC stream: ' + response.error);
          await this.closeSubscriber();
        }
        return;
      }

      this.subscriberSessionId = response.data.sessionId;
      await rtcPeerConnection.setRemoteDescription(response.data.sessionDescription);
      if (generation !== this.subscriberGeneration) {
        if (!reusing) {
          await this.emitSfu('sfu_close', { session_id: response.data.sessionId });
        }
        return;
      }

      if (response.data.sessionDescription.type === 'offer') {
        const answer = await rtcPeerConnection.createAnswer();
        await rtcPeerConnection.setLocalDescription(answer);
        await this.waitForIceGathering(rtcPeerConnection);
        if (generation !== this.subscriberGeneration) {
          return;
        }
        const localDescription = rtcPeerConnection.localDescription;
        if (!localDescription?.sdp) {
          throw new Error('Could not prepare the WebRTC answer.');
        }
        const renegotiateResponse = await this.emitSfu('sfu_renegotiate', {
          session_id: response.data.sessionId,
          sdp: localDescription.sdp,
        });
        if (generation !== this.subscriberGeneration) {
          return;
        }
        if (!renegotiateResponse.success) {
          throw new Error(renegotiateResponse.error);
        }
      }
      this.errorMessage.set(null);
      this.subscriberSubscribedStreamId = streamId;
    } catch (error) {
      if (generation === this.subscriberGeneration) {
        this.errorMessage.set('Error subscribing to WebRTC stream: ' + (error as Error).message);
        await this.closeSubscriber();
      }
    } finally {
      if (generation === this.subscriberGeneration) {
        this.subscriberNegotiating = false;
        if (this.subscriberRetryRequested) {
          this.subscriberRetryRequested = false;
          this.syncSubscriber();
        }
      }
    }
  }

  private waitForIceGathering(rtcPeerConnection: RTCPeerConnection) {
    if (rtcPeerConnection.iceGatheringState === 'complete') {
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      let settled = false;
      const done = () => {
        if (settled) {
          return;
        }
        settled = true;
        window.clearTimeout(timeout);
        rtcPeerConnection.removeEventListener('icegatheringstatechange', handleStateChange);
        resolve();
      };
      const timeout = window.setTimeout(done, 3000);
      const handleStateChange = () => {
        if (rtcPeerConnection.iceGatheringState === 'complete') {
          done();
        }
      };
      rtcPeerConnection.addEventListener('icegatheringstatechange', handleStateChange);
    });
  }

  private emitSfu<T>(event: string, payload: unknown): Promise<ApiResponse<T>> {
    return new Promise((resolve) => {
      let settled = false;
      const timeout = window.setTimeout(() => {
        if (settled) {
          return;
        }
        settled = true;
        resolve({ success: false, error: 'Timed out waiting for the server.' });
      }, WebrtcStreamService.sfuRequestTimeoutMs);
      this.socketService.socket.emit(event, payload, (response: ApiResponse<T>) => {
        if (settled) {
          return;
        }
        settled = true;
        window.clearTimeout(timeout);
        resolve(response ?? { success: false, error: 'No response from the server.' });
      });
    });
  }
}
