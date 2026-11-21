import { computed, inject, Service } from '@angular/core';
import { RoomService } from './room-service';
import { RoomInfoService } from './room-info-service';

@Service()
export class PresentationNavigationService {
  roomService = inject(RoomService);
  roomInfoService = inject(RoomInfoService);

  currentSlideIndex = computed(() => this.roomService.activeRoom()?.activeSlideIndex ?? 0);

  nextSlide() {
    const nextSlideIndex = this.currentSlideIndex() + 1;
    if (nextSlideIndex >= this.roomInfoService.activePresentationSlides().length) {
      return;
    }
    this.roomService.updateActiveRoomSettings({
      active_slide_index: nextSlideIndex,
    });
  }

  previousSlide() {
    const previousSlideIndex = this.currentSlideIndex() - 1;
    if (previousSlideIndex < 0) {
      return;
    }
    this.roomService.updateActiveRoomSettings({
      active_slide_index: previousSlideIndex,
    });
  }
}
