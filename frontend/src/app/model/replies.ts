export interface ApiQuestionReply {
  reply: string;
  question_index: number;
  user_hash: string;
}

export interface QuestionReply {
  reply: string;
  questionIndex: number;
  userHash: string;
}

export function mapApiQuestionReplyToQuestionReply(
  apiQuestionReply: ApiQuestionReply,
): QuestionReply {
  return {
    reply: apiQuestionReply.reply,
    questionIndex: apiQuestionReply.question_index,
    userHash: apiQuestionReply.user_hash,
  };
}
