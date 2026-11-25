import { inject, Service } from '@angular/core';
import { SocketService } from './socket-service';
import { ApiResponse } from '../model/api';

const SFU_REQUEST_TIMEOUT_MS = 15000;

@Service()
export class SfuSignallingService {
  private socketService = inject(SocketService);

  emit<T>(event: string, payload: unknown): Promise<ApiResponse<T>> {
    return new Promise((resolve) => {
      const timeout = window.setTimeout(
        () => resolve({ success: false, error: 'Timed out waiting for the server.' }),
        SFU_REQUEST_TIMEOUT_MS,
      );
      this.socketService.socket.emit(event, payload, (response: ApiResponse<T>) => {
        window.clearTimeout(timeout);
        resolve(response ?? { success: false, error: 'No response from the server.' });
      });
    });
  }
}
