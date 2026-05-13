'use client';

import { useState } from 'react';
import { TaskProps } from '@/types/missions';
import MissionRecorder from '../shared/MissionRecorder';
import { motion } from 'framer-motion';

export default function WhatIsThis({ question, onAnswer, showFeedback, disabled }: TaskProps) {
  const [transcription, setTranscription] = useState('');

  const handleResult = (isCorrect: boolean, transcript: string, _similarity: number) => {
    setTranscription(transcript);
    onAnswer(transcript, isCorrect);
  };

  return (
    <div>
      <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 leading-tight">What is this? Say it!</h2>
      <div className="flex justify-center mb-4">
        <span className="text-8xl">{question.image_context ?? '?'}</span>
      </div>

      {/* Format hint */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 mb-4 text-center">
        <p className="text-sm font-semibold text-amber-700">
          Say the name of what you see — or say <span className="italic">&ldquo;It is a [name]&rdquo;</span>
        </p>
      </div>

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
