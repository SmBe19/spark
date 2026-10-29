import { Component, input } from '@angular/core';
import { SparkMarkdown } from '../../util/spark-markdown/spark-markdown';

@Component({
  imports: [SparkMarkdown],
  selector: 'app-presentation-preview',
  styleUrl: './presentation-preview.css',
  templateUrl: './presentation-preview.html',
})
export class PresentationPreview {
  presentationContent = input.required<string>();
}
