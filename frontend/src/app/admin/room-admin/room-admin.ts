import { Component, computed, debounced, inject, input, signal } from '@angular/core';
import { RoomInfoShort } from '../../model/rooms';
import { form, FormField, max, min } from '@angular/forms/signals';
import { RoomService } from '../../service/room-service';
import { FormsModule } from '@angular/forms';
import { toObservable } from '@angular/core/rxjs-interop';
import { PollService } from '../../service/poll-service';
import { NgClass } from '@angular/common';
import { PollPreview } from '../poll-preview/poll-preview';

@Component({
  imports: [FormField, FormsModule, NgClass, PollPreview],
  selector: 'app-room-admin',
  styleUrl: './room-admin.css',
  templateUrl: './room-admin.html',
})
export class RoomAdmin {
  roomInfoModel = signal({
    slug: '',
    name: '',
    activePoll: '',
    activeQuestionIndex: 0,
  });
  roomInfoForm = form(this.roomInfoModel, (schemaPath) => {
    min(schemaPath.activeQuestionIndex, 0);
    max(schemaPath.activeQuestionIndex, () => this.activePollParsed().questions.length - 1);
  });
  activePollDebounced = debounced(() => this.roomInfoModel().activePoll, 500);
  activePollParsed = computed(() => this.pollService.parsePoll(this.activePollDebounced.value()));
  dirtyValues = computed(() => {
    const currentRoomInfo = this.roomInfoModel();
    const activeRoom = this.roomService.activeRoom.value();
    if (!activeRoom) {
      return {
        slug: false,
        name: false,
        activePoll: false,
        activeQuestionIndex: false,
      };
    }
    return {
      slug: currentRoomInfo.slug !== activeRoom.slug,
      name: currentRoomInfo.name !== activeRoom.name,
      activePoll: currentRoomInfo.activePoll !== activeRoom.activePoll,
      activeQuestionIndex: currentRoomInfo.activeQuestionIndex !== activeRoom.activeQuestionIndex,
    };
  });
  showRoomEditForm = signal(false);
  deletingRoom = signal(false);

  roomService = inject(RoomService);
  pollService = inject(PollService);

  constructor() {
    toObservable(this.roomService.activeRoom.value).subscribe((room) => {
      if (room) {
        this.roomInfoModel.set({
          slug: room.slug,
          name: room.name,
          activePoll: room.activePoll,
          activeQuestionIndex: room.activeQuestionIndex,
        });
      }
    });
  }

  updateRoom() {
    this.roomService.updateRoomMeta(
      this.roomService.activeRoom.value()?.id || '',
      this.roomInfoModel().slug,
      this.roomInfoModel().name,
    );
  }

  updatePoll() {
    if (!this.dirtyValues().activePoll) {
      return;
    }
    this.roomService.updateRoomActivePoll(
      this.roomService.activeRoom.value()?.id || '',
      this.roomInfoModel().activePoll,
    );
  }

  updateActiveQuestionIndex() {
    if (!this.dirtyValues().activeQuestionIndex) {
      return;
    }
    this.roomService.updateRoomActiveQuestionIndex(
      this.roomService.activeRoom.value()?.id || '',
      this.roomInfoModel().activeQuestionIndex,
    );
  }

  nextQuestion() {
    if (this.activePollParsed().questions.length === 0) {
      return;
    }
    const currentIndex = this.roomInfoModel.update((info) => ({
      ...info,
      activeQuestionIndex: Math.min(
        this.activePollParsed().questions.length - 1,
        info.activeQuestionIndex + 1,
      ),
    }));
    this.updateActiveQuestionIndex();
  }

  previousQuestion() {
    if (this.activePollParsed().questions.length === 0) {
      return;
    }
    const currentIndex = this.roomInfoModel.update((info) => ({
      ...info,
      activeQuestionIndex: Math.max(0, info.activeQuestionIndex - 1),
    }));
    this.updateActiveQuestionIndex();
  }

  startDeleteRoom() {
    this.deletingRoom.set(true);
  }

  cancelDeleteRoom() {
    this.deletingRoom.set(false);
  }

  confirmDeleteRoom() {
    const roomId = this.roomService.activeRoom.value()?.id;
    if (roomId) {
      this.roomService.deleteRoom(roomId);
      this.deletingRoom.set(false);
    }
  }
}
