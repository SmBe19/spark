import { Component, inject } from '@angular/core';
import { ArchiveService } from '../../service/archive-service';
import { DatePipe, NgClass } from '@angular/common';
import { PollPreview } from '../poll-preview/poll-preview';

@Component({
  imports: [NgClass, DatePipe, PollPreview],
  selector: 'app-room-admin-archive',
  styleUrl: './room-admin-archive.css',
  templateUrl: './room-admin-archive.html',
})
export class RoomAdminArchive {
  archiveService = inject(ArchiveService);
}
