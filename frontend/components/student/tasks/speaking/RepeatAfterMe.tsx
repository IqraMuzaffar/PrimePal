'use client';

import { useState } from 'react';
import { TaskProps } from '@/types/missions';
import AudioPlayButton from '../shared/AudioPlayButton';
import MissionRecorder from '../shared/MissionRecorder';
import { motion } from 'framer-motion';

export default function RepeatAfterMe({ question, onAnswer, showFeedback, disabled }: TaskProps) {
  const [transcription, setTranscription] = useState('');

  const handleResult = (isCorrect: boolean, transcript: string, _similarity: number) => {
    setTranscription(transcript);
    onAnswer(transcript, isCorrect);
  };

  return (
    <div>
      <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-2 leading-tight">Listen, then repeat!</h2>
      <div className="flex justify-center mb-3">
        <AudioPlayButton text={(question.audio_text ?? question.correct_answer ?? '').replace(/_+/g, ' ').replace(/\s{2,}/g, ' ').trim()} autoPlay size="lg" />
      </div>

      {/* Format hint */}
      <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2 mb-3 text-center">
        <p className="text-xs font-semibold text-green-600 mb-0.5">Repeat this exactly:</p>
        <p className="text-base font-bold text-green-900">
          &ldquo;{question.audio_text ?? question.correct_answer ?? ''}&rdquo;
        </p>
      </div>

      <p className="text-center text-gray-500 text-sm mb-4">Tap play to hear, then record yourself</p>
      {!showFeedback && (
        <MissionRecorder
          expectedText={question.correct_answer ?? ''}
          disabled={disabled}
          onResult={handleResult}
        />
      )}
      {showFeedback && transcription && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 bg-indigo-50 border border-indigo-200 rounded-2xl px-4 py-3 text-center"
        >
          <p className="text-xs font-semibold text-indigo-500 mb-1">You said:</p>
          <p className="text-lg font-bold text-indigo-900 italic">&ldquo;{transcription}&rdquo;</p>
        </motion.div>
      )}
    </div>
  );
}
