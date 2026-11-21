import { Component, computed, effect, inject, signal } from '@angular/core';
import { RoomService } from '../../service/room-service';
import { form, FormField, min } from '@angular/forms/signals';
import { FormsModule } from '@angular/forms';
import { StreamService } from '../../service/stream-service';
import { NgClass } from '@angular/common';

@Component({
  imports: [FormsModule, FormField, NgClass],
  selector: 'app-room-admin-stream',
  styleUrl: './room-admin-stream.css',
  templateUrl: './room-admin-stream.html',
})
export class RoomAdminStream {
  roomService = inject(RoomService);
  streamService = inject(StreamService);

  streamModel = signal({
    streamToClients: false,
    webrtcStreaming: false,
    webrtcBitrateKbps: 250,
    framePreviewIntervalMs: 1000,
  });
  streamForm = form(this.streamModel, (schemaPath) => {
    min(schemaPath.webrtcBitrateKbps, 1);
    min(schemaPath.framePreviewIntervalMs, 10);
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
    this.roomService.updateActiveRoomSettings({
      stream: {
        channels: {
          [channel]: streamId,
        },
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
}
