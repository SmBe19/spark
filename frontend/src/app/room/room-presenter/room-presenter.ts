import { Component, computed, effect, HostListener, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RoomService } from '../../service/room-service';
import { ActivatedRoute, Router } from '@angular/router';
import { NgStyle } from '@angular/common';
import { RoomMode, StreamChannels } from '../../model/rooms';
import { PollService } from '../../service/poll-service';
import { handleKeyboardEvent } from '../../util/keyboard/keyboard';
import { RoomPresenterPresentation } from '../room-presenter-presentation/room-presenter-presentation';
import { RoomPresenterPoll } from '../room-presenter-poll/room-presenter-poll';
import { RoomPresenterSizer } from '../room-presenter-sizer/room-presenter-sizer';
import { RoomPresenterJoininfo } from '../room-presenter-joininfo/room-presenter-joininfo';
import { RoomInfoService } from '../../service/room-info-service';
import { RoomFullscreenTimer } from '../room-fullscreen-timer/room-fullscreen-timer';
import { RoomStream } from '../room-stream/room-stream';

@Component({
  imports: [
    NgStyle,
    RoomPresenterPoll,
    RoomPresenterPresentation,
    RoomStream,
    RoomFullscreenTimer,
    RoomPresenterSizer,
    RoomPresenterJoininfo,
  ],
  selector: 'app-room-presenter',
  styleUrl: './room-presenter.css',
  templateUrl: './room-presenter.html',
})
export class RoomPresenter {
  titleService = inject(Title);
  roomInfoService = inject(RoomInfoService);
  roomService = inject(RoomService);
  pollService = inject(PollService);
  router = inject(Router);
  activatedRoute = inject(ActivatedRoute);

  activeFontSize = signal(38);
  activeWidth = signal(900);
  displaySizer = computed(() => {
    const activeMode = this.roomInfoService.activeRoomMode();
    return activeMode !== 'blank' && activeMode !== 'stream';
  });

  constructor() {
    effect(() => {
      const activeRoom = this.roomInfoService.activeRoom();
      if (!activeRoom) {
        return;
      }
      this.titleService.setTitle(`Spark: ${activeRoom.name}`);
    });
  }

  ngOnInit() {
    this.activatedRoute.params.subscribe((params) => {
      const roomSlug = params['roomSlug'];
      if (!roomSlug) {
        this.router.navigate(['/']);
        return;
      }
      this.roomService.joinRoomBySlug(roomSlug, (success) => {
        if (!success) {
          this.router.navigate(['/']);
        }
      });
    });
  }

  @HostListener('window:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent) {
    handleKeyboardEvent(event, (event) => {
      if (event.key >= '1' && event.key <= '9') {
        this.switchToStreamChannel(event.key as keyof StreamChannels);
        return true;
      }

      switch (event.key) {
        case '0':
          this.switchRoomMode('blank');
          break;
        case 'p':
        case 'P':
          this.switchRoomMode('poll');
          break;
        case 's':
        case 'S':
          this.switchRoomMode('presentation');
          break;
        case 't':
        case 'T':
          this.switchRoomMode('timer');
          break;
        case 'f':
        case 'F':
          window.document.documentElement.requestFullscreen();
          break;
        default:
          return false;
      }
      return true;
    });
  }

  switchRoomMode(mode: RoomMode) {
    this.roomService.updateActiveRoomSettings({ active_mode: mode });
  }

  switchToStreamChannel(channel: keyof StreamChannels) {
    const streamId = this.roomInfoService.activeRoom()?.stream.channels[channel];
    if (!streamId) {
      return;
    }
    this.roomService.updateActiveRoomSettings({
      active_mode: 'stream',
      stream: { active_stream_id: streamId },
    });
  }
}
