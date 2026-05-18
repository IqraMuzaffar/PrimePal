'use client';

import { useState } from 'react';
import { TaskProps } from '@/types/missions';
import MissionRecorder from '../shared/MissionRecorder';
import { motion } from 'framer-motion';

export default function FinishTheSentence({ question, onAnswer, showFeedback, disabled }: TaskProps) {
  const [transcription, setTranscription] = useState('');

  const handleResult = (isCorrect: boolean, transcript: string, _similarity: number) => {
    setTranscription(transcript);
    onAnswer(transcript, isCorrect);
  };

  // Strip trailing "..." / "…" so the full sentence reads cleanly
  const sentenceStart = (question.sentence_start ?? question.question ?? '').replace(/\.{2,}$|…$/, '').trim();
  const fullSentence = sentenceStart
    ? `${sentenceStart} ${question.correct_answer ?? ''}`.trim()
    : (question.correct_answer ?? '');

  return (
    <div>
      <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-2 leading-tight">Finish this sentence!</h2>
      <div className="bg-slate-50 rounded-xl p-4 mb-3 border border-slate-200">
        <p className="text-xl font-bold text-gray-800">
          {question.sentence_start ?? question.question}
          <span className="text-indigo-500"> ...</span>
        </p>
      </div>

      {/* Format hint — tells the student to say the FULL sentence */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-2 mb-4 text-center">
        <p className="text-xs font-semibold text-indigo-500 mb-0.5">Say the complete sentence:</p>
        <p className="text-base font-bold text-indigo-900">&ldquo;{fullSentence}&rdquo;</p>
      </div>

      {!showFeedback && (
        <MissionRecorder
          expectedText={fullSentence}
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
