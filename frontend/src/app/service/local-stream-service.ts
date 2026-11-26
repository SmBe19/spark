import { computed, effect, inject, Service, signal } from '@angular/core';
import { CameraFacingMode, LocalStream, LocalStreamPreview } from '../model/streams';
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

  private videoHost: HTMLDivElement | null = null;

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
        isDisplayMedia: stream.isDisplayMedia,
        facingMode: stream.facingMode,
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

  async addLocalStream(settings: {
    displayMedia: boolean;
    clientStreaming?: boolean;
    facingMode?: CameraFacingMode;
  }) {
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
      const facingMode = settings.displayMedia ? undefined : (settings.facingMode ?? 'user');
      const stream = await this.getMediaStream(settings.displayMedia, facingMode);
      if (!stream) {
        this.errorMessage.set('No stream captured.');
        return;
      }
      const streamId = crypto.randomUUID();
      const [videoTrack] = stream.getVideoTracks();
      const streamLabel = videoTrack.label || streamId;
      const videoElement = await this.createVideoElement(stream);
      this.localStreams.update((currentStreams) => ({
        ...currentStreams,
        [streamId]: {
          id: streamId,
          roomId,
          label: streamLabel,
          clientStreaming: settings.clientStreaming ?? false,
          isDisplayMedia: settings.displayMedia,
          facingMode,
          stream: stream,
          videoElement,
          canvas: document.createElement('canvas'),
        },
      }));
      this.registerStreamEndListeners(streamId, stream, videoTrack);
      this.errorMessage.set(null);
    } catch (error) {
      this.errorMessage.set('Error capturing local stream: ' + (error as Error).message);
    }
  }

  async switchCamera(streamId: string, facingMode: CameraFacingMode) {
    const currentStream = this.localStreams()[streamId];
    if (!currentStream || currentStream.isDisplayMedia || currentStream.facingMode === facingMode) {
      return;
    }
    try {
      currentStream.stream.getTracks().forEach((track) => track.stop());
      currentStream.videoElement.remove();
      const stream = await this.getMediaStream(false, facingMode);
      if (!stream) {
        this.errorMessage.set('No stream captured.');
        return;
      }
      const [videoTrack] = stream.getVideoTracks();
      const videoElement = await this.createVideoElement(stream);
      this.registerStreamEndListeners(streamId, stream, videoTrack);
      this.localStreams.update((currentStreams) => {
        if (!currentStreams[streamId]) {
          return currentStreams;
        }
        return {
          ...currentStreams,
          [streamId]: {
            ...currentStreams[streamId],
            label: videoTrack.label || currentStreams[streamId].label,
            facingMode,
            stream,
            videoElement,
          },
        };
      });
      this.errorMessage.set(null);
    } catch (error) {
      this.errorMessage.set('Error switching camera: ' + (error as Error).message);
    }
  }

  private getMediaStream(displayMedia: boolean, facingMode?: CameraFacingMode) {
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
          ...(facingMode ? { facingMode: { ideal: facingMode } } : {}),
        },
        audio: false,
      });
    }
  }

  private async createVideoElement(stream: MediaStream) {
    const videoElement = document.createElement('video');
    videoElement.srcObject = stream;
    videoElement.autoplay = true;
    videoElement.muted = true;
    videoElement.playsInline = true;
    this.getVideoHost().appendChild(videoElement);
    await videoElement.play().catch(() => undefined);
    return videoElement;
  }

  private getVideoHost() {
    if (!this.videoHost) {
      const host = document.createElement('div');
      host.style.position = 'fixed';
      host.style.top = '0';
      host.style.left = '0';
      host.style.width = '1px';
      host.style.height = '1px';
      host.style.overflow = 'hidden';
      host.style.opacity = '0';
      host.style.pointerEvents = 'none';
      host.style.zIndex = '-1';
      host.setAttribute('aria-hidden', 'true');
      document.body.appendChild(host);
      this.videoHost = host;
    }
    return this.videoHost;
  }

  private registerStreamEndListeners(
    streamId: string,
    stream: MediaStream,
    videoTrack: MediaStreamTrack,
  ) {
    const stopIfCurrent = () => {
      if (this.localStreams()[streamId]?.stream === stream) {
        this.stopLocalStream(streamId);
      }
    };
    videoTrack.addEventListener('ended', stopIfCurrent);
    stream.addEventListener('inactive', stopIfCurrent);
  }

  stopLocalStream(streamId: string) {
    this.localStreams.update((currentStreams) => {
      const streamToStop = currentStreams[streamId];
      if (streamToStop) {
        streamToStop.stream.getTracks().forEach((track) => track.stop());
        streamToStop.videoElement.remove();
      }
      const newStreams = { ...currentStreams };
      delete newStreams[streamId];
      return newStreams;
    });
  }
}
