import { NgClass } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { form, FormField, required } from '@angular/forms/signals';
import { RoomService } from '../../service/room-service';
import { FormsModule } from '@angular/forms';

@Component({
  imports: [FormsModule, FormField, NgClass],
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
    effect(() => {
      const activeRoom = this.roomService.activeRoom();
      if (!activeRoom) {
        return;
      }
      this.roomInfoModel.set({
        slug: activeRoom.slug,
        name: activeRoom.name,
      });
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
    const roomId = this.roomService.activeRoomId();
    if (roomId) {
      this.roomService.deleteRoom(roomId);
      this.deletingRoom.set(false);
      this.showRoomEditForm.set(false);
    }
  }
}
