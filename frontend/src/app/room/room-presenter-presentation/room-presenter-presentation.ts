import { Component, input } from '@angular/core';
import { SparkMarkdown } from '../../util/spark-markdown/spark-markdown';
import { RoomSmallTimer } from '../room-small-timer/room-small-timer';

@Component({
  imports: [SparkMarkdown, RoomSmallTimer],
  selector: 'app-room-presenter-presentation',
  styleUrl: './room-presenter-presentation.css',
  templateUrl: './room-presenter-presentation.html',
})
export class RoomPresenterPresentation {
  activeSlide = input.required<string>();
}
