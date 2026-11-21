import { Component, effect, inject, signal } from '@angular/core';
import { form, FormField, min } from '@angular/forms/signals';
import { RoomService } from '../../service/room-service';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { TimerService } from '../../service/timer-service';

@Component({
  imports: [FormsModule, FormField, NgClass],
  selector: 'app-room-admin-timer',
  styleUrl: './room-admin-timer.css',
  templateUrl: './room-admin-timer.html',
})
export class RoomAdminTimer {
  roomService = inject(RoomService);
  timerService = inject(TimerService);

  timerModel = signal({
    endTime: this.toDateTimeLocalValue(Date.now()),
    durationMinutes: 5,
  });
  timerForm = form(this.timerModel, (schemaPath) => {
    min(schemaPath.durationMinutes, 0);
  });

  constructor() {
    effect(() => {
      const activeRoom = this.roomService.activeRoom();
      if (!activeRoom) {
        return;
      }
      const endTimeMs =
        activeRoom.activeTimerEndTimeMs > 0 ? activeRoom.activeTimerEndTimeMs : Date.now();
      this.timerModel.update((model) => ({
        ...model,
        endTime: this.toDateTimeLocalValue(endTimeMs),
      }));
    });
  }

  updateEndTime() {
    const endTimeMs = new Date(this.timerModel().endTime).getTime();
    if (isNaN(endTimeMs)) {
      return;
    }
    this.setTimerEndTime(endTimeMs);
  }

  updateDuration() {
    const durationMinutes = this.timerModel().durationMinutes;
    if (!(durationMinutes > 0)) {
      return;
    }
    this.setTimerEndTime(Date.now() + durationMinutes * 60 * 1000 - 500);
  }

  resetTimer() {
    this.setTimerEndTime(0);
  }

  private setTimerEndTime(endTimeMs: number) {
    this.roomService.updateActiveRoomSettings({
      active_timer_end_time_s: Math.floor(endTimeMs / 1000),
    });
  }

  private toDateTimeLocalValue(timestampMs: number): string {
    const date = new Date(timestampMs);
    const pad = (value: number) => value.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }
}
