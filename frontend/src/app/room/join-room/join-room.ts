import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiRoomInfoShort } from '../../model/rooms';
import { ApiResponse } from '../../model/api';

@Component({
  imports: [FormsModule, RouterLink],
  selector: 'app-join-room',
  styleUrl: './join-room.css',
  templateUrl: './join-room.html',
})
export class JoinRoom {
  private roomCode: string = '';
  private errorMessage = signal('');

  private httpClient = inject(HttpClient);
  private router = inject(Router);

  joinRoom() {
    if (this.roomCode.trim() === '') {
      this.errorMessage.set('Please enter a room code.');
      return;
    }

    this.httpClient
      .get<ApiResponse<ApiRoomInfoShort>>('/api/rooms/slug/' + this.roomCode.toLowerCase(), {})
      .subscribe({
        next: (data) => {
          if (data.success) {
            this.router.navigate(['/room', data.data.id]);
          }
        },
        error: (error) => {
          this.errorMessage.set("Room '" + this.roomCode + "' not found.");
        },
      });
  }
}
