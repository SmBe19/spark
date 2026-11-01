import { computed, inject, Service, signal } from '@angular/core';
import {
  ApiArchivedPoll,
  ApiArchivedPollShort,
  ArchivedPoll,
  mapApiArchivedPollShortToArchivedPoll,
  mapApiArchivedPollToArchivedPoll,
} from '../model/archive';
import { rxResource } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { ApiResponse } from '../model/api';
import { map, of } from 'rxjs';
import { RoomService } from './room-service';
import { PollService } from './poll-service';

@Service()
export class ArchiveService {
  loadArchive = signal(false);
  activePollId = signal<string | null>(null);
  roomArchives = rxResource<ArchivedPoll[], { loadArchive: boolean; activeRoomId: string | null }>({
    defaultValue: [],
    params: () => ({
      loadArchive: this.loadArchive(),
      activeRoomId: this.roomService.activeRoomId(),
    }),
    stream: (params) => {
      const roomId = params.params.activeRoomId;
      if (!roomId || !params.params.loadArchive) {
        return of([]);
      }
      return this.httpClient
        .get<ApiResponse<ApiArchivedPollShort[]>>('/api/rooms/' + roomId + '/archived_polls')
        .pipe(
          map((data) => {
            if (data.success) {
              return data.data.map((archive) => mapApiArchivedPollShortToArchivedPoll(archive));
            }
            return [];
          }),
        );
    },
  });
  activeArchivedPoll = rxResource<ArchivedPoll | null, { activePollId: string | null }>({
    defaultValue: null,
    params: () => ({ activePollId: this.activePollId() }),
    stream: (params) => {
      const pollId = params.params.activePollId;
      if (!pollId) {
        return of(null);
      }
      return this.httpClient
        .get<ApiResponse<ApiArchivedPoll>>('/api/archived_polls/' + pollId)
        .pipe(
          map((data) => {
            if (data.success) {
              return mapApiArchivedPollToArchivedPoll(data.data);
            }
            return null;
          }),
        );
    },
  });
  activeArchivedPollParsed = computed(() =>
    this.pollService.parsePoll(this.activeArchivedPoll.value()?.poll || ''),
  );

  private httpClient = inject(HttpClient);
  private roomService = inject(RoomService);
  private pollService = inject(PollService);
}
