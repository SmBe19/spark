import { ApiQuestionAnswer, QuestionAnswer } from './answers';

export interface ApiArchivedPoll {
  archived_at: number;
  poll: string;
  answers: ApiQuestionAnswer[];
}

export interface ArchivedPoll {
  archivedAt: number;
  poll: string;
  answers: QuestionAnswer[];
}
