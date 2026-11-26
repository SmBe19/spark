import { Component, debounced, effect, inject, signal } from '@angular/core';
import { RoomClientService } from '../../service/room-client-service';
import { SparkMarkdown } from '../../util/spark-markdown/spark-markdown';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { RoomInfoService } from '../../service/room-info-service';
import { RoomSmallTimer } from '../room-small-timer/room-small-timer';

@Component({
  imports: [FormsModule, NgClass, SparkMarkdown, RoomSmallTimer],
  selector: 'app-room-client-poll',
  styleUrl: './room-client-poll.css',
  templateUrl: './room-client-poll.html',
})
export class RoomClientPoll {
  private currentPollId: string | null = null;

  roomClientService = inject(RoomClientService);
  roomInfoService = inject(RoomInfoService);

  pendingReplies = signal<Record<number, string>>({});
  submittedReplies = signal<Record<number, string>>({});
  pendingRepliesDebounced = debounced(() => this.pendingReplies(), 500);

  constructor() {
    effect(() => {
      const activeRoom = this.roomInfoService.activeRoom();
      if (!activeRoom) {
        this.currentPollId = null;
        return;
      }
      if (this.currentPollId !== activeRoom.activePollId) {
        this.pendingReplies.set({});
        this.submittedReplies.set({});
        this.currentPollId = activeRoom.activePollId;

        const storedReplies = localStorage.getItem('activePollReplies');
        if (storedReplies) {
          try {
            const parsed = JSON.parse(storedReplies);
            if (parsed.pollId === activeRoom.activePollId) {
              this.pendingReplies.set(parsed.pendingReplies || {});
              this.submittedReplies.set(parsed.submittedReplies || {});
            }
          } catch (e) {}
        }
      }
    });

    effect(() => {
      const replies = {
        pollId: this.roomInfoService.activeRoom()?.activePollId,
        pendingReplies: this.pendingRepliesDebounced.value(),
        submittedReplies: this.submittedReplies(),
      };
      if (!replies.pollId) {
        return;
      }
      localStorage.setItem('activePollReplies', JSON.stringify(replies));
    });
  }
  setPendingReply(questionIndex: number, reply: string) {
    this.pendingReplies.update((current) => {
      return { ...current, [questionIndex]: reply };
    });
  }

  toggleOption(questionIndex: number, optionIndex: number, submitImmediately: boolean = false) {
    const currentReply = this.pendingReplies()[questionIndex] || '';
    const selectedOptions = new Set(
      currentReply
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s !== ''),
    );
    if (selectedOptions.has(optionIndex.toString())) {
      selectedOptions.delete(optionIndex.toString());
    } else {
      selectedOptions.add(optionIndex.toString());
    }
    this.setPendingReply(questionIndex, Array.from(selectedOptions).join(','));

    if (submitImmediately) {
      this.submitPendingReply(questionIndex);
    }
  }

  isOptionSelected(questionIndex: number, optionIndex: number): boolean {
    const currentReply = this.pendingReplies()[questionIndex] || '';
    const selectedOptions = new Set(
      currentReply
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s !== ''),
    );
    return selectedOptions.has(optionIndex.toString());
  }

  questionHasCorrection(questionIndex: number): boolean {
    const question = this.roomInfoService.activeClientQuestions().find((q) => q.index === questionIndex);
    if (!question || question.pollType !== 'options') {
      return false;
    }
    return question.options.some((option) => option.correct);
  }

  submitPendingReply(questionIndex: number) {
    const reply = this.pendingReplies()[questionIndex];
    if (reply) {
      this.submittedReplies.update((current) => {
        return { ...current, [questionIndex]: reply };
      });
      this.roomClientService.addReply(reply, questionIndex);
    }
  }

  submitReply(questionIndex: number, reply: string) {
    this.setPendingReply(questionIndex, reply);
    this.submitPendingReply(questionIndex);
  }

  ratingValues(maxRating: number): number[] {
    return Array.from({ length: maxRating }, (_, i) => i + 1);
  }
}
