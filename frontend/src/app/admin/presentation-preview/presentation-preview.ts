import { Component, computed, inject, input } from '@angular/core';
import { SparkMarkdown } from '../../util/spark-markdown/spark-markdown';
import { NgClass } from '@angular/common';

@Component({
  imports: [NgClass, SparkMarkdown],
  selector: 'app-presentation-preview',
  styleUrl: './presentation-preview.css',
  templateUrl: './presentation-preview.html',
})
export class PresentationPreview {
  presentation = input.required<string[]>();
  activeSlideIndex = input<number>(0);
  slidesWithIndex = computed(() => this.presentation().map((slide, index) => ({ slide, index })));
}
