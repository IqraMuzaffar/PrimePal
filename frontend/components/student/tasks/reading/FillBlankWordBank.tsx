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
    const ca = (question.correct_answer ?? '').toLowerCase().trim();
    const idMatch = id.toLowerCase().trim() === ca;
    const opt = options.find(o => o.id === id);
    const textMatch = opt ? opt.text.toLowerCase().trim() === ca : false;
    onAnswer(id, idMatch || textMatch);
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
            correct={showFeedback ? (opt.id.toLowerCase() === (question.correct_answer ?? '').toLowerCase().trim() || opt.text.toLowerCase().trim() === (question.correct_answer ?? '').toLowerCase().trim()) : null}
            showFeedback={showFeedback}
            disabled={disabled}
            onTap={() => handleTap(opt.id)}
          />
        ))}
      </div>
    </div>
  );
}
