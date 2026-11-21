import { Component, computed, debounced, effect, inject, signal } from '@angular/core';
import { form, FormField, max, min } from '@angular/forms/signals';
import { RoomService } from '../../service/room-service';
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
  anyDirtyValues = computed(() => {
    const dirtyValues = this.dirtyValues();
    return dirtyValues.presentation || dirtyValues.slideIndex;
  });

  roomService = inject(RoomService);
  presentationService = inject(PresentationService);

  constructor() {
    effect(() => {
      const activeRoom = this.roomService.activeRoom();
      if (!activeRoom) {
        return;
      }
      this.activePresentationModel.set({
        presentation: activeRoom.activePresentation,
        slideIndex: activeRoom.activeSlideIndex,
      });
    });
  }

  updatePresentation() {
    if (!this.dirtyValues().presentation) {
      return;
    }
    this.roomService.updateActiveRoomSettings({
      active_presentation: this.activePresentationModel().presentation,
    });
  }

  updateActiveSlideIndex() {
    if (!this.dirtyValues().slideIndex) {
      return;
    }
    this.roomService.updateActiveRoomSettings({
      active_slide_index: this.activePresentationModel().slideIndex,
    });
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
