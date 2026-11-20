import { Component, input } from '@angular/core';
import { SparkMarkdown } from '../../util/spark-markdown/spark-markdown';

@Component({
  imports: [SparkMarkdown],
  selector: 'app-room-client-presentation',
  styleUrl: './room-client-presentation.css',
  templateUrl: './room-client-presentation.html',
})
export class RoomClientPresentation {
  roomName = input.required<string | undefined>();
  activePresentation = input.required<string | undefined>();
}
