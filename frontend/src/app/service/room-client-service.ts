import { inject, Service, signal } from '@angular/core';
import { mapPartialApiRoomInfoToRoomInfo, RoomInfo } from '../model/rooms';
import { ApiResponse } from '../model/api';
import { SocketService } from './socket-service';

@Service()
export class RoomClientService {
  activeRoom = signal<RoomInfo | null>(null);

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

  joinRoomBySlug(slug: string) {
    this.socketService.socket.emit('join_room', { slug }, (room: ApiResponse<RoomInfo>) => {
      if (!room.success) {
        console.error('Failed to join room:', room.error);
        return;
      }
      this.activeRoom.set(room.data);
    });
  }

  addAnswer(answer: string, questionIndex: number) {
    if (!this.activeRoom()) {
      throw new Error('No active room');
    }
    this.socketService.socket.emit('add_answer', {
      room_id: this.activeRoom()!.id,
      answer,
      question_index: questionIndex,
      user_hash: this.userHash,
    });
  }
}
