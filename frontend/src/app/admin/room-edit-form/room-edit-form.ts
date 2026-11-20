import { NgClass } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { form, FormField, required } from '@angular/forms/signals';
import { RoomService } from '../../service/room-service';
import { toObservable } from '@angular/core/rxjs-interop';

@Component({
  imports: [FormField, NgClass],
  selector: 'app-room-edit-form',
  styleUrl: './room-edit-form.css',
  templateUrl: './room-edit-form.html',
})
export class RoomEditForm {
  roomService = inject(RoomService);

  roomInfoModel = signal({
    slug: '',
    name: '',
  });
  roomInfoForm = form(this.roomInfoModel, (schemaPath) => {
    required(schemaPath.slug);
    required(schemaPath.name);
  });
  showRoomEditForm = signal(false);
  deletingRoom = signal(false);

  dirtyValues = computed(() => {
    const currentRoomInfo = this.roomInfoModel();
    const activeRoom = this.roomService.activeRoom();
    if (!activeRoom) {
      return {
        slug: false,
        name: false,
      };
    }
    return {
      slug: currentRoomInfo.slug !== activeRoom.slug,
      name: currentRoomInfo.name !== activeRoom.name,
    };
  });

  constructor() {
    toObservable(this.roomService.activeRoom).subscribe((room) => {
      if (room) {
        this.roomInfoModel.set({
          slug: room.slug,
          name: room.name,
        });
      }
    });
  }

  updateRoom() {
    const activeRoom = this.roomService.activeRoom();
    if (!activeRoom) {
      return;
    }
    this.roomService.updateRoomMeta(
      activeRoom.id,
      this.roomInfoModel().slug,
      this.roomInfoModel().name,
    );
    this.showRoomEditForm.set(false);
  }

  confirmDeleteRoom() {
    const roomId = this.roomService.activeRoom()?.id;
    if (roomId) {
      this.roomService.deleteRoom(roomId);
      this.deletingRoom.set(false);
      this.showRoomEditForm.set(false);
    }
  }
}
