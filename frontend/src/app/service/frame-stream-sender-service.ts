import { effect, inject, Service, signal } from '@angular/core';
import { timer } from 'rxjs';
import { ApiStreamFrameResponse, LocalStream } from '../model/streams';
import { ApiResponse } from '../model/api';
import { RoomInfoService } from './room-info-service';
import { SocketService } from './socket-service';
import { LocalStreamService } from './local-stream-service';

@Service()
export class FrameStreamSenderService {
  private static readonly previewScale = 0.25;

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
      const dataUrl = this.renderFrameDataURL(
        localStream.videoElement,
        localStream.canvas,
        FrameStreamSenderService.previewScale,
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
  }

  private renderFrameDataURL(
    videoElement: HTMLVideoElement,
    canvas: HTMLCanvasElement,
    scale: number,
  ) {
    if (!this.drawFrame(videoElement, canvas, scale)) {
      return null;
    }
    return canvas.toDataURL('image/png');
  }

  private renderFrameBlob(
    videoElement: HTMLVideoElement,
    canvas: HTMLCanvasElement,
    scale: number,
  ): Promise<Blob | null> {
    if (!this.drawFrame(videoElement, canvas, scale)) {
      return Promise.resolve(null);
    }
    return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  }

  private drawFrame(videoElement: HTMLVideoElement, canvas: HTMLCanvasElement, scale: number) {
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
    const blob = await this.renderFrameBlob(localStream.videoElement, localStream.canvas, 1);
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
}
