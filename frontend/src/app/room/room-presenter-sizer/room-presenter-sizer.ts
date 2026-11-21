import { Component, HostListener, model } from '@angular/core';
import { handleKeyboardEvent } from '../../util/keyboard/keyboard';

@Component({
  imports: [],
  selector: 'app-room-presenter-sizer',
  styleUrl: './room-presenter-sizer.css',
  templateUrl: './room-presenter-sizer.html',
})
export class RoomPresenterSizer {
  activeFontSize = model.required<number>();
  activeWidth = model.required<number>();

  increaseFontAndWidth() {
    this.increaseFontSize();
    this.increaseWidth();
  }

  decreaseFontAndWidth() {
    this.decreaseFontSize();
    this.decreaseWidth();
  }

  increaseFontSize() {
    this.activeFontSize.update((size) => size + 2);
  }

  decreaseFontSize() {
    this.activeFontSize.update((size) => size - 2);
  }

  increaseWidth() {
    this.activeWidth.update((width) => width + 50);
  }

  decreaseWidth() {
    this.activeWidth.update((width) => width - 50);
  }

  @HostListener('window:keydown', ['$event']) handleKeydown(event: KeyboardEvent) {
    handleKeyboardEvent(event, (event) => {
      let matched = true;
      switch (event.key) {
        case '.':
          event.preventDefault();
          this.increaseFontAndWidth();
          break;
        case ',':
          this.decreaseFontAndWidth();
          break;
        default:
          matched = false;
          break;
      }
      if (event.shiftKey) {
        matched = true;
        switch (event.key) {
          case 'ArrowUp':
            this.increaseFontSize();
            break;
          case 'ArrowDown':
            this.decreaseFontSize();
            break;
          case 'ArrowRight':
            this.increaseWidth();
            break;
          case 'ArrowLeft':
            this.decreaseWidth();
            break;
          default:
            matched = false;
            break;
        }
      }
      return matched;
    });
  }
}
