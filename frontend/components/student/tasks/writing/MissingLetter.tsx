'use client';

import { useState, useMemo } from 'react';
import { TaskProps } from '@/types/missions';
import LetterGrid from '../shared/LetterGrid';

export default function MissingLetter({ question, onAnswer, showFeedback, disabled }: TaskProps) {
  const [selectedLetters, setSelectedLetters] = useState<string[]>([]);

  // Ensure word_with_blanks actually has blanks; if LLM filled them, regenerate
  const wordWithBlanks = useMemo(() => {
    const raw = question.word_with_blanks ?? '';
    if (raw.includes('_')) return raw;
    const ca = (question.correct_answer ?? '').toLowerCase();
    if (ca.length >= 2) {
      const chars = ca.split('');
      // Blank out ~1/3 of characters (at least 1)
      const numBlanks = Math.max(1, Math.floor(chars.length / 3));
      const positions: number[] = [];
      while (positions.length < numBlanks) {
        const p = Math.floor(Math.random() * chars.length);
        if (!positions.includes(p)) positions.push(p);
      }
      positions.forEach(p => { chars[p] = '_'; });
      return chars.join('');
    }
    return raw;
  }, [question.word_with_blanks, question.correct_answer]);

  const blanks = wordWithBlanks.split('');
  const blankCount = blanks.filter(c => c === '_').length;

  const handleSelect = (letterKey: string) => {
    if (disabled || showFeedback || blankCount === 0) return;
    const newSelected = [...selectedLetters, letterKey];
    setSelectedLetters(newSelected);

    if (newSelected.length >= blankCount) {
      const filledLetters = newSelected.map(k => k.split('_')[0]);
      let result = wordWithBlanks;
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
