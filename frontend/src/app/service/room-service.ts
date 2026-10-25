import { HttpClient } from '@angular/common/http';
import { inject, Service, signal } from '@angular/core';
import { ApiRoomInfo, ApiRoomInfoShort, RoomInfo, RoomInfoShort } from '../model/rooms';
import { ApiResponse } from '../model/api';
import { ApiQuestionAnswer, QuestionAnswer } from '../model/answers';
import { rxResource } from '@angular/core/rxjs-interop';
import { map, of } from 'rxjs';

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
            return {
              id: data.data.id,
              slug: data.data.slug,
              name: data.data.name,
              activePoll: data.data.active_poll,
              activeQuestionIndex: data.data.active_question_index,
            };
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
              return data.data.map((answer) => ({
                answer: answer.answer,
                questionIndex: answer.question_index,
                userHash: answer.user_hash,
              }));
            }
            return [];
          }),
        );
    },
  });

  private httpClient = inject(HttpClient);

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
    const roomId = this.activeRoom.value()!.id;
    this.httpClient
      .get<ApiResponse<ApiQuestionAnswer[]>>('/api/rooms/' + roomId + '/answers', {})
      .subscribe((data) => {
        if (data.success) {
          this.activeAnswers.set(
            data.data.map((answer) => ({
              answer: answer.answer,
              questionIndex: answer.question_index,
              userHash: answer.user_hash,
            })),
          );
        }
      });
  }

  createRoom(slug: string, name: string) {
    if (slug.trim() === '' || name.trim() === '') {
      return;
    }
    this.httpClient
      .post<ApiResponse<{ room_id: string }>>('/api/rooms', { slug, name })
      .subscribe((data) => {
        if (data.success) {
          this.loadRooms();
        }
      });
  }

  updateRoomMeta(roomId: string, slug: string, name: string) {
    this.httpClient
      .put<ApiResponse<null>>('/api/rooms/' + roomId, { slug, name })
      .subscribe((data) => {
        if (data.success) {
          this.loadRooms();
          this.reloadActiveRoom(roomId);
        }
      });
  }

  updateRoomActivePoll(roomId: string, poll: string) {
    this.httpClient
      .put<ApiResponse<null>>('/api/rooms/' + roomId, { active_poll: poll })
      .subscribe((data) => {
        this.reloadActiveRoom(roomId);
      });
  }

  updateRoomActiveQuestionIndex(roomId: string, index: number) {
    this.httpClient
      .put<ApiResponse<null>>('/api/rooms/' + roomId, { active_question_index: index })
      .subscribe((data) => {
        this.reloadActiveRoom(roomId);
      });
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

  private reloadActiveRoom(roomId: string) {
    if (this.activeRoomId() === roomId) {
      this.activeRoom.reload();
    }
  }
}
