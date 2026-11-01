import { ApiQuestionReply, mapApiQuestionReplyToQuestionReply, QuestionReply } from './replies';

export interface ApiArchivedPollShort {
  id: string;
  archived_at: number;
  poll: string;
}

export interface ApiArchivedPoll extends ApiArchivedPollShort {
  replies: ApiQuestionReply[];
}

export interface ArchivedPoll {
  id: string;
  archivedAtMs: number;
  poll: string;
  replies: QuestionReply[];
}

export function mapApiArchivedPollToArchivedPoll(apiArchivedPoll: ApiArchivedPoll): ArchivedPoll {
  return {
    id: apiArchivedPoll.id,
    archivedAtMs: apiArchivedPoll.archived_at * 1000,
    poll: apiArchivedPoll.poll,
    replies: apiArchivedPoll.replies.map(mapApiQuestionReplyToQuestionReply),
  };
}

export function mapApiArchivedPollShortToArchivedPoll(
  apiArchivedPollShort: ApiArchivedPollShort,
): ArchivedPoll {
  return {
    id: apiArchivedPollShort.id,
    archivedAtMs: apiArchivedPollShort.archived_at * 1000,
    poll: apiArchivedPollShort.poll,
    replies: [],
  };
}
