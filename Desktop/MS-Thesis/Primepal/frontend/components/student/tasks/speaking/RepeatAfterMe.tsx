'use client';

import { TaskProps } from '@/types/missions';
import AudioPlayButton from '../shared/AudioPlayButton';
import MissionRecorder from '../shared/MissionRecorder';

export default function RepeatAfterMe({ question, onAnswer, showFeedback, disabled }: TaskProps) {
  const handleResult = (isCorrect: boolean, transcription: string) => {
    onAnswer(transcription, isCorrect);
  };

  return (
    <div>
      <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-2 leading-tight">Listen, then repeat!</h2>
      <div className="flex justify-center mb-4">
        <AudioPlayButton text={question.audio_text ?? question.correct_answer ?? ''} autoPlay size="lg" />
      </div>
      <p className="text-center text-gray-500 text-sm mb-4">Tap the play button to hear, then record yourself</p>
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
