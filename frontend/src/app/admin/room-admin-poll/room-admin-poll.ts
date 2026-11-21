import { Component, computed, debounced, effect, inject, signal } from '@angular/core';
import { form, FormField, max, min } from '@angular/forms/signals';
import { RoomService } from '../../service/room-service';
import { PollService } from '../../service/poll-service';
import { PollPreview } from '../poll-preview/poll-preview';
import { PasteImage } from '../../util/paste-image/paste-image';
import { FormsModule } from '@angular/forms';
import { PollNavigationService } from '../../service/poll-navigation-service';

@Component({
  imports: [FormsModule, FormField, PasteImage, PollPreview],
  selector: 'app-room-admin-poll',
  styleUrl: './room-admin-poll.css',
  templateUrl: './room-admin-poll.html',
})
export class RoomAdminPoll {
  activePollModel = signal({
    poll: '',
    questionIndex: 0,
  });
  activePoll = form(this.activePollModel, (schemaPath) => {
    min(schemaPath.questionIndex, 0);
    max(schemaPath.questionIndex, () => this.activePollParsed().questions.length - 1);
  });
  activePollDebounced = debounced(() => this.activePollModel().poll, 250);
  activePollParsed = computed(() => this.pollService.parsePoll(this.activePollDebounced.value()));
  dirtyValues = computed(() => {
    const activePoll = this.activePollModel();
    const activeRoom = this.roomService.activeRoom();
    if (!activeRoom) {
      return {
        poll: false,
        questionIndex: false,
      };
    }
    return {
      poll: activePoll.poll !== activeRoom.activePoll,
      questionIndex: activePoll.questionIndex !== activeRoom.activeQuestionIndex,
    };
  });
  anyDirtyValues = computed(() => {
    const dirtyValues = this.dirtyValues();
    return dirtyValues.poll || dirtyValues.questionIndex;
  });
  showReplies = signal(false);

  roomService = inject(RoomService);
  pollService = inject(PollService);
  pollNavigationService = inject(PollNavigationService);

  constructor() {
    effect(() => {
      const activeRoom = this.roomService.activeRoom();
      if (!activeRoom) {
        return;
      }
      this.activePollModel.set({
        poll: activeRoom.activePoll,
        questionIndex: activeRoom.activeQuestionIndex,
      });
    });
  }

  updatePoll() {
    if (!this.dirtyValues().poll) {
      return;
    }
    this.roomService.updateActiveRoomSettings({ active_poll: this.activePollModel().poll });
  }

  updateActiveQuestionIndex() {
    if (!this.dirtyValues().questionIndex) {
      return;
    }
    this.roomService.updateActiveRoomSettings({
      active_question_index: this.activePollModel().questionIndex,
    });
  }

  archivePoll() {
    const roomId = this.roomService.activeRoomId();
    if (roomId) {
      this.roomService.archivePoll(roomId);
    }
  }
}
