import { Component, computed, effect, inject, signal } from '@angular/core';
import { RoomClientService } from '../../service/room-client-service';
import { ActivatedRoute } from '@angular/router';
import { PollService } from '../../service/poll-service';
import { MarkdownComponent } from 'ngx-markdown';
import { Title } from '@angular/platform-browser';

@Component({
  imports: [MarkdownComponent],
  selector: 'app-room-client',
  styleUrl: './room-client.css',
  templateUrl: './room-client.html',
})
export class RoomClient {
  private currentPollId: string | null = null;

  titleService = inject(Title);
  pollService = inject(PollService);
  roomClientService = inject(RoomClientService);
  activatedRoute = inject(ActivatedRoute);

  pendingAnswers = signal<Record<number, string>>({});
  submittedAnswers = signal<Record<number, string>>({});

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
      }
      this.titleService.setTitle(`Spark: ${activeRoom.name}`);
    });
  }

  ngOnInit() {
    this.activatedRoute.paramMap.subscribe((params) => {
      const roomSlug = params.get('roomSlug');
      if (roomSlug) {
        this.roomClientService.joinRoomBySlug(roomSlug);
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
