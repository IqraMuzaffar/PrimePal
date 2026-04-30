'use client';

import { motion } from 'framer-motion';

interface WordChipProps {
  word: string;
  selected?: boolean;
  correct?: boolean | null;
  showFeedback?: boolean;
  disabled?: boolean;
  onTap?: () => void;
}

export default function WordChip({ word, selected, correct, showFeedback, disabled, onTap }: WordChipProps) {
  let classes = 'bg-white border-gray-300 text-gray-800';

  if (showFeedback && correct === true) {
    classes = 'bg-green-100 border-green-500 text-green-800';
  } else if (showFeedback && correct === false) {
    classes = 'bg-red-100 border-red-500 text-red-800';
  } else if (selected) {
    classes = 'bg-indigo-100 border-indigo-500 text-indigo-800';
  }

  return (
    <motion.button
      whileHover={!disabled ? { scale: 1.05 } : {}}
      whileTap={!disabled ? { scale: 0.95 } : {}}
      onClick={() => !disabled && onTap?.()}
      disabled={disabled}
      className={`px-4 py-2 rounded-lg border-2 font-semibold text-sm transition-all ${classes} disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {word}
    </motion.button>
  );
}
