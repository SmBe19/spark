import { Component, computed, inject } from '@angular/core';
import { StreamService } from '../../service/stream-service';

@Component({
  imports: [],
  selector: 'app-room-stream',
  styleUrl: './room-stream.css',
  templateUrl: './room-stream.html',
})
export class RoomStream {
  streamService = inject(StreamService);

  currentStream = computed(() => {
    const activeRoom = this.streamService.roomInfoService.activeRoom();
    if (!activeRoom) {
      return null;
    }
    const activeStreamId = activeRoom.stream.activeStreamId;
    if (!activeStreamId) {
      return null;
    }
    return this.streamService.remoteStreams()[activeStreamId] || null;
  });
}
