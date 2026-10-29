import { Component, input } from '@angular/core';
import { MarkdownComponent } from 'ngx-markdown';

@Component({
  imports: [MarkdownComponent],
  selector: 'app-spark-markdown',
  styleUrl: './spark-markdown.css',
  templateUrl: './spark-markdown.html',
})
export class SparkMarkdown {
  data = input.required<string>();
}
