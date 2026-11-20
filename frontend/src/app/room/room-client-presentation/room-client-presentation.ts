import { Component, input } from '@angular/core';
import { SparkMarkdown } from '../../util/spark-markdown/spark-markdown';
import { RoomSmallTimer } from '../room-small-timer/room-small-timer';

@Component({
  imports: [SparkMarkdown, RoomSmallTimer],
  selector: 'app-room-client-presentation',
  styleUrl: './room-client-presentation.css',
  templateUrl: './room-client-presentation.html',
})
export class RoomClientPresentation {
  roomName = input.required<string | undefined>();
  activeSlide = input.required<string | undefined>();
}
