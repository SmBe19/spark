import { Component, effect, inject } from '@angular/core';
import { RoomClientService } from '../../service/room-client-service';
import { ActivatedRoute, Router } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { RoomClientPresentation } from '../room-client-presentation/room-client-presentation';
import { RoomClientPoll } from '../room-client-poll/room-client-poll';
import { RoomInfoService } from '../../service/room-info-service';
import { RoomFullscreenTimer } from '../room-fullscreen-timer/room-fullscreen-timer';
import { RoomStream } from '../room-stream/room-stream';
import { RoomClientStreamShare } from '../room-client-stream-share/room-client-stream-share';

@Component({
  imports: [
    RoomClientPoll,
    RoomClientPresentation,
    RoomStream,
    RoomFullscreenTimer,
    RoomClientStreamShare,
  ],
  selector: 'app-room-client',
  styleUrl: './room-client.css',
  templateUrl: './room-client.html',
})
export class RoomClient {
  titleService = inject(Title);
  roomClientService = inject(RoomClientService);
  roomInfoService = inject(RoomInfoService);
  router = inject(Router);
  activatedRoute = inject(ActivatedRoute);

  constructor() {
    effect(() => {
      const activeRoom = this.roomInfoService.activeRoom();
      if (!activeRoom) {
        return;
      }
      this.titleService.setTitle(`Spark: ${activeRoom.name}`);
    });
  }

  ngOnInit() {
    this.activatedRoute.paramMap.subscribe((params) => {
      const roomSlug = params.get('roomSlug');
      if (roomSlug) {
        this.roomClientService.joinRoomBySlug(roomSlug, (success: boolean) => {
          if (!success) {
            this.router.navigate(['/']);
          }
        });
      }
    });
  }
}
