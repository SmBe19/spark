import { Component, inject } from '@angular/core';
import { TimerService } from '../../service/timer-service';
import { NgClass } from '@angular/common';

@Component({
  imports: [NgClass],
  selector: 'app-room-fullscreen-timer',
  styleUrl: './room-fullscreen-timer.css',
  templateUrl: './room-fullscreen-timer.html',
})
export class RoomFullscreenTimer {
  timerService = inject(TimerService);
}
