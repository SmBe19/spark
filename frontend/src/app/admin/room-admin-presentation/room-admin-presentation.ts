import { Component, computed, debounced, inject, signal } from '@angular/core';
import { RoomService } from '../../service/room-service';
import { toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { PresentationPreview } from '../presentation-preview/presentation-preview';
import { form, FormField } from '@angular/forms/signals';

@Component({
  imports: [FormField, FormsModule, PresentationPreview],
  selector: 'app-room-admin-presentation',
  styleUrl: './room-admin-presentation.css',
  templateUrl: './room-admin-presentation.html',
})
export class RoomAdminPresentation {
  activePresentationModel = signal({
    presentation: '',
  });
  activePresentation = form(this.activePresentationModel);
  activePresentationDebounced = debounced(() => this.activePresentationModel().presentation, 250);
  dirtyValues = computed(() => {
    const activeRoom = this.roomService.activeRoom();
    if (!activeRoom) {
      return {
        presentation: false,
      };
    }
    return {
      presentation: this.activePresentationModel().presentation !== activeRoom.activePresentation,
    };
  });

  roomService = inject(RoomService);

  constructor() {
    toObservable(this.roomService.activeRoom).subscribe((room) => {
      if (room) {
        this.activePresentationModel.set({
          presentation: room.activePresentation,
        });
      }
    });
  }

  updatePresentation() {
    if (!this.dirtyValues().presentation) {
      return;
    }
    this.roomService.updateRoomActivePresentation(
      this.roomService.activeRoom()?.id || '',
      this.activePresentationModel().presentation,
    );
  }
}
