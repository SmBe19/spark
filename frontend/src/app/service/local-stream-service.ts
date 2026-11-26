import { computed, effect, inject, Service, signal } from '@angular/core';
import { LocalStream, LocalStreamPreview } from '../model/streams';
import { RoomInfoService } from './room-info-service';

@Service()
export class LocalStreamService {
  streamCaptureSupportedDisplayMedia = !!(
    navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia
  );
  streamCaptureSupportedUserMedia = !!(
    navigator.mediaDevices && navigator.mediaDevices.getUserMedia
  );
  streamCaptureSupported =
    this.streamCaptureSupportedDisplayMedia || this.streamCaptureSupportedUserMedia;

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

  constructor() {
    effect(() => {
      if (this.roomInfoService.activeRoom()?.stream.allowClientStreaming !== true) {
        for (const stream of Object.values(this.localStreams())) {
          if (stream.clientStreaming) {
            this.stopLocalStream(stream.id);
          }
        }
      }
    });
  }

  async addLocalStream(settings: { displayMedia: boolean; clientStreaming?: boolean }) {
    if (!this.streamCaptureSupported) {
      this.errorMessage.set('Stream capture is not supported in this browser.');
      return;
    }
    const roomId = this.roomInfoService.activeRoomId();
    if (!roomId) {
      this.errorMessage.set('No active room to add stream to.');
      return;
    }
    try {
      const stream = await this.getMediaStream(settings.displayMedia);
      if (!stream) {
        this.errorMessage.set('No stream captured.');
        return;
      }
      const streamId = crypto.randomUUID();
      const [videoTrack] = stream.getVideoTracks();
      const streamLabel = videoTrack.label || streamId;
      const videoElement = document.createElement('video');
      videoElement.srcObject = stream;
      videoElement.autoplay = true;
      videoElement.muted = true;
      videoElement.playsInline = true;
      await videoElement.play();
      this.localStreams.update((currentStreams) => ({
        ...currentStreams,
        [streamId]: {
          id: streamId,
          roomId,
          label: streamLabel,
          clientStreaming: settings.clientStreaming ?? false,
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

  private getMediaStream(displayMedia: boolean) {
    if (displayMedia) {
      return navigator.mediaDevices.getDisplayMedia({
        video: {
          frameRate: 30,
        },
        audio: false,
      });
    } else {
      return navigator.mediaDevices.getUserMedia({
        video: {
          frameRate: { ideal: 30, max: 30 },
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
        },
        audio: false,
      });
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
