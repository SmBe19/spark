import { Service } from '@angular/core';

@Service()
export class PresentationService {
  private static readonly slideSeparator = /^[ \t]*-{6,}[ \t]*$/;

  parsePresentation(presentationConfig: string): string[] {
    if (presentationConfig.trim() === '') {
      return [];
    }

    const slides: string[] = [];
    let currentSlide: string[] = [];

    for (const line of presentationConfig.split(/\r?\n/)) {
      if (PresentationService.slideSeparator.test(line)) {
        slides.push(currentSlide.join('\n').trim());
        currentSlide = [];
      } else {
        currentSlide.push(line);
      }
    }
    slides.push(currentSlide.join('\n').trim());

    return slides.filter((slide) => slide !== '');
  }
}
