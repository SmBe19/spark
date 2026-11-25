import { NgClass } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RoomService } from '../../service/room-service';
import { PreviewRoomMode, RoomMode } from '../../model/rooms';
import { RoomInfoService } from '../../service/room-info-service';
import { DirectStreamService } from '../../service/direct-stream-service';

@Component({
  imports: [NgClass],
  selector: 'app-room-mode-nav',
  styleUrl: './room-mode-nav.css',
  templateUrl: './room-mode-nav.html',
})
export class RoomModeNav {
  roomInfoService = inject(RoomInfoService);
  roomService = inject(RoomService);
  directStreamService = inject(DirectStreamService);

  navItems: NavItem[] = [
    { label: 'Archive', previewMode: 'poll-archive' },
    { label: 'Poll', mode: 'poll', previewMode: 'poll' },
    { label: 'Presentation', mode: 'presentation', previewMode: 'presentation' },
    { label: 'Stream', mode: 'stream', previewMode: 'stream' },
    { label: 'Timer', mode: 'timer', previewMode: 'timer' },
    { label: 'Blank', mode: 'blank' },
  ];

  switchPreviewRoomMode(previewMode: PreviewRoomMode) {
    this.roomService.activePreviewRoomMode.set(previewMode);
  }

  switchRoomMode(mode: RoomMode) {
    this.roomService.updateActiveRoomSettings({ active_mode: mode });
  }

  openPresenter() {
    const activeRoom = this.roomInfoService.activeRoom();
    if (!activeRoom) {
      return;
    }
    window.open(`/presenter/${activeRoom.slug}`);
  }
}

interface NavItem {
  label: string;
  mode?: RoomMode;
  previewMode?: PreviewRoomMode;
}
