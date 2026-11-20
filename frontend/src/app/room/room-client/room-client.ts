import { Component, effect, inject } from '@angular/core';
import { RoomClientService } from '../../service/room-client-service';
import { ActivatedRoute, Router } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { RoomClientPresentation } from '../room-client-presentation/room-client-presentation';
import { RoomClientPoll } from '../room-client-poll/room-client-poll';

@Component({
  imports: [RoomClientPresentation, RoomClientPoll],
  selector: 'app-room-client',
  styleUrl: './room-client.css',
  templateUrl: './room-client.html',
})
export class RoomClient {
  titleService = inject(Title);
  roomClientService = inject(RoomClientService);
  router = inject(Router);
  activatedRoute = inject(ActivatedRoute);

  constructor() {
    effect(() => {
      const activeRoom = this.roomClientService.activeRoom();
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
