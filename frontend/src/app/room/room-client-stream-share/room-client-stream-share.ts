import { Component, computed, inject, signal } from '@angular/core';
import { LocalStreamService } from '../../service/local-stream-service';
import { FrameStreamSenderService } from '../../service/frame-stream-sender-service';
import { WebrtcPublisherService } from '../../service/webrtc-publisher-service';
import { NgClass } from '@angular/common';
import { RoomInfoService } from '../../service/room-info-service';
import { CameraFacingMode } from '../../model/streams';

@Component({
  imports: [NgClass],
  selector: 'app-room-client-stream-share',
  styleUrl: './room-client-stream-share.css',
  templateUrl: './room-client-stream-share.html',
})
export class RoomClientStreamShare {
  roomInfoService = inject(RoomInfoService);
  localStreamService = inject(LocalStreamService);
  frameStreamSenderService = inject(FrameStreamSenderService);
  webrtcPublisherService = inject(WebrtcPublisherService);

  sharingStarting = signal(false);
  sharedStream = computed(() => this.localStreamService.localStreamsArray()[0] || null);
  isSharing = computed(() => this.sharedStream() !== null);
  isStreamLive = computed(
    () => this.sharedStream()?.id === this.roomInfoService.activeRoom()?.stream.activeStreamId,
  );
  isCameraStream = computed(() => this.sharedStream()?.isDisplayMedia === false);
  cameraFacing = computed<CameraFacingMode>(() => this.sharedStream()?.facingMode ?? 'user');
  errorMessage = computed(
    () =>
      this.localStreamService.errorMessage() ||
      this.frameStreamSenderService.errorMessage() ||
      this.webrtcPublisherService.errorMessage(),
  );

  startSharing(displayMedia: boolean, facingMode?: CameraFacingMode) {
    if (this.isSharing() || this.sharingStarting()) {
      return;
    }
    this.sharingStarting.set(true);
    this.localStreamService
      .addLocalStream({ displayMedia, clientStreaming: true, facingMode })
      .finally(() => {
        this.sharingStarting.set(false);
      });
  }

  switchCamera(facingMode: CameraFacingMode) {
    const streamId = this.sharedStream()?.id;
    if (!streamId || this.cameraFacing() === facingMode) {
      return;
    }
    this.localStreamService.switchCamera(streamId, facingMode);
  }

  stopSharing() {
    if (!this.isSharing()) {
      return;
    }
    this.localStreamService.localStreamsArray().forEach((stream) => {
      this.localStreamService.stopLocalStream(stream.id);
    });
  }
}
