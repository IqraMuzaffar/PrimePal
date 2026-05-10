'use client';

import { TaskProps } from '@/types/missions';
import MissionRecorder from '../shared/MissionRecorder';

export default function WhatIsThis({ question, onAnswer, showFeedback, disabled }: TaskProps) {
  const handleResult = (isCorrect: boolean, transcription: string) => {
    onAnswer(transcription, isCorrect);
  };

  return (
    <div>
      <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 leading-tight">What is this? Say it!</h2>
      <div className="flex justify-center mb-6">
        <span className="text-8xl">{question.image_context ?? '❓'}</span>
      </div>
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
