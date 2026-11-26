import { Component, computed, inject, signal } from '@angular/core';
import { SHORT_LINK_BASE } from '../../../consts';
import { NgClass } from '@angular/common';
import { QRCodeComponent } from 'angularx-qrcode';
import { RoomInfoService } from '../../service/room-info-service';
import { JoinInfoMode } from '../../model/rooms';

@Component({
  imports: [NgClass, QRCodeComponent],
  selector: 'app-room-presenter-joininfo',
  styleUrl: './room-presenter-joininfo.css',
  templateUrl: './room-presenter-joininfo.html',
})
export class RoomPresenterJoininfo {
  roomInfoService = inject(RoomInfoService);

  joinInformationBigRequested = signal(false);
  joinInformationMode = computed<JoinInfoMode>(() => {
    if (this.joinInformationBigRequested()) {
      return 'big';
    }
    if (this.roomInfoService.activeRoom()?.joinInfoMode !== 'auto') {
      return this.roomInfoService.activeRoom()?.joinInfoMode || 'small';
    }
    const roomMode = this.roomInfoService.activeRoomMode();
    if (roomMode === 'poll') {
      return this.roomInfoService.activeQuestions().length === 0 ? 'big' : 'small';
    } else if (roomMode === 'presentation') {
      return this.roomInfoService.activePresentationSlides().length === 0 ? 'big' : 'small';
    } else if (roomMode === 'blank') {
      return 'none';
    }
    return 'small';
  });
  joinLink = computed(() => {
    const activeRoom = this.roomInfoService.activeRoom();
    if (!activeRoom) {
      return '';
    }
    return SHORT_LINK_BASE + '/' + activeRoom.slug;
  });
}
