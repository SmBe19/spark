import { Component, computed, inject, input } from '@angular/core';
import { Poll } from '../../model/poll';
import { NgClass } from '@angular/common';
import { SparkMarkdown } from '../../util/spark-markdown/spark-markdown';
import { QuestionReply } from '../../model/replies';
import { PollService } from '../../service/poll-service';
import { SparkChart } from '../../util/spark-chart/spark-chart';

@Component({
  imports: [NgClass, SparkMarkdown, SparkChart],
  selector: 'app-poll-preview',
  styleUrl: './poll-preview.css',
  templateUrl: './poll-preview.html',
})
export class PollPreview {
  parsedPoll = input.required<Poll>();
  activeQuestionIndex = input.required<number>();
  showReplies = input<boolean>(false);
  replies = input<QuestionReply[]>([]);
  repliesByQuestion = computed(() => this.pollService.groupRepliesByQuestion(this.replies()));
  replyDistributions = computed(() =>
    this.pollService.getReplyDistributions(this.repliesByQuestion()),
  );

  pollService = inject(PollService);

  ratingValues(maxRating: number): number[] {
    return Array.from({ length: maxRating }, (_, i) => i + 1);
  }

  estimateReplies(questionIndex: number): { value: number; count: number }[] {
    const replyDistribution = this.replyDistributions()[questionIndex];
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
