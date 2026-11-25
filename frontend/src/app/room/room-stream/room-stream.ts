import { Component, computed, inject } from '@angular/core';
import { RoomInfoService } from '../../service/room-info-service';
import { FrameStreamReceiverService } from '../../service/frame-stream-receiver-service';
import { WebrtcSubscriberService } from '../../service/webrtc-subscriber-service';
import { DirectStreamService } from '../../service/direct-stream-service';

@Component({
  imports: [],
  selector: 'app-room-stream',
  styleUrl: './room-stream.css',
  templateUrl: './room-stream.html',
})
export class RoomStream {
  private roomInfoService = inject(RoomInfoService);
  private frameStreamReceiverService = inject(FrameStreamReceiverService);
  private webrtcSubscriberService = inject(WebrtcSubscriberService);
  private directStreamService = inject(DirectStreamService);

  currentFrameStream = computed(() => {
    const activeStreamId = this.roomInfoService.activeRoom()?.stream.activeStreamId;
    if (!activeStreamId) {
      return null;
    }
    return this.frameStreamReceiverService.remoteStreams()[activeStreamId] || null;
  });

  currentDirectStream = computed(() => {
    const activeStreamId = this.roomInfoService.activeRoom()?.stream.activeStreamId;
    if (!activeStreamId) {
      return null;
    }
    return this.directStreamService.parentLocalStreams()[activeStreamId]?.stream || null;
  });
  currentWebrtcStream = computed(() => this.webrtcSubscriberService.activeWebrtcStream());
}
