export interface Poll {
  questions: PollQuestion[];
  pages: number[][];
}

export type PollType = 'options' | 'text' | 'rating' | 'estimate';

export type PollQuestion =
  OptionsPollQuestion | TextPollQuestion | RatingPollQuestion | EstimatePollQuestion;

interface PollQuestionBase {
  index: number;
  question: string;
  pollType: PollType;
  showResults: boolean;
  individualProgress: boolean;
  joinWithPrevious: boolean;
}

export interface OptionsPollQuestion extends PollQuestionBase {
  pollType: 'options';
  options: PollOption[];
  multiSelect: boolean;
}

export interface PollOption {
  index: number;
  option: string;
  correct: boolean;
}

export interface TextPollQuestion extends PollQuestionBase {
  pollType: 'text';
  maxLength: number | null;
}

export interface RatingPollQuestion extends PollQuestionBase {
  pollType: 'rating';
  maxRating: number;
}

export interface EstimatePollQuestion extends PollQuestionBase {
  pollType: 'estimate';
  minValue: number;
  maxValue: number;
}
