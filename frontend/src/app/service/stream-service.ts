import { computed, effect, inject, Service, signal } from '@angular/core';
import {
  ApiRemoteStream,
  ApiStreamFrameResponse,
  LocalStream,
  LocalStreamPreview,
  RemoteStream,
  RemoteStreamPreview,
} from '../model/streams';
import { RoomInfoService } from './room-info-service';
import { SocketService } from './socket-service';
import { timer } from 'rxjs';
import { ApiResponse } from '../model/api';

@Service()
export class StreamService {
  private static readonly remoteStreamTimeoutMs = 10000;

  streamCaptureSupported = !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);

  errorMessage = signal<string | null>(null);
  localStreams = signal<{ [key: string]: LocalStream }>({});
  remoteStreams = signal<{ [key: string]: RemoteStream }>({});
  streamIdToChannel = computed(() => {
    const activeRoom = this.roomInfoService.activeRoom();
    if (!activeRoom) {
      return {};
    }
    const mapping: { [key: string]: string } = {};
    for (const [channel, streamId] of Object.entries(activeRoom.stream.channels)) {
      mapping[streamId] = channel;
    }
    return mapping;
  });
  localStreamsArray = computed<LocalStreamPreview[]>(() => {
    const streamIdToChannel = this.streamIdToChannel();
    return Object.values(this.localStreams())
      .filter((stream) => stream.roomId === this.roomInfoService.activeRoomId())
      .map((stream) => ({
        id: stream.id,
        label: stream.label,
        channel: streamIdToChannel[stream.id],
        stream: stream.stream,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  });
  remoteStreamsArray = computed<RemoteStreamPreview[]>(() => {
    const streamIdToChannel = this.streamIdToChannel();
    return Object.values(this.remoteStreams())
      .filter((stream) => stream.roomId === this.roomInfoService.activeRoomId())
      .filter(
        (stream) => stream.lastUpdateTimeMs > Date.now() - StreamService.remoteStreamTimeoutMs,
      )
      .map((stream) => ({
        id: stream.id,
        label: stream.label,
        channel: streamIdToChannel[stream.id],
        currentPreviewFrame: stream.currentPreviewFrame,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  });

  roomInfoService = inject(RoomInfoService);
  socketService = inject(SocketService);

  constructor() {
    this.socketService.socket.on('stream_preview_frame', (data: ApiRemoteStream) => {
      this.applyRemoteStreamUpdate(data, false);
    });
    this.socketService.socket.on('stream_big_frame', (data: ApiRemoteStream) => {
      this.applyRemoteStreamUpdate(data, true);
    });

    // TODO make the timeout configurable
    timer(0, 1000).subscribe(() => {
      for (const localStream of Object.values(this.localStreams())) {
        const dataUrl = this.renderStreamFrame(localStream.videoElement, localStream.canvas, 0.25);
        if (!dataUrl) {
          continue;
        }
        this.socketService.socket.emit(
          'add_stream_preview_frame',
          {
            stream_id: localStream.id,
            room_id: localStream.roomId,
            label: localStream.label,
            current_frame: dataUrl,
          },
          (response: ApiResponse<ApiStreamFrameResponse>) => {
            if (response.success && response.data.need_big_frame) {
              const bigFrameDataUrl = this.renderStreamFrame(
                localStream.videoElement,
                localStream.canvas,
                1,
              );
              if (!bigFrameDataUrl) {
                return;
              }
              this.socketService.socket.emit('add_stream_big_frame', {
                stream_id: localStream.id,
                room_id: localStream.roomId,
                label: localStream.label,
                current_frame: bigFrameDataUrl,
              });
            }
          },
        );
      }
    });
  }

  applyRemoteStreamUpdate(data: ApiRemoteStream, bigFrame: boolean) {
    const roomId = this.roomInfoService.activeRoomId();
    if (!roomId) {
      return;
    }
    if (this.localStreams().hasOwnProperty(data.id)) {
      return;
    }
    this.remoteStreams.update((currentStreams) => {
      const currentStream = currentStreams[data.id] || {};
      const newPreviewFrame = currentStream?.currentPreviewFrame || data.current_frame;
      const frameUpdate: Partial<RemoteStream> = {};
      if (bigFrame) {
        frameUpdate.currentBigFrame = data.current_frame;
      }
      return {
        ...currentStreams,
        [data.id]: {
          ...currentStream,
          id: data.id,
          roomId,
          label: data.label,
          lastUpdateTimeMs: Date.now(),
          currentPreviewFrame: newPreviewFrame,
          ...frameUpdate,
        },
      };
    });
  }

  renderStreamFrame(videoElement: HTMLVideoElement, canvas: HTMLCanvasElement, scale: number) {
    if (videoElement.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      return null;
    }
    canvas.width = videoElement.videoWidth * scale;
    canvas.height = videoElement.videoHeight * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return null;
    }
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  }

  async addLocalStream() {
    if (!this.streamCaptureSupported) {
      return;
    }
    const roomId = this.roomInfoService.activeRoomId();
    if (!roomId) {
      this.errorMessage.set('No active room to add stream to.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          frameRate: 30,
        },
        audio: false,
      });
      const streamId = crypto.randomUUID();
      const [videoTrack] = stream.getVideoTracks();
      const streamLabel = videoTrack.label || streamId;
      const videoElement = document.createElement('video');
      videoElement.srcObject = stream;
      videoElement.autoplay = true;
      videoElement.muted = true;
      videoElement.playsInline = true;
      this.localStreams.update((currentStreams) => ({
        ...currentStreams,
        [streamId]: {
          id: streamId,
          roomId,
          label: streamLabel,
          stream: stream,
          videoElement,
          canvas: document.createElement('canvas'),
        },
      }));
      videoTrack.addEventListener('ended', () => {
        this.stopLocalStream(streamId);
      });
      stream.addEventListener('inactive', () => {
        this.stopLocalStream(streamId);
      });
      this.errorMessage.set(null);
    } catch (error) {
      this.errorMessage.set('Error capturing local stream: ' + (error as Error).message);
    }
  }

  stopLocalStream(streamId: string) {
    this.localStreams.update((currentStreams) => {
      const streamToStop = currentStreams[streamId];
      if (streamToStop) {
        streamToStop.stream.getTracks().forEach((track) => track.stop());
      }
      const newStreams = { ...currentStreams };
      delete newStreams[streamId];
      return newStreams;
    });
  }
}
