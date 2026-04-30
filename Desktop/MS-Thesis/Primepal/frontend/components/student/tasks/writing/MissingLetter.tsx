'use client';

import { useState } from 'react';
import { TaskProps } from '@/types/missions';
import LetterGrid from '../shared/LetterGrid';

export default function MissingLetter({ question, onAnswer, showFeedback, disabled }: TaskProps) {
  const [selectedLetters, setSelectedLetters] = useState<string[]>([]);

  const blanks = (question.word_with_blanks ?? '').split('');
  const blankCount = blanks.filter(c => c === '_').length;

  const handleSelect = (letterKey: string) => {
    if (disabled || showFeedback) return;
    const newSelected = [...selectedLetters, letterKey];
    setSelectedLetters(newSelected);

    if (newSelected.length >= blankCount) {
      const filledLetters = newSelected.map(k => k.split('_')[0]);
      let result = question.word_with_blanks ?? '';
      for (const letter of filledLetters) {
        result = result.replace('_', letter);
      }
      const isCorrect = result.toLowerCase() === (question.correct_answer ?? '').toLowerCase();
      onAnswer(result, isCorrect);
    }
  };

  const displayWord = () => {
    let blankIdx = 0;
    const filledLetters = selectedLetters.map(k => k.split('_')[0]);
    return blanks.map((char, i) => {
      if (char === '_') {
        const filled = filledLetters[blankIdx];
        blankIdx++;
        return (
          <span key={i} className={`inline-block w-8 h-10 mx-1 border-b-2 text-center text-xl font-bold ${
            filled ? 'text-indigo-600 border-indigo-500' : 'border-gray-400'
          }`}>
            {filled ?? ''}
          </span>
        );
      }
      return <span key={i} className="text-xl font-bold text-gray-800">{char}</span>;
    });
  };

  return (
    <div>
      <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-2 leading-tight">{question.question}</h2>
      <div className="flex items-center justify-center gap-0 mb-6 py-4">
        {displayWord()}
      </div>
      {showFeedback && (
        <p className={`text-center text-sm font-medium mb-4 ${
          selectedLetters.length >= blankCount ? 'text-green-700' : 'text-gray-500'
        }`}>
          Answer: {question.correct_answer}
        </p>
      )}
      <LetterGrid
        letters={question.letter_options ?? []}
        selectedLetters={selectedLetters}
        disabled={disabled || showFeedback}
        onSelect={handleSelect}
      />
    </div>
  );
}
