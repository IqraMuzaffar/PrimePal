'use client';

import { TaskProps } from '@/types/missions';
import MissionRecorder from '../shared/MissionRecorder';

export default function FinishTheSentence({ question, onAnswer, showFeedback, disabled }: TaskProps) {
  const handleResult = (isCorrect: boolean, transcription: string) => {
    onAnswer(transcription, isCorrect);
  };

  return (
    <div>
      <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-2 leading-tight">Finish this sentence!</h2>
      <div className="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-200">
        <p className="text-xl font-bold text-gray-800">
          {question.sentence_start ?? question.question}
          <span className="text-indigo-500"> ...</span>
        </p>
      </div>
      <p className="text-center text-gray-500 text-sm mb-4">Say the complete sentence out loud</p>
      {!showFeedback && (
        <MissionRecorder
          expectedText={question.correct_answer ?? ''}
          disabled={disabled}
          onResult={handleResult}
        />
      )}
    </div>
  );
}
