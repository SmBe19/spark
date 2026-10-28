import { Component, computed, inject } from '@angular/core';
import { RoomClientService } from '../../service/room-client-service';
import { ActivatedRoute } from '@angular/router';
import { PollService } from '../../service/poll-service';
import { MarkdownComponent } from 'ngx-markdown';

@Component({
  imports: [MarkdownComponent],
  selector: 'app-room-client',
  styleUrl: './room-client.css',
  templateUrl: './room-client.html',
})
export class RoomClient {
  pollService = inject(PollService);
  roomClientService = inject(RoomClientService);
  activatedRoute = inject(ActivatedRoute);

  activePollParsed = computed(() => {
    const activeRoom = this.roomClientService.activeRoom();
    if (!activeRoom) {
      return null;
    }
    return this.pollService.parsePoll(activeRoom.activePoll);
  });
  activeQuestions = computed(() => {
    const activeRoom = this.roomClientService.activeRoom();
    const activePoll = this.activePollParsed();
    if (!activeRoom || !activePoll) {
      return [];
    }
    const activePage = this.pollService.getActivePage(
      activePoll.pages,
      activeRoom.activeQuestionIndex,
    );
    return activePage.map((index) => activePoll.questions[index]);
  });

  ngOnInit() {
    this.activatedRoute.paramMap.subscribe((params) => {
      const roomSlug = params.get('roomSlug');
      if (roomSlug) {
        this.roomClientService.joinRoomBySlug(roomSlug);
      }
    });
  }

  ratingValues(maxRating: number): number[] {
    return Array.from({ length: maxRating }, (_, i) => i + 1);
  }
}
