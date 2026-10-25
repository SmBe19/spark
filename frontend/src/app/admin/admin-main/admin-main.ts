import { Component, inject, signal } from '@angular/core';
import { AuthService } from '../../service/auth-service';
import { RoomService } from '../../service/room-service';
import { form, FormField } from '@angular/forms/signals';
import { NgClass } from '@angular/common';
import { RoomAdmin } from '../room-admin/room-admin';

@Component({
  imports: [FormField, NgClass, RoomAdmin],
  selector: 'app-admin-main',
  styleUrl: './admin-main.css',
  templateUrl: './admin-main.html',
})
export class AdminMain {
  newRoomModel = signal({
    slug: '',
    name: '',
  });
  newRoomForm = form(this.newRoomModel);
  showNewRoomForm = signal(false);

  authService = inject(AuthService);
  roomService = inject(RoomService);

  ngOnInit() {
    this.roomService.loadRooms();
    const activeRoomId = localStorage.getItem('adminActiveRoomId');
    if (activeRoomId) {
      this.roomService.activeRoomId.set(activeRoomId);
    }
  }

  createRoom() {
    const newRoom = this.newRoomModel();
    this.roomService.createRoom(newRoom.slug, newRoom.name);
  }

  openRoom(roomId: string) {
    this.roomService.activeRoomId.set(roomId);
    localStorage.setItem('adminActiveRoomId', roomId);
  }
}
