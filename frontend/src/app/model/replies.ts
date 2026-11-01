export interface ApiQuestionReply {
  reply: string;
  question_index: number;
}

export interface QuestionReply {
  reply: string;
  questionIndex: number;
}

export function mapApiQuestionReplyToQuestionReply(
  apiQuestionReply: ApiQuestionReply,
): QuestionReply {
  return {
    reply: apiQuestionReply.reply,
    questionIndex: apiQuestionReply.question_index,
  };
}
