import { computed, inject, Service, signal } from '@angular/core';
import {
  ApiRoomInfo,
  mapApiRoomInfoToRoomInfo,
  mapPartialApiRoomInfoToRoomInfo,
  RoomInfo,
} from '../model/rooms';
import { ApiResponse } from '../model/api';
import { SocketService } from './socket-service';
import { PollService } from './poll-service';

@Service()
export class RoomClientService {
  activeRoom = signal<RoomInfo | null>(null);
  activeRoomMode = computed(() => this.activeRoom()?.activeMode || 'poll');
  activePollParsed = computed(() => {
    const activeRoom = this.activeRoom();
    if (!activeRoom) {
      return null;
    }
    return this.pollService.parsePoll(activeRoom.activePoll);
  });
  activeQuestions = computed(() => {
    const activeRoom = this.activeRoom();
    const activePoll = this.activePollParsed();
    if (!activeRoom || !activePoll) {
      return [];
    }
    const activePage = this.pollService.getActivePage(
      activePoll.clientPages,
      activeRoom.activeQuestionIndex,
    );
    return activePage.map((index) => activePoll.questions[index]);
  });
  roomJoinError = signal<string | null>(null);

  private pollService = inject(PollService);
  private socketService = inject(SocketService);
  private userHash: string | null = null;

  constructor() {
    this.socketService.socket.on('room_update', (room: Partial<RoomInfo>) => {
      if (this.activeRoom()) {
        this.activeRoom.update((currentRoom) => {
          if (!currentRoom) {
            return null;
          }
          return { ...currentRoom, ...mapPartialApiRoomInfoToRoomInfo(room) };
        });
      }
    });

    if (localStorage.getItem('userHash')) {
      this.userHash = localStorage.getItem('userHash');
    } else {
      this.userHash = crypto.randomUUID();
      localStorage.setItem('userHash', this.userHash);
    }
  }

  joinRoomBySlug(slug: string, callback?: (success: boolean) => void) {
    if (this.activeRoom()?.slug === slug) {
      if (callback) {
        callback(true);
      }
      return;
    }
    this.socketService.socket.emit(
      'join_room',
      { slug: slug.toLowerCase() },
      (room: ApiResponse<ApiRoomInfo>) => {
        if (!room.success) {
          this.roomJoinError.set("Room '" + slug + "' not found.");
          if (callback) {
            callback(false);
          }
          return;
        }
        this.roomJoinError.set(null);
        if (callback) {
          callback(true);
        }
        this.activeRoom.set(mapApiRoomInfoToRoomInfo(room.data));
      },
    );
  }

  addReply(reply: string, questionIndex: number) {
    if (!this.activeRoom()) {
      throw new Error('No active room');
    }
    this.socketService.socket.emit('add_reply', {
      room_id: this.activeRoom()!.id,
      reply,
      question_index: questionIndex,
      user_hash: this.userHash,
    });
  }
}
