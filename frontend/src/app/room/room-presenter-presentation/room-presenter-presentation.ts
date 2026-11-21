import { Component, HostListener, inject, input } from '@angular/core';
import { SparkMarkdown } from '../../util/spark-markdown/spark-markdown';
import { RoomSmallTimer } from '../room-small-timer/room-small-timer';
import { handleKeyboardEvent } from '../../util/keyboard/keyboard';
import { PresentationNavigationService } from '../../service/presentation-navigation-service';

@Component({
  imports: [SparkMarkdown, RoomSmallTimer],
  selector: 'app-room-presenter-presentation',
  styleUrl: './room-presenter-presentation.css',
  templateUrl: './room-presenter-presentation.html',
})
export class RoomPresenterPresentation {
  activeSlide = input.required<string>();
  allowKeyboardNavigation = input<boolean | ''>(false);

  presentationNavigationService = inject(PresentationNavigationService);

  @HostListener('window:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent) {
    if (this.allowKeyboardNavigation() === false) {
      return;
    }
    handleKeyboardEvent(event, (event) => {
      if (event.shiftKey) {
        return false;
      }
      switch (event.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
          this.presentationNavigationService.previousSlide();
          break;
        case 'ArrowRight':
        case 'ArrowDown':
          this.presentationNavigationService.nextSlide();
          break;
        default:
          return false;
      }
      return true;
    });
  }
}
