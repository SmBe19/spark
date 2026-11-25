import { computed, inject, Service, signal } from '@angular/core';
import { ApiRemoteStream, RemoteStream, RemoteStreamPreview } from '../model/streams';
import { RoomInfoService } from './room-info-service';
import { SocketService } from './socket-service';
import { LocalStreamService } from './local-stream-service';

@Service()
export class FrameStreamReceiverService {
  private static readonly remoteStreamTimeoutMs = 10000;

  remoteStreams = signal<{ [key: string]: RemoteStream }>({});
  remoteStreamsArray = computed<RemoteStreamPreview[]>(() => {
    const streamIdToChannel = this.localStreamService.streamIdToChannel();
    return Object.values(this.remoteStreams())
      .filter((stream) => stream.roomId === this.roomInfoService.activeRoomId())
      .filter(
        (stream) =>
          stream.lastUpdateTimeMs > Date.now() - FrameStreamReceiverService.remoteStreamTimeoutMs,
      )
      .map((stream) => ({
        id: stream.id,
        label: stream.label,
        channel: streamIdToChannel[stream.id],
        currentPreviewFrame: stream.currentPreviewFrame,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  });

  private roomInfoService = inject(RoomInfoService);
  private socketService = inject(SocketService);
  private localStreamService = inject(LocalStreamService);

  constructor() {
    this.socketService.socket.on('stream_preview_frame', (data: ApiRemoteStream) => {
      this.applyRemoteStreamUpdate(data, false);
    });
    this.socketService.socket.on('stream_big_frame', (data: ApiRemoteStream) => {
      this.applyRemoteStreamUpdate(data, true);
    });
  }

  private applyRemoteStreamUpdate(data: ApiRemoteStream, bigFrame: boolean) {
    const roomId = this.roomInfoService.activeRoomId();
    if (!roomId) {
      return;
    }
    if (this.localStreamService.localStreams().hasOwnProperty(data.id)) {
      return;
    }
    this.remoteStreams.update((currentStreams) => {
      const currentStream = currentStreams[data.id] || {};
      const newPreviewFrame = currentStream?.currentPreviewFrame || data.current_frame;
      const frameUpdate: Partial<RemoteStream> = {};
      if (bigFrame) {
        frameUpdate.currentBigFrame = data.current_frame;
      }
      return {
        ...currentStreams,
        [data.id]: {
          ...currentStream,
          id: data.id,
          roomId,
          label: data.label,
          lastUpdateTimeMs: Date.now(),
          currentPreviewFrame: newPreviewFrame,
          ...frameUpdate,
        },
      };
    });
  }
}
