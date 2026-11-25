import { computed, effect, inject, Service, signal } from '@angular/core';
import { RoomInfoService } from './room-info-service';
import { LocalStreamService } from './local-stream-service';
import { LocalStream } from '../model/streams';

interface SparkDirectStreamWindow extends Window {
  __sparkLocalStreams?: { [streamId: string]: LocalStream };
}

@Service()
export class DirectStreamService {
  parentLocalStreams = signal<{ [streamId: string]: LocalStream }>({});

  private localStreamService = inject(LocalStreamService);

  constructor() {
    const sparkWindow = window as SparkDirectStreamWindow;

    // Admin side
    effect(() => {
      sparkWindow.__sparkLocalStreams = this.localStreamService.localStreams();
      sparkWindow.dispatchEvent(
        new CustomEvent('spark-local-streams-changed', {
          detail: this.localStreamService.localStreams(),
        }),
      );
    });

    // Presenter side
    try {
      const opener = window.opener as SparkDirectStreamWindow | null;
      if (opener && typeof opener.__sparkLocalStreams === 'object') {
        opener.addEventListener('spark-local-streams-changed', (event: Event) => {
          const customEvent = event as CustomEvent<{ [streamId: string]: LocalStream }>;
          this.parentLocalStreams.set(customEvent.detail);
        });
        this.parentLocalStreams.set(opener.__sparkLocalStreams);
      }
    } catch {
      // Cross-origin opener; ignore.
    }
  }
}
