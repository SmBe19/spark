export type RoomMode = 'poll' | 'presentation' | 'stream' | 'timer' | 'blank';

export type PreviewRoomMode = 'poll' | 'presentation' | 'stream' | 'timer' | 'poll-archive';

export type JoinInfoMode = 'auto' | 'none' | 'small' | 'big';

export interface ApiRoomInfoShort {
  id: string;
  slug: string;
  name: string;
}

export interface ApiRoomInfo extends RoomInfoShort {
  active_poll_id: string;
  active_poll: string;
  active_presentation: string;
  active_timer_end_time_s: number;
  active_mode: RoomMode;
  active_question_index: number;
  active_slide_index: number;
  join_info_mode: JoinInfoMode;
  stream: ApiStream;
}

export type PartialApiRoomInfo = Partial<Omit<ApiRoomInfo, 'stream'>> & {
  stream?: PartialApiStream;
};

export interface ApiStream {
  active_stream_id: string;
  channels: ApiStreamChannels;
  stream_to_clients: boolean;
  webrtc_streaming: boolean;
  webrtc_bitrate_kbps: number;
  frame_preview_interval_ms: number;
}

export type PartialApiStream = Partial<Omit<ApiStream, 'channels'>> & {
  channels?: PartialApiStreamChannels;
};

export interface ApiStreamChannels {
  '1': string;
  '2': string;
  '3': string;
  '4': string;
  '5': string;
  '6': string;
  '7': string;
  '8': string;
  '9': string;
}

export type PartialApiStreamChannels = Partial<ApiStreamChannels>;

export type RoomInfoShort = ApiRoomInfoShort;

export interface RoomInfo extends RoomInfoShort {
  activePollId: string;
  activePoll: string;
  activePresentation: string;
  activeTimerEndTimeMs: number;
  activeMode: RoomMode;
  activeQuestionIndex: number;
  activeSlideIndex: number;
  joinInfoMode: JoinInfoMode;
  stream: Stream;
}

export interface Stream {
  activeStreamId: string;
  channels: StreamChannels;
  streamToClients: boolean;
  webrtcStreaming: boolean;
  webrtcBitrateKbps: number;
  framePreviewIntervalMs: number;
}

export interface StreamChannels {
  '1': string;
  '2': string;
  '3': string;
  '4': string;
  '5': string;
  '6': string;
  '7': string;
  '8': string;
  '9': string;
}

export function mergePartialApiRoomInfo(base: RoomInfo, update: PartialApiRoomInfo): RoomInfo {
  const merged: RoomInfo = { ...base };
  if (update.id !== undefined) {
    merged.id = update.id;
  }
  if (update.slug !== undefined) {
    merged.slug = update.slug;
  }
  if (update.name !== undefined) {
    merged.name = update.name;
  }
  if (update.active_poll_id !== undefined) {
    merged.activePollId = update.active_poll_id;
  }
  if (update.active_poll !== undefined) {
    merged.activePoll = update.active_poll;
  }
  if (update.active_presentation !== undefined) {
    merged.activePresentation = update.active_presentation;
  }
  if (update.active_timer_end_time_s !== undefined) {
    merged.activeTimerEndTimeMs = update.active_timer_end_time_s * 1000;
  }
  if (update.active_mode !== undefined) {
    merged.activeMode = update.active_mode;
  }
  if (update.active_question_index !== undefined) {
    merged.activeQuestionIndex = update.active_question_index;
  }
  if (update.active_slide_index !== undefined) {
    merged.activeSlideIndex = update.active_slide_index;
  }
  if (update.join_info_mode !== undefined) {
    merged.joinInfoMode = update.join_info_mode;
  }
  if (update.stream !== undefined) {
    if (update.stream.active_stream_id !== undefined) {
      merged.stream.activeStreamId = update.stream.active_stream_id;
    }
    if (update.stream.stream_to_clients !== undefined) {
      merged.stream.streamToClients = update.stream.stream_to_clients;
    }
    if (update.stream.webrtc_streaming !== undefined) {
      merged.stream.webrtcStreaming = update.stream.webrtc_streaming;
    }
    if (update.stream.webrtc_bitrate_kbps !== undefined) {
      merged.stream.webrtcBitrateKbps = update.stream.webrtc_bitrate_kbps;
    }
    if (update.stream.frame_preview_interval_ms !== undefined) {
      merged.stream.framePreviewIntervalMs = update.stream.frame_preview_interval_ms;
    }
    if (update.stream.channels !== undefined) {
      merged.stream.channels = { ...merged.stream.channels, ...update.stream.channels };
    }
  }
  return merged;
}

export function mapApiRoomInfoToRoomInfo(apiRoomInfo: ApiRoomInfo): RoomInfo {
  return {
    id: apiRoomInfo.id,
    slug: apiRoomInfo.slug,
    name: apiRoomInfo.name,
    joinInfoMode: apiRoomInfo.join_info_mode,
    activePollId: apiRoomInfo.active_poll_id,
    activePoll: apiRoomInfo.active_poll,
    activePresentation: apiRoomInfo.active_presentation,
    activeMode: apiRoomInfo.active_mode,
    activeQuestionIndex: apiRoomInfo.active_question_index,
    activeTimerEndTimeMs: apiRoomInfo.active_timer_end_time_s * 1000,
    activeSlideIndex: apiRoomInfo.active_slide_index,
    stream: {
      activeStreamId: apiRoomInfo.stream.active_stream_id,
      channels: apiRoomInfo.stream.channels,
      streamToClients: apiRoomInfo.stream.stream_to_clients,
      webrtcStreaming: apiRoomInfo.stream.webrtc_streaming,
      webrtcBitrateKbps: apiRoomInfo.stream.webrtc_bitrate_kbps,
      framePreviewIntervalMs: apiRoomInfo.stream.frame_preview_interval_ms,
    },
  };
}

export function mapApiRoomInfoShortToRoomInfoShort(
  apiRoomInfoShort: ApiRoomInfoShort,
): RoomInfoShort {
  return apiRoomInfoShort;
}

export function mapRoomModeToPreviewRoomMode(mode: RoomMode | undefined): PreviewRoomMode {
  if (!mode || mode === 'blank') {
    return 'poll';
  }
  return mode;
}
