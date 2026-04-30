'use client';

import { useState } from 'react';
import { TaskProps } from '@/types/missions';
import WordChip from '../shared/WordChip';

export default function FillBlankWordBank({ question, onAnswer, showFeedback, disabled }: TaskProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const options = question.options ?? [];

  const handleTap = (id: string) => {
    if (disabled || showFeedback) return;
    setSelected(id);
    onAnswer(id, id === question.correct_answer);
  };

  return (
    <div>
      <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-6 leading-tight">{question.question}</h2>
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
