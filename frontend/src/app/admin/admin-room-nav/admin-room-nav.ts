import { Component, inject } from '@angular/core';
import { RoomService } from '../../service/room-service';
import { NgClass } from '@angular/common';
import { NewRoomForm } from '../new-room-form/new-room-form';
import { RoomEditForm } from '../room-edit-form/room-edit-form';

@Component({
  imports: [NgClass, NewRoomForm, RoomEditForm],
  selector: 'app-admin-room-nav',
  styleUrl: './admin-room-nav.css',
  templateUrl: './admin-room-nav.html',
})
export class AdminRoomNav {
  roomService = inject(RoomService);

  ngOnInit() {
    this.roomService.loadRooms();
    const activeRoomId = localStorage.getItem('adminActiveRoomId');
    if (activeRoomId) {
      this.roomService.joinRoomById(activeRoomId);
    }
  }

  openRoom(roomId: string) {
    this.roomService.joinRoomById(roomId);
    localStorage.setItem('adminActiveRoomId', roomId);
  }
}
