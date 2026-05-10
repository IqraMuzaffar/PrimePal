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
    // Case-insensitive comparison and trim whitespace
    const isCorrect = id.toLowerCase().trim() === (question.correct_answer ?? '').toLowerCase().trim();
    onAnswer(id, isCorrect);
  };

  return (
    <div>
      <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 leading-tight">{question.question}</h2>
      <div className="grid grid-cols-2 gap-3">
        {options.map((opt) => (
          <EmojiCard
            key={opt.id}
            id={opt.id}
            emoji={opt.emoji ?? '❓'}
            label={opt.text}
            selected={selected === opt.id}
            isCorrect={opt.id.toLowerCase().trim() === (question.correct_answer ?? '').toLowerCase().trim()}
            showFeedback={showFeedback}
            disabled={disabled}
            onTap={handleTap}
          />
        ))}
      </div>
    </div>
  );
}
