import { Component, computed, debounced, inject, signal } from '@angular/core';
import { form, FormField, max, min } from '@angular/forms/signals';
import { RoomService } from '../../service/room-service';
import { toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { PresentationPreview } from '../presentation-preview/presentation-preview';
import { PresentationService } from '../../service/presentation-service';
import { PasteImage } from '../../util/paste-image/paste-image';

@Component({
  imports: [FormField, FormsModule, PasteImage, PresentationPreview],
  selector: 'app-room-admin-presentation',
  styleUrl: './room-admin-presentation.css',
  templateUrl: './room-admin-presentation.html',
})
export class RoomAdminPresentation {
  activePresentationModel = signal({
    presentation: '',
    slideIndex: 0,
  });
  activePresentation = form(this.activePresentationModel, (schemaPath) => {
    min(schemaPath.slideIndex, 0);
    max(schemaPath.slideIndex, () => this.presentationSlides().length - 1);
  });
  activePresentationDebounced = debounced(() => this.activePresentationModel().presentation, 250);
  presentationSlides = computed(() =>
    this.presentationService.parsePresentation(this.activePresentationDebounced.value()),
  );
  dirtyValues = computed(() => {
    const activePresentation = this.activePresentationModel();
    const activeRoom = this.roomService.activeRoom();
    if (!activeRoom) {
      return {
        presentation: false,
        slideIndex: false,
      };
    }
    return {
      presentation: activePresentation.presentation !== activeRoom.activePresentation,
      slideIndex: activePresentation.slideIndex !== activeRoom.activeSlideIndex,
    };
  });

  roomService = inject(RoomService);
  presentationService = inject(PresentationService);

  constructor() {
    toObservable(this.roomService.activeRoom).subscribe((room) => {
      if (room) {
        this.activePresentationModel.set({
          presentation: room.activePresentation,
          slideIndex: room.activeSlideIndex,
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

  updateActiveSlideIndex() {
    if (!this.dirtyValues().slideIndex) {
      return;
    }
    this.roomService.updateRoomActiveSlideIndex(
      this.roomService.activeRoom()?.id || '',
      this.activePresentationModel().slideIndex,
    );
  }

  nextSlide() {
    const nextSlideIndex = this.activePresentationModel().slideIndex + 1;
    if (nextSlideIndex >= this.presentationSlides().length) {
      return;
    }
    this.activePresentationModel.update((presentation) => ({
      ...presentation,
      slideIndex: nextSlideIndex,
    }));
    this.updateActiveSlideIndex();
  }

  previousSlide() {
    const nextSlideIndex = this.activePresentationModel().slideIndex - 1;
    if (nextSlideIndex < 0) {
      return;
    }
    this.activePresentationModel.update((presentation) => ({
      ...presentation,
      slideIndex: nextSlideIndex,
    }));
    this.updateActiveSlideIndex();
  }
}
