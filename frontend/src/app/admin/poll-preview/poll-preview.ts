import { Component, input } from '@angular/core';
import { Poll } from '../../model/poll';
import { NgClass } from '@angular/common';

@Component({
  imports: [NgClass],
  selector: 'app-poll-preview',
  styleUrl: './poll-preview.css',
  templateUrl: './poll-preview.html',
})
export class PollPreview {
  parsedPoll = input.required<Poll>();
  activeQuestionIndex = input.required<number>();

  ratingValues(maxRating: number): number[] {
    return Array.from({ length: maxRating }, (_, i) => i + 1);
  }
}
