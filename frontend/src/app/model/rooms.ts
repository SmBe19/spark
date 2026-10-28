export interface ApiRoomInfoShort {
  id: string;
  slug: string;
  name: string;
}

export interface ApiRoomInfo extends RoomInfoShort {
  active_poll: string;
  active_question_index: number;
  answers_visible: boolean;
  solutions_visible: boolean;
}

export type RoomInfoShort = ApiRoomInfoShort;

export interface RoomInfo extends RoomInfoShort {
  activePoll: string;
  activeQuestionIndex: number;
  answersVisible: boolean;
  solutionsVisible: boolean;
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
  if (apiRoomInfo.active_poll !== undefined) {
    mapped.activePoll = apiRoomInfo.active_poll;
  }
  if (apiRoomInfo.active_question_index !== undefined) {
    mapped.activeQuestionIndex = apiRoomInfo.active_question_index;
  }
  if (apiRoomInfo.answers_visible !== undefined) {
    mapped.answersVisible = apiRoomInfo.answers_visible;
  }
  if (apiRoomInfo.solutions_visible !== undefined) {
    mapped.solutionsVisible = apiRoomInfo.solutions_visible;
  }
  return mapped;
}

export function mapApiRoomInfoToRoomInfo(apiRoomInfo: ApiRoomInfo): RoomInfo {
  return {
    id: apiRoomInfo.id,
    slug: apiRoomInfo.slug,
    name: apiRoomInfo.name,
    activePoll: apiRoomInfo.active_poll,
    activeQuestionIndex: apiRoomInfo.active_question_index,
    answersVisible: apiRoomInfo.answers_visible,
    solutionsVisible: apiRoomInfo.solutions_visible,
  };
}
