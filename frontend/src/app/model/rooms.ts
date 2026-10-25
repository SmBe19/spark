export interface ApiRoomInfoShort {
  id: string;
  slug: string;
  name: string;
}

export interface ApiRoomInfo extends RoomInfoShort {
  active_poll: string;
  active_question_index: number;
}

export type RoomInfoShort = ApiRoomInfoShort;

export interface RoomInfo extends RoomInfoShort {
  activePoll: string;
  activeQuestionIndex: number;
}
