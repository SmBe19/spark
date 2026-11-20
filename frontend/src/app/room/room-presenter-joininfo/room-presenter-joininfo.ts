import { Component, computed, inject, signal } from '@angular/core';
import { SHORT_LINK_BASE } from '../../../consts';
import { NgClass } from '@angular/common';
import { QRCodeComponent } from 'angularx-qrcode';
import { RoomInfoService } from '../../service/room-info-service';

@Component({
  imports: [NgClass, QRCodeComponent],
  selector: 'app-room-presenter-joininfo',
  styleUrl: './room-presenter-joininfo.css',
  templateUrl: './room-presenter-joininfo.html',
})
export class RoomPresenterJoininfo {
  roomInfoService = inject(RoomInfoService);

  joinInformationBigRequested = signal(false);
  joinInformationBig = computed(() => {
    if (this.joinInformationBigRequested()) {
      return true;
    }
    if (this.roomInfoService.activeRoomMode() === 'poll') {
      return this.roomInfoService.activeQuestions().length === 0;
    } else if (this.roomInfoService.activeRoomMode() === 'presentation') {
      return this.roomInfoService.activePresentationSlides().length === 0;
    }
    return false;
  });
  joinLink = computed(() => {
    const activeRoom = this.roomInfoService.activeRoom();
    if (!activeRoom) {
      return '';
    }
    return SHORT_LINK_BASE + '/' + activeRoom.slug;
  });
}
