import { Component, computed, HostListener, inject } from '@angular/core';
import { SparkMarkdown } from '../../util/spark-markdown/spark-markdown';
import { SparkChart } from '../../util/spark-chart/spark-chart';
import { NgClass } from '@angular/common';
import { PollService } from '../../service/poll-service';
import { RoomInfoService } from '../../service/room-info-service';
import { RoomSmallTimer } from '../room-small-timer/room-small-timer';
import { handleKeyboardEvent } from '../../util/keyboard/keyboard';
import { PollNavigationService } from '../../service/poll-navigation-service';

@Component({
  imports: [SparkMarkdown, SparkChart, NgClass, RoomSmallTimer],
  selector: 'app-room-presenter-poll',
  styleUrl: './room-presenter-poll.css',
  templateUrl: './room-presenter-poll.html',
})
export class RoomPresenterPoll {
  pollService = inject(PollService);
  roomInfoService = inject(RoomInfoService);
  pollNavigationService = inject(PollNavigationService);

  repliesByQuestion = computed(() =>
    this.pollService.groupRepliesByQuestion(this.roomInfoService.activeReplies()),
  );
  replyDistributions = computed(() =>
    this.pollService.getReplyDistributions(this.repliesByQuestion()),
  );

  @HostListener('window:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent) {
    handleKeyboardEvent(event, (event) => {
      if (event.shiftKey) {
        return false;
      }
      switch (event.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
          this.pollNavigationService.previousQuestion();
          break;
        case 'ArrowRight':
        case 'ArrowDown':
          this.pollNavigationService.nextQuestion();
          break;
        default:
          return false;
      }
      return true;
    });
  }
}
