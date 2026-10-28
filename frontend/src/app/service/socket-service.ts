import { Service } from '@angular/core';
import { io, Socket } from 'socket.io-client';

@Service()
export class SocketService {
  socket: Socket;

  constructor() {
    this.socket = io();
  }
}
