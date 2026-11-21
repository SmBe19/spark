import { effect, inject, Service, signal } from '@angular/core';
import { RoomInfoService } from './room-info-service';
import { LocalStreamService } from './local-stream-service';

interface SparkDirectStreamWindow extends Window {
  __sparkSetDirectStream?: (stream: MediaStream | null) => void;
  __sparkGetDirectStream?: () => MediaStream | null;
}

/**
 * Shares the active local stream with a presenter window opened from the admin
 * interface on the same machine. Same-origin windows can pass the MediaStream
 * by reference, so the presenter needs neither WebRTC nor the Cloudflare SFU.
 */
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

    effect(() => {
      this.pushDirectStream(this.currentActiveStream());
    });

    // Presenter side: pull whatever the opener already published.
    try {
      const opener = window.opener as SparkDirectStreamWindow | null;
      if (opener && typeof opener.__sparkGetDirectStream === 'function') {
        this.setDirectStream(opener.__sparkGetDirectStream() ?? null);
      }
    } catch {
      // Opener is cross-origin or inaccessible; fall back to WebRTC.
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
    // The admin page stopping its capture (or unloading) ends the shared
    // tracks; drop the direct stream so the presenter can fall back.
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
