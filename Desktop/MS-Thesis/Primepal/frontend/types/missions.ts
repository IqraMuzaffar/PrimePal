export interface QuestionOption {
  id: string;
  text: string;
  emoji?: string;
}

export interface MissionQuestion {
  id: number;
  task_type: string;
  pillar: string;
  question: string;
  difficulty: string;
  points_value: number;
  emoji_hint: string;
  correct_answer?: string;
  options?: QuestionOption[];
  passage?: string;
  audio_text?: string;
  image_context?: string;
  image_options?: QuestionOption[];
  word_bank?: string[];
  correct_order?: string[];
  word_with_blanks?: string;
  letter_options?: string[];
  sentence_start?: string;
  // Legacy compat
  type?: string;
  question_text?: string;
}

export interface TaskProps {
  question: MissionQuestion;
  onAnswer: (answer: string, isCorrect: boolean) => void;
  showFeedback: boolean;
  disabled: boolean;
}

export type TaskType =
  | 'sentence_picture_match' | 'odd_one_out' | 'fill_blank_word_bank' | 'passage_true_false'
  | 'sentence_scramble' | 'missing_letter' | 'guided_translation'
  | 'listen_and_choose' | 'simon_says' | 'listen_and_spell'
  | 'repeat_after_me' | 'what_is_this' | 'finish_the_sentence'
  | 'multiple_choice' | 'fill_blank';

export const TIMER_SECONDS: Record<string, number> = {
  passage_true_false: 30,
  sentence_scramble: 30,
  guided_translation: 30,
  listen_and_spell: 20,
  finish_the_sentence: 20,
  repeat_after_me: 20,
};

export const DEFAULT_TIMER = 15;

export function getTimerSeconds(taskType: string): number {
  return TIMER_SECONDS[taskType] ?? DEFAULT_TIMER;
}
