import { Component, computed, debounced, effect, inject, signal } from '@angular/core';
import { RoomClientService } from '../../service/room-client-service';
import { ActivatedRoute, Router } from '@angular/router';
import { PollService } from '../../service/poll-service';
import { MarkdownComponent } from 'ngx-markdown';
import { Title } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';

@Component({
  imports: [FormsModule, NgClass, MarkdownComponent],
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

  pendingAnswers = signal<Record<number, string>>({});
  submittedAnswers = signal<Record<number, string>>({});
  pendingAnswersDebounced = debounced(() => this.pendingAnswers(), 500);

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

  constructor() {
    effect(() => {
      const activeRoom = this.roomClientService.activeRoom();
      if (!activeRoom) {
        this.currentPollId = null;
        return;
      }
      if (this.currentPollId !== activeRoom.activePollId) {
        this.pendingAnswers.set({});
        this.submittedAnswers.set({});
        this.currentPollId = activeRoom.activePollId;

        const storedAnswers = localStorage.getItem('activePollAnswers');
        if (storedAnswers) {
          try {
            const parsed = JSON.parse(storedAnswers);
            if (parsed.pollId === activeRoom.activePollId) {
              this.pendingAnswers.set(parsed.pendingAnswers || {});
              this.submittedAnswers.set(parsed.submittedAnswers || {});
            }
          } catch (e) {}
        }
      }
      this.titleService.setTitle(`Spark: ${activeRoom.name}`);
    });

    effect(() => {
      const answers = {
        pollId: this.roomClientService.activeRoom()?.activePollId,
        pendingAnswers: this.pendingAnswersDebounced.value(),
        submittedAnswers: this.submittedAnswers(),
      };
      console.log(this.roomClientService.activeRoom());
      if (!answers.pollId) {
        return;
      }
      localStorage.setItem('activePollAnswers', JSON.stringify(answers));
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

  setPendingAnswer(questionIndex: number, answer: string) {
    this.pendingAnswers.update((current) => {
      return { ...current, [questionIndex]: answer };
    });
  }

  submitPendingAnswer(questionIndex: number) {
    const answer = this.pendingAnswers()[questionIndex];
    if (answer) {
      this.submittedAnswers.update((current) => {
        return { ...current, [questionIndex]: answer };
      });
      this.roomClientService.addAnswer(answer, questionIndex);
    }
  }

  submitAnswer(questionIndex: number, answer: string) {
    this.setPendingAnswer(questionIndex, answer);
    this.submitPendingAnswer(questionIndex);
  }

  ratingValues(maxRating: number): number[] {
    return Array.from({ length: maxRating }, (_, i) => i + 1);
  }
}
