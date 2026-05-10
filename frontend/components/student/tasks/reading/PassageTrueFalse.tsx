'use client';

import { useState } from 'react';
import { TaskProps } from '@/types/missions';
import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';

export default function PassageTrueFalse({ question, onAnswer, showFeedback, disabled }: TaskProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const handleTap = (value: string) => {
    if (disabled || showFeedback) return;
    setSelected(value);
    onAnswer(value, value.toLowerCase() === (question.correct_answer ?? '').toLowerCase().trim());
  };

  const isCorrectValue = (value: string) => value.toLowerCase() === (question.correct_answer ?? '').toLowerCase().trim();

  const getButtonClass = (value: string) => {
    if (showFeedback) {
      if (isCorrectValue(value)) return 'bg-green-100 border-green-500 text-green-800';
      if (value === selected) return 'bg-red-100 border-red-500 text-red-800';
    }
    if (value === selected) return 'bg-indigo-100 border-indigo-500 text-indigo-800';
    return 'bg-white border-gray-300 text-gray-800 hover:border-indigo-400';
  };

  return (
    <div>
      {question.passage && (
        <div className="bg-slate-50 rounded-xl p-4 mb-4 border border-slate-200">
          <p className="text-sm text-gray-700 leading-relaxed">{question.passage}</p>
        </div>
      )}
      <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 leading-tight">{question.question}</h2>
      <div className="flex gap-4 justify-center">
        {['true', 'false'].map((value) => (
          <motion.button
            key={value}
            whileHover={!disabled ? { scale: 1.05 } : {}}
            whileTap={!disabled ? { scale: 0.95 } : {}}
            onClick={() => handleTap(value)}
            disabled={disabled}
            className={`flex-1 sm:max-w-[150px] py-4 rounded-xl border-2 font-bold text-lg transition-all ${getButtonClass(value)} disabled:cursor-not-allowed`}
          >
            <div className="flex items-center justify-center gap-2">
              {value === 'true' ? <Check size={20} /> : <X size={20} />}
              {value === 'true' ? 'True' : 'False'}
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
