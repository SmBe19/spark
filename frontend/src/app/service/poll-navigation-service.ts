import { computed, inject, Service } from '@angular/core';
import { RoomInfoService } from './room-info-service';
import { RoomService } from './room-service';
import { PollService } from './poll-service';

@Service()
export class PollNavigationService {
  roomService = inject(RoomService);
  roomInfoService = inject(RoomInfoService);
  pollService = inject(PollService);

  currentQuestionIndex = computed(() => this.roomService.activeRoom()?.activeQuestionIndex ?? 0);
  nextQuestionIndex = computed(() => {
    const nextPage = this.pollService.getNextPage(
      this.roomInfoService.activePollParsed().presentationPages,
      this.currentQuestionIndex(),
    );
    return nextPage ? nextPage[0] : null;
  });
  previousQuestionIndex = computed(() => {
    const previousPage = this.pollService.getPreviousPage(
      this.roomInfoService.activePollParsed().presentationPages,
      this.currentQuestionIndex(),
    );
    return previousPage ? previousPage[0] : null;
  });

  nextQuestion() {
    const nextQuestionIndex = this.nextQuestionIndex();
    if (nextQuestionIndex === null) {
      return;
    }
    this.roomService.updateActiveRoomSettings({ active_question_index: nextQuestionIndex });
  }

  previousQuestion() {
    const previousQuestionIndex = this.previousQuestionIndex();
    if (previousQuestionIndex === null) {
      return;
    }
    this.roomService.updateActiveRoomSettings({ active_question_index: previousQuestionIndex });
  }
}
