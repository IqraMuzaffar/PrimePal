'use client';

import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';

interface EmojiCardProps {
  id: string;
  emoji: string;
  label: string;
  selected: boolean;
  isCorrect?: boolean;
  showFeedback: boolean;
  disabled: boolean;
  onTap: (id: string) => void;
}

export default function EmojiCard({ id, emoji, label, selected, isCorrect, showFeedback, disabled, onTap }: EmojiCardProps) {
  let borderColor = 'border-gray-200';
  let bgColor = 'bg-white';

  if (showFeedback) {
    if (isCorrect) {
      borderColor = 'border-green-500';
      bgColor = 'bg-green-50';
    } else if (selected && !isCorrect) {
      borderColor = 'border-red-500';
      bgColor = 'bg-red-50';
    }
  } else if (selected) {
    borderColor = 'border-indigo-500';
    bgColor = 'bg-indigo-50';
  }

  return (
    <motion.button
      whileHover={!disabled ? { scale: 1.05 } : {}}
      whileTap={!disabled ? { scale: 0.95 } : {}}
      onClick={() => !disabled && onTap(id)}
      disabled={disabled}
      className={`relative flex flex-col items-center justify-center p-4 rounded-xl border-2 ${borderColor} ${bgColor} transition-all min-h-[100px] disabled:cursor-not-allowed`}
    >
      <span className="text-4xl mb-2">{emoji}</span>
      <span className="text-xs font-medium text-gray-600">{label}</span>
      {showFeedback && isCorrect && <Check className="absolute top-2 right-2 text-green-600" size={16} />}
      {showFeedback && selected && !isCorrect && <X className="absolute top-2 right-2 text-red-600" size={16} />}
    </motion.button>
  );
}
