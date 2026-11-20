import { Component, effect, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RoomService } from '../../service/room-service';
import { ActivatedRoute, Router } from '@angular/router';
import { NgStyle } from '@angular/common';
import { RoomPresenterPresentation } from '../room-presenter-presentation/room-presenter-presentation';
import { RoomPresenterPoll } from '../room-presenter-poll/room-presenter-poll';
import { RoomPresenterSizer } from '../room-presenter-sizer/room-presenter-sizer';
import { RoomPresenterJoininfo } from '../room-presenter-joininfo/room-presenter-joininfo';
import { RoomInfoService } from '../../service/room-info-service';
import { RoomFullscreenTimer } from '../room-fullscreen-timer/room-fullscreen-timer';

@Component({
  imports: [
    NgStyle,
    RoomPresenterPresentation,
    RoomPresenterPoll,
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
  router = inject(Router);
  activatedRoute = inject(ActivatedRoute);

  activeFontSize = signal(38);
  activeWidth = signal(900);

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
}
