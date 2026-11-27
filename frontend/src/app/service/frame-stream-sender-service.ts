import { effect, inject, Service, signal } from '@angular/core';
import { timer } from 'rxjs';
import { ApiStreamFrameResponse, LocalStream } from '../model/streams';
import { ApiResponse } from '../model/api';
import { RoomInfoService } from './room-info-service';
import { SocketService } from './socket-service';
import { LocalStreamService } from './local-stream-service';

@Service()
export class FrameStreamSenderService {
  private static readonly previewScaling: ScaleConfig = {
    defaultScale: 0.25,
    maxDimension: 500,
    maxFileSizeBytes: 512 * 1024, // 512 KB
    postScaling: 1,
  };
  private static readonly bigFrameScaling: ScaleConfig = {
    defaultScale: 1,
    maxDimension: 1920,
    maxFileSizeBytes: 2 * 1024 * 1024, // 2 MB
    postScaling: 1,
  };

  errorMessage = signal<string | null>(null);

  private roomInfoService = inject(RoomInfoService);
  private socketService = inject(SocketService);
  private localStreamService = inject(LocalStreamService);

  constructor() {
    effect((onCleanup) => {
      const framePreviewIntervalMs =
        this.roomInfoService.activeRoom()?.stream.framePreviewIntervalMs ?? 1000;
      const subscription = timer(0, framePreviewIntervalMs).subscribe(() =>
        this.sendPreviewFrames(),
      );
      onCleanup(() => subscription.unsubscribe());
    });
  }

  private sendPreviewFrames() {
    for (const localStream of Object.values(this.localStreamService.localStreams())) {
      const dataUrl = this.renderFrameDataURL(localStream, FrameStreamSenderService.previewScaling);
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
  }

  private renderFrameDataURL(localStream: LocalStream, scaleConfig: ScaleConfig) {
    let currentPostScaling = scaleConfig.postScaling;
    while (true) {
      if (!this.drawFrame(localStream, { ...scaleConfig, postScaling: currentPostScaling })) {
        return null;
      }
      const dataUrl = localStream.canvas.toDataURL(this.streamImageFormat(localStream), 0.8);
      if (dataUrl.length <= scaleConfig.maxFileSizeBytes) {
        return dataUrl;
      }
      currentPostScaling *= 0.8;
    }
  }

  private async renderFrameBlob(
    localStream: LocalStream,
    scaleConfig: ScaleConfig,
  ): Promise<Blob | null> {
    let currentPostScaling = scaleConfig.postScaling;
    while (true) {
      if (!this.drawFrame(localStream, { ...scaleConfig, postScaling: currentPostScaling })) {
        return Promise.resolve(null);
      }
      const blob: Blob | null = await new Promise((resolve) =>
        localStream.canvas.toBlob(resolve, this.streamImageFormat(localStream), 0.8),
      );
      if (!blob) {
        return null;
      }
      if (blob.size <= scaleConfig.maxFileSizeBytes) {
        return blob;
      }
      currentPostScaling *= 0.8;
    }
  }

  private drawFrame(localStream: LocalStream, scaleConfig: ScaleConfig) {
    const videoElement = localStream.videoElement;
    const canvas = localStream.canvas;
    if (videoElement.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      return false;
    }
    const scale =
      Math.min(
        scaleConfig.defaultScale,
        scaleConfig.maxDimension / Math.max(videoElement.videoWidth, videoElement.videoHeight),
      ) * scaleConfig.postScaling;
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
    const blob = await this.renderFrameBlob(localStream, FrameStreamSenderService.bigFrameScaling);
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

  private streamImageFormat(localStream: LocalStream) {
    if (localStream.isDisplayMedia) {
      return 'image/png';
    }
    return 'image/jpeg';
  }
}

interface ScaleConfig {
  defaultScale: number;
  maxDimension: number;
  maxFileSizeBytes: number;
  postScaling: number;
}
