import { effect, inject, Service, signal } from '@angular/core';
import { RoomInfoService } from './room-info-service';
import { LocalStreamService } from './local-stream-service';

interface SparkDirectStreamWindow extends Window {
  __sparkSetDirectStream?: (stream: MediaStream | null) => void;
  __sparkGetDirectStream?: () => MediaStream | null;
}

@Service()
export class DirectStreamService {
  directStream = signal<MediaStream | null>(null);

  private roomInfoService = inject(RoomInfoService);
  private localStreamService = inject(LocalStreamService);
  private presenterWindow: Window | null = null;

  constructor() {
    const sparkWindow = window as SparkDirectStreamWindow;
    sparkWindow.__sparkSetDirectStream = (stream) => this.setDirectStream(stream);
    sparkWindow.__sparkGetDirectStream = () => this.currentActiveStream();

    // Admin side
    effect(() => {
      this.pushDirectStream(this.currentActiveStream());
    });

    // Presenter side
    try {
      const opener = window.opener as SparkDirectStreamWindow | null;
      if (opener && typeof opener.__sparkGetDirectStream === 'function') {
        this.setDirectStream(opener.__sparkGetDirectStream() ?? null);
      }
    } catch {
      // Cross-origin opener; ignore.
    }
  }

  openPresenter(roomId: string, slug: string) {
    this.presenterWindow = window.open(`/presenter/${slug}`, `spark-presenter-${roomId}`);
    this.pushDirectStream(this.currentActiveStream());
  }

  private setDirectStream(stream: MediaStream | null) {
    if (this.directStream() === stream) {
      return;
    }
    this.directStream.set(stream);
    if (!stream) {
      return;
    }
    for (const track of stream.getTracks()) {
      track.addEventListener('ended', () => {
        if (this.directStream() === stream) {
          this.directStream.set(null);
        }
      });
    }
  }

  private currentActiveStream(): MediaStream | null {
    const activeRoom = this.roomInfoService.activeRoom();
    if (!activeRoom || activeRoom.activeMode !== 'stream') {
      return null;
    }
    const localStream = this.localStreamService.localStreams()[activeRoom.stream.activeStreamId];
    return localStream?.stream ?? null;
  }

  private pushDirectStream(stream: MediaStream | null) {
    const presenterWindow = this.presenterWindow as SparkDirectStreamWindow | null;
    if (!presenterWindow || presenterWindow.closed) {
      return;
    }
    try {
      presenterWindow.__sparkSetDirectStream?.(stream);
    } catch {
      // Presenter window navigated away; ignore.
    }
  }
}
