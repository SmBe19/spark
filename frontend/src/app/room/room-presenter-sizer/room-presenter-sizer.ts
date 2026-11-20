import { Component, model } from '@angular/core';

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
}
