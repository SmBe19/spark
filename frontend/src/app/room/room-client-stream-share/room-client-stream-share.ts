import { Component, computed, inject } from '@angular/core';
import { LocalStreamService } from '../../service/local-stream-service';
import { FrameStreamSenderService } from '../../service/frame-stream-sender-service';
import { WebrtcPublisherService } from '../../service/webrtc-publisher-service';
import { NgClass } from '@angular/common';

@Component({
  imports: [NgClass],
  selector: 'app-room-client-stream-share',
  styleUrl: './room-client-stream-share.css',
  templateUrl: './room-client-stream-share.html',
})
export class RoomClientStreamShare {
  localStreamService = inject(LocalStreamService);
  frameStreamSenderService = inject(FrameStreamSenderService);
  webrtcPublisherService = inject(WebrtcPublisherService);

  sharedStream = computed(() => this.localStreamService.localStreamsArray()[0] || null);
  isSharing = computed(() => this.localStreamService.localStreamsArray().length > 0);

  stopSharing() {
    if (!this.isSharing()) {
      return;
    }
    this.localStreamService.stopLocalStream(this.localStreamService.localStreamsArray()[0].id);
  }
}
