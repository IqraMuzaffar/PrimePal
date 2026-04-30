'use client';

import { TaskProps } from '@/types/missions';
import SentencePictureMatch from './reading/SentencePictureMatch';
import OddOneOut from './reading/OddOneOut';
import FillBlankWordBank from './reading/FillBlankWordBank';
import PassageTrueFalse from './reading/PassageTrueFalse';
import SentenceScramble from './writing/SentenceScramble';
import MissingLetter from './writing/MissingLetter';
import GuidedTranslation from './writing/GuidedTranslation';
import ListenAndChoose from './listening/ListenAndChoose';
import SimonSays from './listening/SimonSays';
import ListenAndSpell from './listening/ListenAndSpell';
import RepeatAfterMe from './speaking/RepeatAfterMe';
import WhatIsThis from './speaking/WhatIsThis';
import FinishTheSentence from './speaking/FinishTheSentence';
import LegacyMultipleChoice from './LegacyMultipleChoice';

const TASK_COMPONENTS: Record<string, React.ComponentType<TaskProps>> = {
  sentence_picture_match: SentencePictureMatch,
  odd_one_out: OddOneOut,
  fill_blank_word_bank: FillBlankWordBank,
  passage_true_false: PassageTrueFalse,
  sentence_scramble: SentenceScramble,
  missing_letter: MissingLetter,
  guided_translation: GuidedTranslation,
  listen_and_choose: ListenAndChoose,
  simon_says: SimonSays,
  listen_and_spell: ListenAndSpell,
  repeat_after_me: RepeatAfterMe,
  what_is_this: WhatIsThis,
  finish_the_sentence: FinishTheSentence,
  multiple_choice: LegacyMultipleChoice,
  fill_blank: LegacyMultipleChoice,
};

export default function TaskRouter(props: TaskProps) {
  const taskType = props.question.task_type ?? props.question.type ?? 'multiple_choice';
  const Component = TASK_COMPONENTS[taskType] ?? LegacyMultipleChoice;
  return <Component {...props} />;
}
