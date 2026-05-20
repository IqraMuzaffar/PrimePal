'use client';

import { useState } from 'react';
import { TaskProps } from '@/types/missions';
import AudioPlayButton from '../shared/AudioPlayButton';
import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';

export default function SimonSays({ question, onAnswer, showFeedback, disabled }: TaskProps) {
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

  const isCorrectOption = (id: string) => {
    const ca = (question.correct_answer ?? '').toLowerCase().trim();
    const opt = options.find(o => o.id === id);
    return id.toLowerCase().trim() === ca || (opt ? opt.text.toLowerCase().trim() === ca : false);
  };

  const getButtonClass = (id: string) => {
    if (showFeedback) {
      if (isCorrectOption(id)) return 'bg-green-100 border-green-500 text-green-800';
      if (id === selected) return 'bg-red-100 border-red-500 text-red-800';
    }
    if (id === selected) return 'bg-indigo-100 border-indigo-500 text-indigo-800';
    return 'bg-white border-gray-300 text-gray-800 hover:border-indigo-400';
  };

  return (
    <div>
      <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 leading-tight">Listen and do what it says!</h2>
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 mb-6 border-2 border-indigo-200">
        <div className="flex justify-center">
          <AudioPlayButton text={(question.audio_text ?? '').replace(/_+/g, ' ').replace(/\s{2,}/g, ' ').trim()} autoPlay size="lg" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {options.map((opt) => (
          <motion.button
            key={opt.id}
            whileHover={!disabled ? { scale: 1.03 } : {}}
            whileTap={!disabled ? { scale: 0.97 } : {}}
            onClick={() => handleTap(opt.id)}
            disabled={disabled}
            className={`p-4 rounded-xl border-2 font-semibold text-sm transition-all ${getButtonClass(opt.id)} disabled:cursor-not-allowed flex items-center justify-center gap-2`}
          >
            {opt.text}
            {showFeedback && isCorrectOption(opt.id) && <Check size={16} className="text-green-600" />}
            {showFeedback && opt.id === selected && !isCorrectOption(opt.id) && <X size={16} className="text-red-600" />}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
