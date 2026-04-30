'use client';

import { motion } from 'framer-motion';

interface LetterGridProps {
  letters: string[];
  selectedLetters: string[];
  disabled: boolean;
  onSelect: (letter: string) => void;
}

export default function LetterGrid({ letters, selectedLetters, disabled, onSelect }: LetterGridProps) {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {letters.map((letter, i) => {
        const isSelected = selectedLetters.includes(letter + '_' + i);
        return (
          <motion.button
            key={`${letter}_${i}`}
            whileHover={!disabled ? { scale: 1.1 } : {}}
            whileTap={!disabled ? { scale: 0.9 } : {}}
            onClick={() => !disabled && !isSelected && onSelect(letter + '_' + i)}
            disabled={disabled || isSelected}
            className={`w-12 h-12 rounded-lg border-2 font-bold text-lg flex items-center justify-center transition-all ${
              isSelected
                ? 'bg-indigo-100 border-indigo-500 text-indigo-800 opacity-50'
                : 'bg-white border-gray-300 text-gray-800 hover:border-indigo-400'
            } disabled:cursor-not-allowed`}
          >
            {letter}
          </motion.button>
        );
      })}
    </div>
  );
}
