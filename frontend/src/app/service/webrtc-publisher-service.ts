import { effect, inject, Service, signal } from '@angular/core';
import { RoomInfoService } from './room-info-service';
import { LocalStreamService } from './local-stream-service';
import { SfuSignallingService } from './sfu-signalling-service';
import {
  RTC_CONFIGURATION,
  SfuSessionDescription,
  closePeerConnection,
  waitForConnection,
  waitForIceGathering,
} from './rtc-utils';

interface SfuPublishResult {
  sessionId: string;
  sessionDescription: SfuSessionDescription;
  trackName: string;
  mid: string;
}

@Service()
export class WebrtcPublisherService {
  errorMessage = signal<string | null>(null);

  private rtcPeerConnection: RTCPeerConnection | null = null;
  private sender: RTCRtpSender | null = null;
  private sessionId: string | null = null;
  private targetStreamId: string | null = null;
  private appliedBitrateKbps: number | null = null;
  private generation = 0;

  private roomInfoService = inject(RoomInfoService);
  private localStreamService = inject(LocalStreamService);
  private signalling = inject(SfuSignallingService);

  constructor() {
    effect(() => this.sync());
  }

  private sync() {
    const activeRoom = this.roomInfoService.activeRoom();
    const streamId = activeRoom?.stream.activeStreamId ?? '';
    const localStream = this.localStreamService.localStreams()[streamId];
    const shouldPublish =
      !!activeRoom &&
      activeRoom.activeMode === 'stream' &&
      !!localStream &&
      activeRoom.stream.webrtcStreaming;
    if (!shouldPublish) {
      void this.close();
      return;
    }
    if (this.targetStreamId === streamId) {
      void this.applyBitrate(activeRoom.stream.webrtcBitrateKbps);
      return;
    }
    void this.publish(localStream.stream, streamId, activeRoom.stream.webrtcBitrateKbps);
  }

  private async publish(stream: MediaStream, streamId: string, bitrateKbps: number) {
    const generation = ++this.generation;
    this.targetStreamId = streamId;
    try {
      const [track] = stream.getVideoTracks();
      if (!track) {
        this.errorMessage.set('The active stream does not contain a video track.');
        await this.close();
        return;
      }
      if (this.canReplaceTrack()) {
        await this.switchTrack(track, streamId, bitrateKbps, generation);
        return;
      }
      await this.createConnection(track, streamId, bitrateKbps, generation);
    } catch (error) {
      if (generation === this.generation) {
        this.errorMessage.set('Error publishing WebRTC stream: ' + (error as Error).message);
        await this.close();
      }
    }
  }

  private async switchTrack(
    track: MediaStreamTrack,
    streamId: string,
    bitrateKbps: number,
    generation: number,
  ) {
    await this.sender!.replaceTrack(track);
    if (generation !== this.generation) {
      return;
    }
    const label = this.localStreamService.localStreams()[streamId]?.label ?? '';
    const response = await this.signalling.emit('sfu_switch_stream', {
      session_id: this.sessionId,
      stream_id: streamId,
      label,
    });
    if (generation !== this.generation) {
      return;
    }
    if (!response.success) {
      throw new Error(response.error);
    }
    this.errorMessage.set(null);
    await this.applyBitrate(bitrateKbps);
  }

  private async createConnection(
    track: MediaStreamTrack,
    streamId: string,
    bitrateKbps: number,
    generation: number,
  ) {
    await this.release();
    if (generation !== this.generation) {
      return;
    }

    const rtcPeerConnection = new RTCPeerConnection(RTC_CONFIGURATION);
    this.rtcPeerConnection = rtcPeerConnection;
    const transceiver = rtcPeerConnection.addTransceiver(track, { direction: 'sendonly' });
    this.sender = transceiver.sender;

    const offer = await rtcPeerConnection.createOffer();
    await rtcPeerConnection.setLocalDescription(offer);
    await waitForIceGathering(rtcPeerConnection);
    if (generation !== this.generation) {
      return;
    }

    const mid = transceiver.mid;
    const localDescription = rtcPeerConnection.localDescription;
    if (!mid || !localDescription?.sdp) {
      throw new Error('Could not prepare the WebRTC offer.');
    }

    const response = await this.signalling.emit<SfuPublishResult>('sfu_publish', {
      room_id: this.roomInfoService.activeRoomId(),
      stream_id: streamId,
      sdp: localDescription.sdp,
      mid,
      label: track.label,
    });
    if (generation !== this.generation) {
      if (response.success) {
        await this.signalling.emit('sfu_close', { session_id: response.data.sessionId });
      }
      return;
    }
    if (!response.success) {
      throw new Error(response.error);
    }

    this.sessionId = response.data.sessionId;
    await rtcPeerConnection.setRemoteDescription(response.data.sessionDescription);
    if (generation !== this.generation) {
      await this.signalling.emit('sfu_close', { session_id: response.data.sessionId });
      return;
    }

    await waitForConnection(rtcPeerConnection);
    if (generation !== this.generation) {
      await this.signalling.emit('sfu_close', { session_id: response.data.sessionId });
      return;
    }

    const readyResponse = await this.signalling.emit('sfu_publish_ready', {
      session_id: response.data.sessionId,
    });
    if (generation !== this.generation) {
      return;
    }
    if (!readyResponse.success) {
      throw new Error(readyResponse.error);
    }
    this.errorMessage.set(null);
    await this.applyBitrate(bitrateKbps);
  }

  private async close() {
    this.generation++;
    this.targetStreamId = null;
    await this.release();
  }

  private async release() {
    const rtcPeerConnection = this.rtcPeerConnection;
    const sessionId = this.sessionId;
    this.rtcPeerConnection = null;
    this.sender = null;
    this.appliedBitrateKbps = null;
    this.sessionId = null;
    closePeerConnection(rtcPeerConnection);
    if (sessionId) {
      await this.signalling.emit('sfu_close', { session_id: sessionId });
    }
  }

  private canReplaceTrack() {
    const rtcPeerConnection = this.rtcPeerConnection;
    if (!rtcPeerConnection || !this.sender || !this.sessionId) {
      return false;
    }
    return (
      rtcPeerConnection.connectionState !== 'closed' &&
      rtcPeerConnection.connectionState !== 'failed'
    );
  }

  private async applyBitrate(kbps: number) {
    const sender = this.sender;
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
}
