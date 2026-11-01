import { Component, computed, inject, input } from '@angular/core';
import { Poll } from '../../model/poll';
import { NgClass } from '@angular/common';
import { SparkMarkdown } from '../../util/spark-markdown/spark-markdown';
import { QuestionReply } from '../../model/replies';
import { PollService } from '../../service/poll-service';

@Component({
  imports: [NgClass, SparkMarkdown],
  selector: 'app-poll-preview',
  styleUrl: './poll-preview.css',
  templateUrl: './poll-preview.html',
})
export class PollPreview {
  parsedPoll = input.required<Poll>();
  activeQuestionIndex = input.required<number>();
  showReplies = input<boolean>(false);
  activeReplies = input<QuestionReply[]>([]);
  activeRepliesByQuestion = computed(() =>
    this.pollService.groupRepliesByQuestion(this.activeReplies()),
  );
  activeReplyDistributions = computed(() =>
    this.pollService.getReplyDistributions(this.activeRepliesByQuestion()),
  );

  pollService = inject(PollService);

  ratingValues(maxRating: number): number[] {
    return Array.from({ length: maxRating }, (_, i) => i + 1);
  }

  estimateReplies(questionIndex: number): { value: number; count: number }[] {
    const replyDistribution = this.activeReplyDistributions()[questionIndex];
    if (!replyDistribution) {
      return [];
    }
    const replyCounts = Object.entries(replyDistribution).map(([value, count]) => ({
      value: Number(value),
      count,
    }));
    replyCounts.sort((a, b) => a.value - b.value);
    return replyCounts;
  }
}
