'use client';

import { useState } from 'react';
import { TaskProps } from '@/types/missions';
import WordChip from '../shared/WordChip';
import { motion } from 'framer-motion';

export default function GuidedTranslation({ question, onAnswer, showFeedback, disabled }: TaskProps) {
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const wordBank = question.word_bank ?? [];

  const handleTapWord = (index: number) => {
    if (disabled || showFeedback || submitted) return;
    if (selectedIndices.includes(index)) {
      setSelectedIndices(selectedIndices.filter(i => i !== index));
    } else {
      setSelectedIndices([...selectedIndices, index]);
    }
  };

  const selectedWords = selectedIndices.map(i => wordBank[i]);

  const handleSubmit = () => {
    if (disabled || submitted) return;
    setSubmitted(true);
    const correctOrder = question.correct_order ?? [];
    const isCorrect = selectedWords.length === correctOrder.length &&
      selectedWords.every((w, i) => w === correctOrder[i]);
    onAnswer(selectedWords.join(' '), isCorrect);
  };

  const correctOrder = question.correct_order ?? [];

  return (
    <div>
      <div className="bg-amber-50 rounded-xl p-4 mb-4 border border-amber-200">
        <p className="text-xs font-semibold text-amber-700 mb-1">Translate this:</p>
        <p className="text-lg font-bold text-gray-800">{question.question}</p>
      </div>

      <div className="min-h-[48px] p-3 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300 mb-4 flex flex-wrap gap-2">
        {selectedIndices.length === 0 && (
          <span className="text-sm text-gray-400 italic">Tap words below to build your sentence...</span>
        )}
        {selectedIndices.map((idx) => (
          <WordChip
            key={`selected-${idx}`}
            word={wordBank[idx]}
            selected
            disabled={disabled || showFeedback}
            onTap={() => handleTapWord(idx)}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-2 justify-center mb-6">
        {wordBank.map((word, i) => (
          <WordChip
            key={`bank-${i}`}
            word={word}
            selected={selectedIndices.includes(i)}
            disabled={disabled || showFeedback || selectedIndices.includes(i)}
            onTap={() => handleTapWord(i)}
          />
        ))}
      </div>

      {showFeedback && (
        <div className={`p-3 rounded-lg text-sm font-medium mb-4 ${
          selectedWords.every((w, i) => w === correctOrder[i]) ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          Correct: {correctOrder.join(' ')}
        </div>
      )}

      {!showFeedback && selectedIndices.length > 0 && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSubmit}
          disabled={disabled || submitted}
          className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          Check Answer
        </motion.button>
      )}
    </div>
  );
}
