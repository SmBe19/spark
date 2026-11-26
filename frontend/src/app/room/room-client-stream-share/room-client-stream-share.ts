import { Component, computed, effect, inject, signal } from '@angular/core';
import { LocalStreamService } from '../../service/local-stream-service';
import { FrameStreamSenderService } from '../../service/frame-stream-sender-service';
import { WebrtcPublisherService } from '../../service/webrtc-publisher-service';
import { NgClass } from '@angular/common';
import { RoomInfoService } from '../../service/room-info-service';

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
  errorMessage = computed(
    () =>
      this.localStreamService.errorMessage() ||
      this.frameStreamSenderService.errorMessage() ||
      this.webrtcPublisherService.errorMessage(),
  );

  constructor() {
    effect(() => {
      if (this.roomInfoService.activeRoom()?.stream.allowClientStreaming !== true) {
        this.stopSharing();
      }
    });
  }

  startSharing(displayMedia: boolean) {
    if (this.isSharing() || this.sharingStarting()) {
      return;
    }
    this.sharingStarting.set(true);
    this.localStreamService.addLocalStream(displayMedia).finally(() => {
      this.sharingStarting.set(false);
    });
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
