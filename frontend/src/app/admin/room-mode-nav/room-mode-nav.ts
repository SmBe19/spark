import { NgClass } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RoomService } from '../../service/room-service';
import { RouterLink } from '@angular/router';
import { PreviewRoomMode, RoomMode } from '../../model/rooms';

@Component({
  imports: [NgClass, RouterLink],
  selector: 'app-room-mode-nav',
  styleUrl: './room-mode-nav.css',
  templateUrl: './room-mode-nav.html',
})
export class RoomModeNav {
  roomService = inject(RoomService);

  navItems: NavItem[] = [
    { label: 'Archive', previewMode: 'poll-archive' },
    { label: 'Poll', mode: 'poll', previewMode: 'poll' },
    { label: 'Presentation', mode: 'presentation', previewMode: 'presentation' },
    { label: 'Blank', mode: 'blank' },
  ];

  switchPreviewRoomMode(previewMode: PreviewRoomMode) {
    this.roomService.activePreviewRoomMode.set(previewMode);
  }

  switchRoomMode(mode: RoomMode) {
    this.roomService.updateRoomActiveMode(this.roomService.activeRoomId()!, mode);
  }
}

interface NavItem {
  label: string;
  mode?: RoomMode;
  previewMode?: PreviewRoomMode;
}
