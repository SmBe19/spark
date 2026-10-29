export type RoomMode = 'presentation' | 'poll';

export interface ApiRoomInfoShort {
  id: string;
  slug: string;
  name: string;
}

export interface ApiRoomInfo extends RoomInfoShort {
  active_poll_id: string;
  active_poll: string;
  active_presentation: string;
  active_mode: RoomMode;
  active_question_index: number;
}

export type RoomInfoShort = ApiRoomInfoShort;

export interface RoomInfo extends RoomInfoShort {
  activePollId: string;
  activePoll: string;
  activePresentation: string;
  activeMode: RoomMode;
  activeQuestionIndex: number;
}

export function mapPartialApiRoomInfoToRoomInfo(
  apiRoomInfo: Partial<ApiRoomInfo>,
): Partial<RoomInfo> {
  const mapped: Partial<RoomInfo> = {};
  if (apiRoomInfo.id !== undefined) {
    mapped.id = apiRoomInfo.id;
  }
  if (apiRoomInfo.slug !== undefined) {
    mapped.slug = apiRoomInfo.slug;
  }
  if (apiRoomInfo.name !== undefined) {
    mapped.name = apiRoomInfo.name;
  }
  if (apiRoomInfo.active_poll_id !== undefined) {
    mapped.activePollId = apiRoomInfo.active_poll_id;
  }
  if (apiRoomInfo.active_poll !== undefined) {
    mapped.activePoll = apiRoomInfo.active_poll;
  }
  if (apiRoomInfo.active_presentation !== undefined) {
    mapped.activePresentation = apiRoomInfo.active_presentation;
  }
  if (apiRoomInfo.active_mode !== undefined) {
    mapped.activeMode = apiRoomInfo.active_mode;
  }
  if (apiRoomInfo.active_question_index !== undefined) {
    mapped.activeQuestionIndex = apiRoomInfo.active_question_index;
  }
  return mapped;
}

export function mapApiRoomInfoToRoomInfo(apiRoomInfo: ApiRoomInfo): RoomInfo {
  return {
    id: apiRoomInfo.id,
    slug: apiRoomInfo.slug,
    name: apiRoomInfo.name,
    activePollId: apiRoomInfo.active_poll_id,
    activePoll: apiRoomInfo.active_poll,
    activePresentation: apiRoomInfo.active_presentation,
    activeMode: apiRoomInfo.active_mode,
    activeQuestionIndex: apiRoomInfo.active_question_index,
  };
}
