export interface ApiQuestionAnswer {
  answer: string;
  question_index: number;
  user_hash: string;
}

export interface QuestionAnswer {
  answer: string;
  questionIndex: number;
  userHash: string;
}

export function mapApiQuestionAnswerToQuestionAnswer(
  apiQuestionAnswer: ApiQuestionAnswer,
): QuestionAnswer {
  return {
    answer: apiQuestionAnswer.answer,
    questionIndex: apiQuestionAnswer.question_index,
    userHash: apiQuestionAnswer.user_hash,
  };
}
