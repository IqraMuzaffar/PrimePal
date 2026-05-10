'use client';

import { useState } from 'react';
import { TaskProps } from '@/types/missions';
import MissionRecorder from '../shared/MissionRecorder';
import { motion } from 'framer-motion';

export default function FinishTheSentence({ question, onAnswer, showFeedback, disabled }: TaskProps) {
  const [transcription, setTranscription] = useState('');

  const handleResult = (isCorrect: boolean, transcript: string) => {
    setTranscription(transcript);
    onAnswer(transcript, isCorrect);
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
