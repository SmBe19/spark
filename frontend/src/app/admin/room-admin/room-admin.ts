import { Component, inject } from '@angular/core';
import { RoomAdminArchive } from '../room-admin-archive/room-admin-archive';
import { RoomAdminPresentation } from '../room-admin-presentation/room-admin-presentation';
import { RoomAdminPoll } from '../room-admin-poll/room-admin-poll';
import { RoomAdminTimer } from '../room-admin-timer/room-admin-timer';
import { RoomInfoService } from '../../service/room-info-service';
import { RoomAdminStream } from '../room-admin-stream/room-admin-stream';

@Component({
  imports: [
    RoomAdminPoll,
    RoomAdminPresentation,
    RoomAdminStream,
    RoomAdminTimer,
    RoomAdminArchive,
  ],
  selector: 'app-room-admin',
  styleUrl: './room-admin.css',
  templateUrl: './room-admin.html',
})
export class RoomAdmin {
  roomInfoService = inject(RoomInfoService);
}
