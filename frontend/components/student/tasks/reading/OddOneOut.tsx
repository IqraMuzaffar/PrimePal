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
    const ca = (question.correct_answer ?? '').toLowerCase().trim();
    // Try ID match first, fall back to text match if LLM returned option text
    const idMatch = id.toLowerCase().trim() === ca;
    const opt = options.find(o => o.id === id);
    const textMatch = opt ? opt.text.toLowerCase().trim() === ca : false;
    onAnswer(id, idMatch || textMatch);
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
