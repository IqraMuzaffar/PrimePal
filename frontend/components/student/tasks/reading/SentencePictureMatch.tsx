'use client';

import { useState } from 'react';
import { TaskProps } from '@/types/missions';
import EmojiCard from '../shared/EmojiCard';

export default function SentencePictureMatch({ question, onAnswer, showFeedback, disabled }: TaskProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const options = question.image_options ?? [];

  const handleTap = (id: string) => {
    if (disabled || showFeedback) return;
    setSelected(id);
    const ca = (question.correct_answer ?? '').toLowerCase().trim();
    // Check by option ID first, fall back to text match in case LLM returned option
    // text instead of option ID in correct_answer (e.g. "cat" instead of "a")
    const idMatch = id.toLowerCase().trim() === ca;
    const opt = options.find(o => o.id === id);
    const textMatch = opt ? opt.text.toLowerCase().trim() === ca : false;
    onAnswer(id, idMatch || textMatch);
  };

  const isCorrectOption = (opt: { id: string; text: string }) => {
    const ca = (question.correct_answer ?? '').toLowerCase().trim();
    return opt.id.toLowerCase().trim() === ca || opt.text.toLowerCase().trim() === ca;
  };

  return (
    <div>
      <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 leading-tight">{question.question}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {options.map((opt) => (
          <EmojiCard
            key={opt.id}
            id={opt.id}
            emoji={opt.emoji ?? '❓'}
            label={opt.text}
            selected={selected === opt.id}
            isCorrect={isCorrectOption(opt)}
            showFeedback={showFeedback}
            disabled={disabled}
            onTap={handleTap}
          />
        ))}
      </div>
    </div>
  );
}
