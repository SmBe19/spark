import { HttpClient } from '@angular/common/http';
import { computed, inject, Service, signal } from '@angular/core';
import {
  ApiRoomInfo,
  ApiRoomInfoShort,
  mapApiRoomInfoShortToRoomInfoShort,
  mapApiRoomInfoToRoomInfo,
  mapRoomModeToPreviewRoomMode,
  mergePartialApiRoomInfo,
  PartialApiRoomInfo,
  PreviewRoomMode,
  RoomInfo,
  RoomInfoShort,
} from '../model/rooms';
import { ApiResponse } from '../model/api';
import {
  ApiQuestionReply,
  mapApiQuestionReplyToQuestionReply,
  QuestionReply,
} from '../model/replies';
import { rxResource } from '@angular/core/rxjs-interop';
import { map, of } from 'rxjs';
import { SocketService } from './socket-service';

@Service()
export class RoomService {
  rooms = signal<RoomInfoShort[]>([]);
  activeRoom = signal<RoomInfo | null>(null);
  activePreviewRoomMode = signal<PreviewRoomMode>('poll');
  activeRoomId = computed(() => this.activeRoom()?.id || null);
  activeReplies = rxResource<QuestionReply[], { activeRoomId: string | null }>({
    defaultValue: [],
    params: () => ({ activeRoomId: this.activeRoomId() }),
    stream: (params) => {
      const roomId = params.params.activeRoomId;
      if (!roomId) {
        return of([]);
      }
      return this.httpClient
        .get<ApiResponse<ApiQuestionReply[]>>('/api/rooms/' + roomId + '/replies')
        .pipe(
          map((data) => {
            if (data.success) {
              return data.data.map((reply) => mapApiQuestionReplyToQuestionReply(reply));
            }
            return [];
          }),
        );
    },
  });

  private httpClient = inject(HttpClient);
  private socketService = inject(SocketService);

  constructor() {
    this.socketService.socket.on('room_update', (room: PartialApiRoomInfo) => {
      if (this.activeRoom()) {
        this.activeRoom.update((currentRoom) => {
          if (!currentRoom) {
            return null;
          }
          return mergePartialApiRoomInfo(currentRoom, room);
        });
      }
    });
    this.socketService.socket.on('new_reply', (reply: ApiQuestionReply) => {
      if (this.activeRoom()) {
        this.activeReplies.update((currentReplies) => {
          return [...currentReplies, mapApiQuestionReplyToQuestionReply(reply)];
        });
      }
    });
    this.socketService.socket.on('replies_archived', () => {
      this.activeReplies.set([]);
    });
  }

  loadRooms() {
    this.httpClient.get<ApiResponse<ApiRoomInfoShort[]>>('/api/rooms', {}).subscribe((data) => {
      if (data.success) {
        this.rooms.set(
          (data.data ?? [])
            .map(mapApiRoomInfoShortToRoomInfoShort)
            .sort((a, b) => a.slug.localeCompare(b.slug)),
        );
      }
    });
  }

  joinRoomById(roomId: string, callback?: (success: boolean) => void) {
    if (this.activeRoomId() === roomId) {
      if (callback) {
        callback(true);
      }
      return;
    }
    this.joinRoom({ room_id: roomId }, callback);
  }

  joinRoomBySlug(slug: string, callback?: (success: boolean) => void) {
    if (this.activeRoom()?.slug === slug) {
      if (callback) {
        callback(true);
      }
      return;
    }
    this.joinRoom({ slug: slug.toLowerCase() }, callback);
  }

  private joinRoom(
    roomFilter: { room_id?: string; slug?: string },
    callback?: (success: boolean) => void,
  ) {
    this.socketService.socket.emit('join_room', roomFilter);
    this.socketService.socket.emit(
      'join_admin_room',
      roomFilter,
      (room: ApiResponse<ApiRoomInfo>) => {
        if (!room.success) {
          if (callback) {
            callback(false);
          }
          return;
        }
        this.activeRoom.set(mapApiRoomInfoToRoomInfo(room.data));
        this.activePreviewRoomMode.set(mapRoomModeToPreviewRoomMode(this.activeRoom()?.activeMode));
        if (callback) {
          callback(true);
        }
      },
    );
  }

  createRoom(slug: string, name: string) {
    if (slug.trim() === '' || name.trim() === '') {
      return;
    }
    this.httpClient
      .post<ApiResponse<{ room_id: string }>>('/api/rooms', { slug, name })
      .subscribe(() => {
        this.loadRooms();
      });
  }

  updateRoomMeta(roomId: string, slug: string, name: string) {
    this.updateActiveRoomSettings({ slug, name }, () => {
      this.loadRooms();
    });
  }

  updateActiveRoomSettings(settings: PartialApiRoomInfo, callback: () => void = () => {}) {
    const roomId = this.activeRoomId();
    if (!roomId) {
      return;
    }
    this.httpClient.put<ApiResponse<null>>('/api/rooms/' + roomId, settings).subscribe(callback);
  }

  archivePoll(roomId: string) {
    this.httpClient
      .post<ApiResponse<null>>('/api/rooms/' + roomId + '/archive_poll', {})
      .subscribe(() => {});
  }

  deleteRoom(roomId: string) {
    this.httpClient.delete<ApiResponse<null>>('/api/rooms/' + roomId, {}).subscribe((data) => {
      if (data.success) {
        this.loadRooms();
        if (this.activeRoomId() === roomId) {
          this.activeRoom.set(null);
        }
      }
    });
  }
}
