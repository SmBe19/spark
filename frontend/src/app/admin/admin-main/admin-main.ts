import { Component, inject } from '@angular/core';
import { AuthService } from '../../service/auth-service';
import { RoomService } from '../../service/room-service';
import { RoomAdmin } from '../room-admin/room-admin';
import { AdminRoomNav } from '../admin-room-nav/admin-room-nav';

@Component({
  imports: [RoomAdmin, AdminRoomNav],
  selector: 'app-admin-main',
  styleUrl: './admin-main.css',
  templateUrl: './admin-main.html',
})
export class AdminMain {
  authService = inject(AuthService);
  roomService = inject(RoomService);
}
