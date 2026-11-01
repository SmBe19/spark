import { ApiQuestionReply, QuestionReply } from './replies';

export interface ApiArchivedPoll {
  archived_at: number;
  poll: string;
  replies: ApiQuestionReply[];
}

export interface ArchivedPoll {
  archivedAt: number;
  poll: string;
  replies: QuestionReply[];
}
