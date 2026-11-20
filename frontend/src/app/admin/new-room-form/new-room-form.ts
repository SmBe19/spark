import { Component, inject, signal } from '@angular/core';
import { form, FormField, required } from '@angular/forms/signals';
import { RoomService } from '../../service/room-service';
import { NgClass } from '@angular/common';

@Component({
  imports: [FormField, NgClass],
  selector: 'app-new-room-form',
  styleUrl: './new-room-form.css',
  templateUrl: './new-room-form.html',
})
export class NewRoomForm {
  roomService = inject(RoomService);

  newRoomModel = signal({
    slug: '',
    name: '',
  });
  newRoomForm = form(this.newRoomModel, (schemaPath) => {
    required(schemaPath.slug);
    required(schemaPath.name);
  });
  showNewRoomForm = signal(false);

  createRoom() {
    const newRoom = this.newRoomModel();
    this.roomService.createRoom(newRoom.slug, newRoom.name);
    this.showNewRoomForm.set(false);
  }
}
