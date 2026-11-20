import { Component, computed, inject, signal } from '@angular/core';
import { SHORT_LINK_BASE } from '../../../consts';
import { RoomService } from '../../service/room-service';
import { NgClass } from '@angular/common';
import { QRCodeComponent } from 'angularx-qrcode';

@Component({
  imports: [NgClass, QRCodeComponent],
  selector: 'app-room-presenter-joininfo',
  styleUrl: './room-presenter-joininfo.css',
  templateUrl: './room-presenter-joininfo.html',
})
export class RoomPresenterJoininfo {
  roomService = inject(RoomService);

  joinInformationBigRequested = signal(false);
  joinInformationBig = computed(() => {
    if (this.joinInformationBigRequested()) {
      return true;
    }
    if (this.roomService.activeRoomMode() === 'poll') {
      return this.roomService.activeQuestions().length === 0;
    } else if (this.roomService.activeRoomMode() === 'presentation') {
      return !this.roomService.activeRoom()?.activePresentation;
    }
    return true;
  });
  joinLink = computed(() => {
    const activeRoom = this.roomService.activeRoom();
    if (!activeRoom) {
      return '';
    }
    return SHORT_LINK_BASE + '/' + activeRoom.slug;
  });
}
