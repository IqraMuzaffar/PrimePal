'use client';

import { useState } from 'react';
import { TaskProps } from '@/types/missions';
import AudioPlayButton from '../shared/AudioPlayButton';
import { motion } from 'framer-motion';

export default function ListenAndSpell({ question, onAnswer, showFeedback, disabled }: TaskProps) {
  const [input, setInput] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (disabled || submitted || !input.trim()) return;
    setSubmitted(true);
    const isCorrect = input.trim().toLowerCase() === (question.correct_answer ?? '').toLowerCase();
    onAnswer(input.trim(), isCorrect);
  };

  return (
    <div>
      <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 leading-tight">Listen and spell the word</h2>
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 mb-6 border-2 border-indigo-200">
        <div className="flex justify-center">
          <AudioPlayButton text={question.audio_text ?? ''} autoPlay size="lg" />
        </div>
      </div>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        disabled={disabled || showFeedback}
        placeholder="Type the word..."
        autoComplete="off"
        className="w-full p-4 text-center text-xl font-bold border-2 border-gray-300 rounded-xl focus:border-indigo-500 focus:outline-none disabled:bg-gray-100 mb-4"
      />
      {showFeedback && (
        <p className={`text-center text-sm font-medium mb-4 ${
          input.trim().toLowerCase() === (question.correct_answer ?? '').toLowerCase()
            ? 'text-green-700' : 'text-red-700'
        }`}>
          Correct spelling: {question.correct_answer}
        </p>
      )}
      {!showFeedback && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSubmit}
          disabled={disabled || submitted || !input.trim()}
          className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          Check Spelling
        </motion.button>
      )}
    </div>
  );
}
