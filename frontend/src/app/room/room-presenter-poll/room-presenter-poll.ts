import { Component, computed, inject } from '@angular/core';
import { SparkMarkdown } from '../../util/spark-markdown/spark-markdown';
import { SparkChart } from '../../util/spark-chart/spark-chart';
import { NgClass } from '@angular/common';
import { PollService } from '../../service/poll-service';
import { RoomService } from '../../service/room-service';

@Component({
  imports: [SparkMarkdown, SparkChart, NgClass],
  selector: 'app-room-presenter-poll',
  styleUrl: './room-presenter-poll.css',
  templateUrl: './room-presenter-poll.html',
})
export class RoomPresenterPoll {
  pollService = inject(PollService);
  roomService = inject(RoomService);
  repliesByQuestion = computed(() =>
    this.pollService.groupRepliesByQuestion(this.roomService.activeReplies.value()),
  );
  replyDistributions = computed(() =>
    this.pollService.getReplyDistributions(this.repliesByQuestion()),
  );
}
