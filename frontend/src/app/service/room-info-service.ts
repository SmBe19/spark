import { computed, inject, Service } from '@angular/core';
import { RoomClientService } from './room-client-service';
import { RoomService } from './room-service';
import { PollService } from './poll-service';
import { PresentationService } from './presentation-service';

@Service()
export class RoomInfoService {
  activeRoom = computed(() => this.roomService.activeRoom() || this.roomClientService.activeRoom());
  activeRoomMode = computed(() => this.activeRoom()?.activeMode || 'poll');
  activePreviewRoomMode = computed(() => this.roomService.activePreviewRoomMode() || 'poll');
  activeRoomId = computed(() => this.activeRoom()?.id || null);
  activePollParsed = computed(() => {
    const activeRoom = this.activeRoom();
    if (!activeRoom) {
      return undefined;
    }
    return this.pollService.parsePoll(activeRoom.activePoll);
  });
  activePresentationSlides = computed(() => {
    const activeRoom = this.activeRoom();
    if (!activeRoom) {
      return [];
    }
    return this.presentationService.parsePresentation(activeRoom.activePresentation);
  });
  activePresentationSlide = computed(() => {
    const index = this.activeRoom()?.activeSlideIndex ?? 0;
    if (index >= this.activePresentationSlides().length) {
      return undefined;
    }
    return this.activePresentationSlides()[index];
  });
  activeQuestions = computed(() => {
    const activeRoom = this.activeRoom();
    const activePoll = this.activePollParsed();
    if (!activeRoom || !activePoll) {
      return [];
    }
    const activePage = this.pollService.getActivePage(
      activePoll.presentationPages,
      activeRoom.activeQuestionIndex,
    );
    return activePage.map((index) => activePoll.questions[index]);
  });
  activeReplies = computed(() => this.roomService.activeReplies.value() || []);

  private roomService = inject(RoomService);
  private roomClientService = inject(RoomClientService);
  private pollService = inject(PollService);
  private presentationService = inject(PresentationService);
}
