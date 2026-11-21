import { computed, inject, Service } from '@angular/core';
import { RoomInfoService } from './room-info-service';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, timer } from 'rxjs';

@Service()
export class TimerService {
  private static readonly removeTimerDelayMs = 30000;

  currentTime = toSignal(timer(0, 500).pipe(map(() => Date.now())), {
    initialValue: Date.now(),
  });
  activeTimerEndTimeMs = computed(
    () => this.roomInfoService.activeRoom()?.activeTimerEndTimeMs || 0,
  );
  hasActiveTimer = computed(
    () => this.activeTimerEndTimeMs() > 0 && this.activeTimerEndTimeMs() > this.currentTime(),
  );
  timerWasRecentlyActive = computed(
    () =>
      this.activeTimerEndTimeMs() > 0 &&
      this.activeTimerEndTimeMs() + TimerService.removeTimerDelayMs > this.currentTime(),
  );
  remainingTimeString = computed(() => {
    const remainingMs = Math.max(0, this.activeTimerEndTimeMs() - this.currentTime());
    return this.formatDuration(remainingMs);
  });

  private roomInfoService = inject(RoomInfoService);

  formatDuration(durationMs: number): string {
    const totalSeconds = Math.ceil(durationMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (value: number) => value.toString().padStart(2, '0');
    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
  }
}
