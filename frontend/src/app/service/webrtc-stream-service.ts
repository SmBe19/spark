import { computed, effect, inject, Service, signal } from '@angular/core';
import { RoomInfoService } from './room-info-service';
import { SocketService } from './socket-service';
import { LocalStreamService } from './local-stream-service';
import { DirectStreamService } from './direct-stream-service';
import { ApiResponse } from '../model/api';

@Service()
export class WebrtcStreamService {
  errorMessage = signal<string | null>(null);
  activeWebrtcStream = signal<MediaStream | null>(null);

  private publisherRtcPeerConnection: RTCPeerConnection | null = null;
  private publisherSender: RTCRtpSender | null = null;
  private publisherSessionId: string | null = null;
  private publisherTargetStreamId: string | null = null;
  private appliedBitrateKbps: number | null = null;
  private publisherGeneration = 0;

  private subscriberRtcPeerConnection: RTCPeerConnection | null = null;
  private subscriberSessionId: string | null = null;
  private subscriberTargetStreamId: string | null = null;
  private subscriberSubscribedStreamId: string | null = null;
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
      if (activeRoom?.id === data.room_id && activeRoom.stream.activeStreamId === data.stream_id) {
        this.syncSubscriber(true);
      }
    });

    this.socketService.socket.on('sfu_stream_unavailable', (data: SfuStreamUnavailableEvent) => {
      if (this.roomInfoService.activeRoom()?.id === data.room_id) {
        this.dropActiveWebrtcStream();
      }
    });

    effect(() => this.syncPublisher());
    effect(() => this.syncSubscriber());
  }

  // --- Publisher ---------------------------------------------------------

  private syncPublisher() {
    const activeRoom = this.roomInfoService.activeRoom();
    const streamId = activeRoom?.stream.activeStreamId ?? '';
    const localStream = this.localStreamService.localStreams()[streamId];
    const shouldPublish =
      !!activeRoom &&
      activeRoom.activeMode === 'stream' &&
      !!localStream &&
      activeRoom.stream.webrtcStreaming;
    if (!shouldPublish) {
      void this.closePublisher();
      return;
    }
    if (this.publisherTargetStreamId === streamId) {
      void this.applyBitrate(activeRoom.stream.webrtcBitrateKbps);
      return;
    }
    void this.publishActiveStream(
      localStream.stream,
      streamId,
      activeRoom.stream.webrtcBitrateKbps,
    );
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
      if (this.canReplacePublisherTrack()) {
        await this.switchPublisherTrack(track, streamId, bitrateKbps, generation);
        return;
      }
      await this.createPublisherConnection(track, streamId, bitrateKbps, generation);
    } catch (error) {
      if (generation === this.publisherGeneration) {
        this.errorMessage.set('Error publishing WebRTC stream: ' + (error as Error).message);
        await this.closePublisher();
      }
    }
  }

  private canReplacePublisherTrack() {
    const rtcPeerConnection = this.publisherRtcPeerConnection;
    if (!rtcPeerConnection || !this.publisherSender || !this.publisherSessionId) {
      return false;
    }
    return (
      rtcPeerConnection.connectionState !== 'closed' &&
      rtcPeerConnection.connectionState !== 'failed'
    );
  }

  private async switchPublisherTrack(
    track: MediaStreamTrack,
    streamId: string,
    bitrateKbps: number,
    generation: number,
  ) {
    await this.publisherSender!.replaceTrack(track);
    if (generation !== this.publisherGeneration) {
      return;
    }
    const response = await this.emitSfu('sfu_switch_stream', {
      session_id: this.publisherSessionId,
      stream_id: streamId,
      label: this.localStreamService.localStreams()[streamId]?.label ?? '',
    });
    if (generation !== this.publisherGeneration) {
      return;
    }
    if (!response.success) {
      throw new Error(response.error);
    }
    this.errorMessage.set(null);
    await this.applyBitrate(bitrateKbps);
  }

  private async createPublisherConnection(
    track: MediaStreamTrack,
    streamId: string,
    bitrateKbps: number,
    generation: number,
  ) {
    await this.releasePublisher();
    if (generation !== this.publisherGeneration) {
      return;
    }

    const rtcPeerConnection = new RTCPeerConnection(RTC_CONFIGURATION);
    this.publisherRtcPeerConnection = rtcPeerConnection;
    const transceiver = rtcPeerConnection.addTransceiver(track, { direction: 'sendonly' });
    this.publisherSender = transceiver.sender;

    const offer = await rtcPeerConnection.createOffer();
    await rtcPeerConnection.setLocalDescription(offer);
    await waitForIceGathering(rtcPeerConnection);
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
      label: track.label,
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
  }

  private async closePublisher() {
    this.publisherGeneration++;
    this.publisherTargetStreamId = null;
    await this.releasePublisher();
  }

  private async releasePublisher() {
    const rtcPeerConnection = this.publisherRtcPeerConnection;
    const sessionId = this.publisherSessionId;
    this.publisherRtcPeerConnection = null;
    this.publisherSender = null;
    this.appliedBitrateKbps = null;
    this.publisherSessionId = null;
    closePeerConnection(rtcPeerConnection);
    if (sessionId) {
      await this.emitSfu('sfu_close', { session_id: sessionId });
    }
  }

  private async applyBitrate(kbps: number) {
    const sender = this.publisherSender;
    if (!sender || !Number.isFinite(kbps) || kbps <= 0 || this.appliedBitrateKbps === kbps) {
      return;
    }
    const parameters = sender.getParameters();
    if (!parameters.encodings?.length) {
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

  // --- Subscriber --------------------------------------------------------

  private syncSubscriber(force = false) {
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
      void this.closeSubscriber();
      return;
    }
    if (!force && this.subscriberRtcPeerConnection) {
      this.subscriberTargetStreamId = streamId;
      return;
    }
    if (!force && this.subscriberTargetStreamId === streamId) {
      return;
    }
    if (force && this.subscriberSubscribedStreamId === streamId) {
      return;
    }
    if (this.subscriberNegotiating) {
      this.subscriberRetryRequested = true;
      return;
    }
    void this.subscribeToActiveStream(streamId);
  }

  private async subscribeToActiveStream(streamId: string) {
    const generation = ++this.subscriberGeneration;
    this.subscriberTargetStreamId = streamId;
    this.subscriberNegotiating = true;
    try {
      if (!this.subscriberRtcPeerConnection || !this.subscriberSessionId) {
        await this.releaseSubscriber();
        if (generation !== this.subscriberGeneration) {
          return;
        }
        const prepared = await this.prepareSubscriberConnection(generation);
        if (!prepared || generation !== this.subscriberGeneration) {
          return;
        }
      }

      const rtcPeerConnection = this.subscriberRtcPeerConnection;
      if (!rtcPeerConnection) {
        throw new Error('Could not prepare the subscriber connection.');
      }

      const response = await this.emitSfu<SfuSubscribeResult>('sfu_subscribe', {
        room_id: this.roomInfoService.activeRoomId(),
        stream_id: streamId,
      });
      if (generation !== this.subscriberGeneration) {
        return;
      }
      if (!response.success) {
        if (response.error === 'not_ready') {
          return;
        }
        this.errorMessage.set('Error subscribing to WebRTC stream: ' + response.error);
        await this.closeSubscriber();
        return;
      }

      this.subscriberSessionId = response.data.sessionId;
      const applied = await this.applySubscriberDescription(
        rtcPeerConnection,
        response.data.sessionId,
        response.data.sessionDescription,
        generation,
      );
      if (!applied || generation !== this.subscriberGeneration) {
        return;
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
          this.syncSubscriber(true);
        }
      }
    }
  }

  private async prepareSubscriberConnection(generation: number): Promise<boolean> {
    const rtcPeerConnection = new RTCPeerConnection(RTC_CONFIGURATION);
    this.subscriberRtcPeerConnection = rtcPeerConnection;
    rtcPeerConnection.ontrack = this.createSubscriberTrackHandler(generation);

    const response = await this.emitSfu<SfuPrepareResult>('sfu_prepare_subscription', {
      room_id: this.roomInfoService.activeRoomId(),
      stream_id: this.subscriberTargetStreamId,
    });
    if (generation !== this.subscriberGeneration) {
      if (response.success) {
        await this.emitSfu('sfu_close', { session_id: response.data.sessionId });
      }
      return false;
    }
    if (!response.success) {
      throw new Error(response.error);
    }

    this.subscriberSessionId = response.data.sessionId;
    return this.applySubscriberDescription(
      rtcPeerConnection,
      response.data.sessionId,
      response.data.sessionDescription,
      generation,
    );
  }

  private async applySubscriberDescription(
    rtcPeerConnection: RTCPeerConnection,
    sessionId: string,
    sessionDescription: SfuSessionDescription,
    generation: number,
  ): Promise<boolean> {
    await rtcPeerConnection.setRemoteDescription(sessionDescription);
    if (generation !== this.subscriberGeneration) {
      return false;
    }
    if (sessionDescription.type !== 'offer') {
      return true;
    }
    const answer = await rtcPeerConnection.createAnswer();
    await rtcPeerConnection.setLocalDescription(answer);
    await waitForIceGathering(rtcPeerConnection);
    if (generation !== this.subscriberGeneration) {
      return false;
    }
    const localDescription = rtcPeerConnection.localDescription;
    if (!localDescription?.sdp) {
      throw new Error('Could not prepare the WebRTC answer.');
    }
    const renegotiateResponse = await this.emitSfu('sfu_renegotiate', {
      session_id: sessionId,
      sdp: localDescription.sdp,
    });
    if (generation !== this.subscriberGeneration) {
      return false;
    }
    if (!renegotiateResponse.success) {
      throw new Error(renegotiateResponse.error);
    }
    return true;
  }

  private createSubscriberTrackHandler(generation: number) {
    return (event: RTCTrackEvent) => {
      if (generation !== this.subscriberGeneration) {
        event.track.stop();
        return;
      }
      this.setActiveWebrtcStream(event.track);
    };
  }

  private setActiveWebrtcStream(track: MediaStreamTrack) {
    this.stopActiveWebrtcStream();
    this.activeWebrtcStream.set(new MediaStream([track]));
  }

  private stopActiveWebrtcStream() {
    this.activeWebrtcStream()
      ?.getTracks()
      .forEach((track) => track.stop());
    this.activeWebrtcStream.set(null);
  }

  private dropActiveWebrtcStream() {
    this.subscriberSubscribedStreamId = null;
    this.stopActiveWebrtcStream();
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
    closePeerConnection(rtcPeerConnection);
    this.stopActiveWebrtcStream();
    if (sessionId) {
      await this.emitSfu('sfu_close', { session_id: sessionId });
    }
  }

  // --- Signalling --------------------------------------------------------

  private emitSfu<T>(event: string, payload: unknown): Promise<ApiResponse<T>> {
    return new Promise((resolve) => {
      const timeout = window.setTimeout(
        () => resolve({ success: false, error: 'Timed out waiting for the server.' }),
        SFU_REQUEST_TIMEOUT_MS,
      );
      this.socketService.socket.emit(event, payload, (response: ApiResponse<T>) => {
        window.clearTimeout(timeout);
        resolve(response ?? { success: false, error: 'No response from the server.' });
      });
    });
  }
}

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

interface SfuPrepareResult {
  sessionId: string;
  sessionDescription: SfuSessionDescription;
  streamId: string;
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

const SFU_REQUEST_TIMEOUT_MS = 15000;
const ICE_GATHERING_TIMEOUT_MS = 3000;
const RTC_CONFIGURATION: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.cloudflare.com:3478' }],
  bundlePolicy: 'max-bundle',
};

function closePeerConnection(rtcPeerConnection: RTCPeerConnection | null) {
  if (!rtcPeerConnection) {
    return;
  }
  rtcPeerConnection.ontrack = null;
  rtcPeerConnection.close();
}

function waitForIceGathering(rtcPeerConnection: RTCPeerConnection) {
  if (rtcPeerConnection.iceGatheringState === 'complete') {
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => {
    const finish = () => {
      window.clearTimeout(timeout);
      rtcPeerConnection.removeEventListener('icegatheringstatechange', onStateChange);
      resolve();
    };
    const timeout = window.setTimeout(finish, ICE_GATHERING_TIMEOUT_MS);
    const onStateChange = () => {
      if (rtcPeerConnection.iceGatheringState === 'complete') {
        finish();
      }
    };
    rtcPeerConnection.addEventListener('icegatheringstatechange', onStateChange);
  });
}
