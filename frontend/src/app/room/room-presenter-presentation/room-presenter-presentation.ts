import { Component, input } from '@angular/core';
import { SparkMarkdown } from '../../util/spark-markdown/spark-markdown';

@Component({
  imports: [SparkMarkdown],
  selector: 'app-room-presenter-presentation',
  styleUrl: './room-presenter-presentation.css',
  templateUrl: './room-presenter-presentation.html',
})
export class RoomPresenterPresentation {
  activePresentation = input.required<string>();
}
