import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiRoomInfoShort } from '../../model/rooms';
import { ApiResponse } from '../../model/api';
import { RoomClientService } from '../../service/room-client-service';

@Component({
  imports: [FormsModule, RouterLink],
  selector: 'app-join-room',
  styleUrl: './join-room.css',
  templateUrl: './join-room.html',
})
export class JoinRoom {
  private roomCode: string = '';

  private router = inject(Router);
  private roomClientService = inject(RoomClientService);

  joinRoom() {
    if (this.roomCode.trim() === '') {
      this.roomClientService.roomJoinError.set('Please enter a room code.');
      return;
    }
    this.roomClientService.joinRoomBySlug(this.roomCode, (success: boolean) => {
      if (success) {
        this.router.navigate(['/room', this.roomCode.toLowerCase()]);
      }
    });
  }
}
