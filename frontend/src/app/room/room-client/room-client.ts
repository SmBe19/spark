import { Component, computed, debounced, effect, inject, signal } from '@angular/core';
import { RoomClientService } from '../../service/room-client-service';
import { ActivatedRoute, Router } from '@angular/router';
import { PollService } from '../../service/poll-service';
import { Title } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { SparkMarkdown } from '../../util/spark-markdown/spark-markdown';

@Component({
  imports: [FormsModule, NgClass, SparkMarkdown],
  selector: 'app-room-client',
  styleUrl: './room-client.css',
  templateUrl: './room-client.html',
})
export class RoomClient {
  private currentPollId: string | null = null;

  titleService = inject(Title);
  pollService = inject(PollService);
  roomClientService = inject(RoomClientService);
  router = inject(Router);
  activatedRoute = inject(ActivatedRoute);

  pendingReplies = signal<Record<number, string>>({});
  submittedReplies = signal<Record<number, string>>({});
  pendingRepliesDebounced = debounced(() => this.pendingReplies(), 500);

  activePollParsed = computed(() => {
    const activeRoom = this.roomClientService.activeRoom();
    if (!activeRoom) {
      return null;
    }
    return this.pollService.parsePoll(activeRoom.activePoll);
  });
  activeQuestions = computed(() => {
    const activeRoom = this.roomClientService.activeRoom();
    const activePoll = this.activePollParsed();
    if (!activeRoom || !activePoll) {
      return [];
    }
    const activePage = this.pollService.getActivePage(
      activePoll.pages,
      activeRoom.activeQuestionIndex,
    );
    return activePage.map((index) => activePoll.questions[index]);
  });
  activeRoomMode = computed(() => this.roomClientService.activeRoom()?.activeMode || 'poll');

  constructor() {
    effect(() => {
      const activeRoom = this.roomClientService.activeRoom();
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
      this.titleService.setTitle(`Spark: ${activeRoom.name}`);
    });

    effect(() => {
      const replies = {
        pollId: this.roomClientService.activeRoom()?.activePollId,
        pendingReplies: this.pendingRepliesDebounced.value(),
        submittedReplies: this.submittedReplies(),
      };
      if (!replies.pollId) {
        return;
      }
      localStorage.setItem('activePollReplies', JSON.stringify(replies));
    });
  }

  ngOnInit() {
    this.activatedRoute.paramMap.subscribe((params) => {
      const roomSlug = params.get('roomSlug');
      if (roomSlug) {
        this.roomClientService.joinRoomBySlug(roomSlug, (success: boolean) => {
          if (!success) {
            this.router.navigate(['/']);
          }
        });
      }
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
    const question = this.activeQuestions().find((q) => q.index === questionIndex);
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
