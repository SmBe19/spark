import { Component, computed, inject } from '@angular/core';
import { RoomInfoService } from '../../service/room-info-service';
import { FrameStreamService } from '../../service/frame-stream-service';
import { WebrtcStreamService } from '../../service/webrtc-stream-service';
import { DirectStreamService } from '../../service/direct-stream-service';

@Component({
  imports: [],
  selector: 'app-room-stream',
  styleUrl: './room-stream.css',
  templateUrl: './room-stream.html',
})
export class RoomStream {
  private roomInfoService = inject(RoomInfoService);
  private frameStreamService = inject(FrameStreamService);
  private webrtcStreamService = inject(WebrtcStreamService);
  private directStreamService = inject(DirectStreamService);

  currentFrameStream = computed(() => {
    const activeStreamId = this.roomInfoService.activeRoom()?.stream.activeStreamId;
    if (!activeStreamId) {
      return null;
    }
    return this.frameStreamService.remoteStreams()[activeStreamId] || null;
  });

  currentDirectStream = computed(() => {
    const activeStreamId = this.roomInfoService.activeRoom()?.stream.activeStreamId;
    if (!activeStreamId) {
      return null;
    }
    return this.directStreamService.parentLocalStreams()[activeStreamId]?.stream || null;
  });
  currentWebrtcStream = computed(() => this.webrtcStreamService.activeWebrtcStream());
}
