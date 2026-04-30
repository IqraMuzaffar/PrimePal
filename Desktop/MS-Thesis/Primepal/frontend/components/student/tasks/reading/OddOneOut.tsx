'use client';

import { useState } from 'react';
import { TaskProps } from '@/types/missions';
import WordChip from '../shared/WordChip';

export default function OddOneOut({ question, onAnswer, showFeedback, disabled }: TaskProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const options = question.options ?? [];

  const handleTap = (id: string) => {
    if (disabled || showFeedback) return;
    setSelected(id);
    onAnswer(id, id === question.correct_answer);
  };

  return (
    <div>
      <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-2 leading-tight">{question.question}</h2>
      <p className="text-sm text-gray-500 mb-4">Tap the word that does NOT belong.</p>
      <div className="flex flex-wrap gap-3 justify-center">
        {options.map((opt) => (
          <WordChip
            key={opt.id}
            word={opt.text}
            selected={selected === opt.id}
            correct={showFeedback ? opt.id === question.correct_answer : null}
            showFeedback={showFeedback}
            disabled={disabled}
            onTap={() => handleTap(opt.id)}
          />
        ))}
      </div>
    </div>
  );
}
