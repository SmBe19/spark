import { Component, computed, effect, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { PollService } from '../../service/poll-service';
import { RoomService } from '../../service/room-service';
import { ActivatedRoute, Router } from '@angular/router';
import { SparkMarkdown } from '../../util/spark-markdown/spark-markdown';
import { NgClass, NgStyle } from '@angular/common';
import { QRCodeComponent } from 'angularx-qrcode';
import { SHORT_LINK_BASE } from '../../../consts';

@Component({
  imports: [SparkMarkdown, NgClass, NgStyle, QRCodeComponent],
  selector: 'app-room-presenter',
  styleUrl: './room-presenter.css',
  templateUrl: './room-presenter.html',
})
export class RoomPresenter {
  titleService = inject(Title);
  pollService = inject(PollService);
  roomService = inject(RoomService);
  router = inject(Router);
  activatedRoute = inject(ActivatedRoute);

  activeFontSize = signal(28);
  activeWidth = signal(800);

  activePollParsed = computed(() => {
    const activeRoom = this.roomService.activeRoom();
    if (!activeRoom) {
      return null;
    }
    return this.pollService.parsePoll(activeRoom.activePoll);
  });
  activeQuestions = computed(() => {
    const activeRoom = this.roomService.activeRoom();
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
  activeRoomMode = computed(() => this.roomService.activeRoom()?.activeMode || 'poll');
  joinInformationBig = computed(() => {
    if (this.activeRoomMode() === 'poll') {
      return this.activeQuestions().length === 0;
    } else if (this.activeRoomMode() === 'presentation') {
      return !this.roomService.activeRoom()?.activePresentation;
    }
    return true;
  });
  joinLink = computed(() => {
    const activeRoom = this.roomService.activeRoom();
    if (!activeRoom) {
      return '';
    }
    return SHORT_LINK_BASE + '/' + activeRoom.slug;
  });

  constructor() {
    this.roomService.loadReplies.set(true);
    effect(() => {
      const activeRoom = this.roomService.activeRoom();
      if (!activeRoom) {
        return;
      }
      this.titleService.setTitle(`Spark: ${activeRoom.name}`);
    });
  }

  ngOnInit() {
    this.activatedRoute.params.subscribe((params) => {
      const roomSlug = params['roomSlug'];
      if (!roomSlug) {
        this.router.navigate(['/']);
        return;
      }
      this.roomService.joinRoomBySlug(roomSlug, (success) => {
        if (!success) {
          this.router.navigate(['/']);
        }
      });
    });
  }

  increaseFontAndWidth() {
    this.increaseFontSize();
    this.increaseWidth();
  }

  decreaseFontAndWidth() {
    this.decreaseFontSize();
    this.decreaseWidth();
  }

  increaseFontSize() {
    this.activeFontSize.update((size) => size + 2);
  }

  decreaseFontSize() {
    this.activeFontSize.update((size) => size - 2);
  }

  increaseWidth() {
    this.activeWidth.update((width) => width + 50);
  }

  decreaseWidth() {
    this.activeWidth.update((width) => width - 50);
  }
}
