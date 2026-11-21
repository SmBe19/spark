import { computed, inject, Service, signal } from '@angular/core';
import { LocalStream, LocalStreamPreview } from '../model/streams';
import { RoomInfoService } from './room-info-service';

@Service()
export class LocalStreamService {
  streamCaptureSupported = !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);

  errorMessage = signal<string | null>(null);
  localStreams = signal<{ [key: string]: LocalStream }>({});
  streamIdToChannel = computed(() => {
    const activeRoom = this.roomInfoService.activeRoom();
    if (!activeRoom) {
      return {};
    }
    const mapping: { [key: string]: string } = {};
    for (const [channel, streamId] of Object.entries(activeRoom.stream.channels)) {
      mapping[streamId] = channel;
    }
    return mapping;
  });
  localStreamsArray = computed<LocalStreamPreview[]>(() => {
    const streamIdToChannel = this.streamIdToChannel();
    return Object.values(this.localStreams())
      .filter((stream) => stream.roomId === this.roomInfoService.activeRoomId())
      .map((stream) => ({
        id: stream.id,
        label: stream.label,
        channel: streamIdToChannel[stream.id],
        stream: stream.stream,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  });

  private roomInfoService = inject(RoomInfoService);

  async addLocalStream() {
    if (!this.streamCaptureSupported) {
      return;
    }
    const roomId = this.roomInfoService.activeRoomId();
    if (!roomId) {
      this.errorMessage.set('No active room to add stream to.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          frameRate: 30,
        },
        audio: false,
      });
      const streamId = crypto.randomUUID();
      const [videoTrack] = stream.getVideoTracks();
      const streamLabel = videoTrack.label || streamId;
      const videoElement = document.createElement('video');
      videoElement.srcObject = stream;
      videoElement.autoplay = true;
      videoElement.muted = true;
      videoElement.playsInline = true;
      this.localStreams.update((currentStreams) => ({
        ...currentStreams,
        [streamId]: {
          id: streamId,
          roomId,
          label: streamLabel,
          stream: stream,
          videoElement,
          canvas: document.createElement('canvas'),
        },
      }));
      videoTrack.addEventListener('ended', () => {
        this.stopLocalStream(streamId);
      });
      stream.addEventListener('inactive', () => {
        this.stopLocalStream(streamId);
      });
      this.errorMessage.set(null);
    } catch (error) {
      this.errorMessage.set('Error capturing local stream: ' + (error as Error).message);
    }
  }

  stopLocalStream(streamId: string) {
    this.localStreams.update((currentStreams) => {
      const streamToStop = currentStreams[streamId];
      if (streamToStop) {
        streamToStop.stream.getTracks().forEach((track) => track.stop());
      }
      const newStreams = { ...currentStreams };
      delete newStreams[streamId];
      return newStreams;
    });
  }
}
