'use client';

import { useState } from 'react';
import { TaskProps } from '@/types/missions';
import AudioPlayButton from '../shared/AudioPlayButton';
import EmojiCard from '../shared/EmojiCard';

export default function ListenAndChoose({ question, onAnswer, showFeedback, disabled }: TaskProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const options = question.image_options ?? [];

  const handleTap = (id: string) => {
    if (disabled || showFeedback) return;
    setSelected(id);
    onAnswer(id, id === question.correct_answer);
  };

  return (
    <div>
      <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 leading-tight">Listen and choose the right picture</h2>
      <div className="flex justify-center mb-6">
        <AudioPlayButton text={question.audio_text ?? ''} autoPlay size="lg" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {options.map((opt) => (
          <EmojiCard
            key={opt.id}
            id={opt.id}
            emoji={opt.emoji ?? '❓'}
            label={opt.text}
            selected={selected === opt.id}
            isCorrect={opt.id === question.correct_answer}
            showFeedback={showFeedback}
            disabled={disabled}
            onTap={handleTap}
          />
        ))}
      </div>
    </div>
  );
}
