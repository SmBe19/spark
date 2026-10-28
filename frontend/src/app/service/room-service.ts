import { HttpClient } from '@angular/common/http';
import { inject, Service, signal } from '@angular/core';
import {
  ApiRoomInfo,
  ApiRoomInfoShort,
  mapApiRoomInfoToRoomInfo,
  mapPartialApiRoomInfoToRoomInfo,
  RoomInfo,
  RoomInfoShort,
} from '../model/rooms';
import { ApiResponse } from '../model/api';
import {
  ApiQuestionAnswer,
  mapApiQuestionAnswerToQuestionAnswer,
  QuestionAnswer,
} from '../model/answers';
import { rxResource, toObservable } from '@angular/core/rxjs-interop';
import { map, of } from 'rxjs';
import { SocketService } from './socket-service';

@Service()
export class RoomService {
  rooms = signal<RoomInfoShort[]>([]);
  activeRoomId = signal<string | null>(null);
  activeRoom = rxResource<RoomInfo | null, { activeRoomId: string | null }>({
    defaultValue: null,
    params: () => ({ activeRoomId: this.activeRoomId() }),
    stream: (params) => {
      const roomId = params.params.activeRoomId;
      if (!roomId) {
        return of(null);
      }
      return this.httpClient.get<ApiResponse<ApiRoomInfo>>('/api/rooms/' + roomId, {}).pipe(
        map((data) => {
          if (data.success) {
            return mapApiRoomInfoToRoomInfo(data.data);
          }
          return null;
        }),
      );
    },
  });
  loadAnswers = signal(false);
  activeAnswers = rxResource<
    QuestionAnswer[],
    { activeRoomId: string | null; loadAnswers: boolean }
  >({
    defaultValue: [],
    params: () => ({ activeRoomId: this.activeRoomId(), loadAnswers: this.loadAnswers() }),
    stream: (params) => {
      const roomId = params.params.activeRoomId;
      if (!roomId || !params.params.loadAnswers) {
        return of([]);
      }
      return this.httpClient
        .get<ApiResponse<ApiQuestionAnswer[]>>('/api/rooms/' + roomId + '/answers', {})
        .pipe(
          map((data) => {
            if (data.success) {
              return data.data.map((answer) => mapApiQuestionAnswerToQuestionAnswer(answer));
            }
            return [];
          }),
        );
    },
  });

  private httpClient = inject(HttpClient);
  private socketService = inject(SocketService);

  constructor() {
    this.socketService.socket.on('room_update', (room: Partial<RoomInfo>) => {
      if (this.activeRoom.hasValue() && this.activeRoom.value()) {
        this.activeRoom.update((currentRoom) => {
          if (!currentRoom) {
            return null;
          }
          return { ...currentRoom, ...mapPartialApiRoomInfoToRoomInfo(room) };
        });
      }
    });
    this.socketService.socket.on('answer_added', (answer: ApiQuestionAnswer) => {
      if (this.activeRoom.hasValue() && this.activeRoom.value() && this.loadAnswers()) {
        this.activeAnswers.update((currentAnswers) => {
          return [...currentAnswers, mapApiQuestionAnswerToQuestionAnswer(answer)];
        });
      }
    });
    toObservable(this.activeRoomId).subscribe((roomId) => {
      if (!roomId) {
        return;
      }
      this.socketService.socket.emit('join_room', { room_id: roomId });
      this.socketService.socket.emit('join_admin_room', { room_id: roomId });
    });
  }

  loadRooms() {
    this.httpClient.get<ApiResponse<ApiRoomInfoShort[]>>('/api/rooms', {}).subscribe((data) => {
      if (data.success) {
        this.rooms.set(data.data ?? []);
      }
    });
  }

  loadActiveRoomAnswers() {
    if (!this.activeRoom.hasValue() || !this.activeRoom.value()) {
      this.activeAnswers.set([]);
      return;
    }
    this.loadAnswers.set(true);
  }

  createRoom(slug: string, name: string) {
    if (slug.trim() === '' || name.trim() === '') {
      return;
    }
    this.httpClient
      .post<ApiResponse<{ room_id: string }>>('/api/rooms', { slug, name })
      .subscribe(() => {});
  }

  updateRoomMeta(roomId: string, slug: string, name: string) {
    this.httpClient
      .put<ApiResponse<null>>('/api/rooms/' + roomId, { slug, name })
      .subscribe((data) => {
        if (data.success) {
          this.loadRooms();
        }
      });
  }

  updateRoomActivePoll(roomId: string, poll: string) {
    this.httpClient
      .put<ApiResponse<null>>('/api/rooms/' + roomId, { active_poll: poll })
      .subscribe(() => {});
  }

  updateRoomActiveQuestionIndex(roomId: string, index: number) {
    this.httpClient
      .put<ApiResponse<null>>('/api/rooms/' + roomId, { active_question_index: index })
      .subscribe(() => {});
  }

  deleteRoom(roomId: string) {
    this.httpClient.delete<ApiResponse<null>>('/api/rooms/' + roomId, {}).subscribe((data) => {
      if (data.success) {
        this.loadRooms();
        if (this.activeRoomId() === roomId) {
          this.activeRoomId.set(null);
        }
      }
    });
  }
}
