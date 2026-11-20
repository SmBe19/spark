import { Component, inject, input } from '@angular/core';
import { TimerService } from '../../service/timer-service';
import { NgStyle } from '@angular/common';

@Component({
  imports: [NgStyle],
  selector: 'app-room-small-timer',
  styleUrl: './room-small-timer.css',
  templateUrl: './room-small-timer.html',
})
export class RoomSmallTimer {
  timerService = inject(TimerService);

  marginTop = input<string>('1rem');
}
