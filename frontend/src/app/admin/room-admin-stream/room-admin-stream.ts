import { Component, computed, effect, HostListener, inject, signal } from '@angular/core';
import { RoomService } from '../../service/room-service';
import { form, FormField, min } from '@angular/forms/signals';
import { FormsModule } from '@angular/forms';
import { LocalStreamService } from '../../service/local-stream-service';
import { FrameStreamReceiverService } from '../../service/frame-stream-receiver-service';
import { FrameStreamSenderService } from '../../service/frame-stream-sender-service';
import { WebrtcPublisherService } from '../../service/webrtc-publisher-service';
import { WebrtcSubscriberService } from '../../service/webrtc-subscriber-service';
import { NgClass } from '@angular/common';
import { handleKeyboardEvent } from '../../util/keyboard/keyboard';

@Component({
  imports: [FormsModule, FormField, NgClass],
  selector: 'app-room-admin-stream',
  styleUrl: './room-admin-stream.css',
  templateUrl: './room-admin-stream.html',
})
export class RoomAdminStream {
  roomService = inject(RoomService);
  localStreamService = inject(LocalStreamService);
  frameStreamSenderService = inject(FrameStreamSenderService);
  frameStreamReceiverService = inject(FrameStreamReceiverService);
  webrtcPublisherService = inject(WebrtcPublisherService);
  webrtcSubscriberService = inject(WebrtcSubscriberService);

  errorMessage = computed(
    () =>
      this.localStreamService.errorMessage() ||
      this.frameStreamSenderService.errorMessage() ||
      this.webrtcPublisherService.errorMessage() ||
      this.webrtcSubscriberService.errorMessage(),
  );

  streamModel = signal({
    streamToClients: false,
    webrtcStreaming: false,
    webrtcBitrateKbps: 250,
    framePreviewIntervalMs: 1000,
  });
  streamForm = form(this.streamModel, (schemaPath) => {
    min(schemaPath.webrtcBitrateKbps, 1);
    min(schemaPath.framePreviewIntervalMs, 250);
  });
  dirtyValues = computed(() => {
    const streamSettings = this.streamModel();
    const activeRoom = this.roomService.activeRoom();
    if (!activeRoom) {
      return {
        webrtcBitrateKbps: false,
        framePreviewIntervalMs: false,
      };
    }
    return {
      webrtcBitrateKbps: streamSettings.webrtcBitrateKbps !== activeRoom.stream.webrtcBitrateKbps,
      framePreviewIntervalMs:
        streamSettings.framePreviewIntervalMs !== activeRoom.stream.framePreviewIntervalMs,
    };
  });
  anyDirtyValues = computed(() => {
    const dirtyValues = this.dirtyValues();
    return dirtyValues.webrtcBitrateKbps || dirtyValues.framePreviewIntervalMs;
  });
  activeStreamId = computed(() => this.roomService.activeRoom()?.stream.activeStreamId || '');
  hoveredStreamId = signal<string | null>(null);

  constructor() {
    effect(() => {
      const activeRoom = this.roomService.activeRoom();
      if (!activeRoom) {
        return;
      }
      this.streamModel.set({
        streamToClients: activeRoom.stream.streamToClients,
        webrtcStreaming: activeRoom.stream.webrtcStreaming,
        webrtcBitrateKbps: activeRoom.stream.webrtcBitrateKbps,
        framePreviewIntervalMs: activeRoom.stream.framePreviewIntervalMs,
      });
    });
  }

  updateStreamSettings() {
    const streamSettings = this.streamModel();
    this.roomService.updateActiveRoomSettings({
      stream: {
        stream_to_clients: streamSettings.streamToClients,
        webrtc_streaming: streamSettings.webrtcStreaming,
        webrtc_bitrate_kbps: streamSettings.webrtcBitrateKbps,
        frame_preview_interval_ms: streamSettings.framePreviewIntervalMs,
      },
    });
  }

  toggleStreamToClients() {
    const streamSettings = this.streamModel();
    this.roomService.updateActiveRoomSettings({
      stream: {
        stream_to_clients: !streamSettings.streamToClients,
      },
    });
  }

  toggleWebrtcStreaming() {
    const streamSettings = this.streamModel();
    this.roomService.updateActiveRoomSettings({
      stream: {
        webrtc_streaming: !streamSettings.webrtcStreaming,
      },
    });
  }

  assignChannel(streamId: string, channel: string) {
    const activeRoom = this.roomService.activeRoom();
    if (!activeRoom) {
      return;
    }
    const channelUpdate = {
      [channel]: streamId,
    };
    for (const [otherChannel, otherStreamId] of Object.entries(activeRoom.stream.channels)) {
      if (otherStreamId === streamId && otherChannel !== channel) {
        channelUpdate[otherChannel] = '';
      }
    }
    this.roomService.updateActiveRoomSettings({
      stream: {
        channels: channelUpdate,
      },
    });
  }

  activateStream(streamId: string) {
    this.roomService.updateActiveRoomSettings({
      stream: {
        active_stream_id: streamId,
      },
    });
  }

  hoverStream(streamId: string) {
    this.hoveredStreamId.set(streamId);
  }

  leaveStream(streamId: string) {
    if (this.hoveredStreamId() === streamId) {
      this.hoveredStreamId.set(null);
    }
  }

  @HostListener('window:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent) {
    handleKeyboardEvent(event, (event) => {
      if (event.key < '1' || event.key > '9') {
        return false;
      }
      const streamId = this.hoveredStreamId();
      if (!streamId) {
        return false;
      }
      this.assignChannel(streamId, event.key);
      return true;
    });
  }
}
