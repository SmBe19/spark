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
  private static readonly previewScale = 0.25;

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

    effect((onCleanup) => {
      const framePreviewIntervalMs =
        this.roomInfoService.activeRoom()?.stream.framePreviewIntervalMs ?? 1000;
      const subscription = timer(0, framePreviewIntervalMs).subscribe(() => {
        for (const localStream of Object.values(this.localStreams())) {
          const dataUrl = this.renderStreamFrameDataURL(
            localStream.videoElement,
            localStream.canvas,
            StreamService.previewScale,
          );
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
                void this.uploadBigFrame(localStream);
              }
            },
          );
        }
      });
      onCleanup(() => subscription.unsubscribe());
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

  private renderStreamFrameDataURL(
    videoElement: HTMLVideoElement,
    canvas: HTMLCanvasElement,
    scale: number,
  ) {
    if (!this.drawStreamFrame(videoElement, canvas, scale)) {
      return null;
    }
    return canvas.toDataURL('image/png');
  }

  private renderStreamFrameBlob(
    videoElement: HTMLVideoElement,
    canvas: HTMLCanvasElement,
    scale: number,
  ): Promise<Blob | null> {
    if (!this.drawStreamFrame(videoElement, canvas, scale)) {
      return Promise.resolve(null);
    }
    return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  }

  private drawStreamFrame(
    videoElement: HTMLVideoElement,
    canvas: HTMLCanvasElement,
    scale: number,
  ) {
    if (videoElement.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      return false;
    }
    canvas.width = videoElement.videoWidth * scale;
    canvas.height = videoElement.videoHeight * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return false;
    }
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    return true;
  }

  private async uploadBigFrame(localStream: LocalStream) {
    const blob = await this.renderStreamFrameBlob(localStream.videoElement, localStream.canvas, 1);
    if (!blob) {
      return;
    }
    const params = new URLSearchParams({
      room_id: localStream.roomId,
      label: localStream.label,
    });
    try {
      const response = await fetch(
        '/api/streams/' + encodeURIComponent(localStream.id) + '/bigframe?' + params.toString(),
        {
          method: 'POST',
          body: blob,
          headers: { 'Content-Type': blob.type || 'image/png' },
          credentials: 'same-origin',
        },
      );
      if (!response.ok) {
        this.errorMessage.set(
          'Error uploading big stream frame: Server returned ' + response.status + '.',
        );
      }
    } catch (error) {
      this.errorMessage.set('Error uploading big stream frame: ' + (error as Error).message);
    }
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
