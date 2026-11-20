import { Component, inject } from '@angular/core';
import { RoomService } from '../../service/room-service';
import { RoomAdminArchive } from '../room-admin-archive/room-admin-archive';
import { RoomAdminPresentation } from '../room-admin-presentation/room-admin-presentation';
import { RoomAdminPoll } from '../room-admin-poll/room-admin-poll';

@Component({
  imports: [RoomAdminPoll, RoomAdminPresentation, RoomAdminArchive],
  selector: 'app-room-admin',
  styleUrl: './room-admin.css',
  templateUrl: './room-admin.html',
})
export class RoomAdmin {
  roomService = inject(RoomService);
}
