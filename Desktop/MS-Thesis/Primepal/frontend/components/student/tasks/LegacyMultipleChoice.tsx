'use client';

import { useState } from 'react';
import { TaskProps } from '@/types/missions';
import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';

export default function LegacyMultipleChoice({ question, onAnswer, showFeedback, disabled }: TaskProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const handleAnswer = (answer: string) => {
    if (disabled || showFeedback) return;
    setSelected(answer);
    // Case-insensitive comparison and trim whitespace
    const isCorrect = answer.toLowerCase().trim() === (question.correct_answer ?? '').toLowerCase().trim();
    onAnswer(answer, isCorrect);
  };

  // Support both old format (string[] options) and new format (QuestionOption[])
  const options: { id: string; text: string }[] = (question.options ?? []).map((opt, idx) => {
    if (typeof opt === 'string') return { id: opt, text: opt };
    return { id: opt.id ?? String(idx), text: opt.text ?? String(opt) };
  });

  // For fill_blank without options, show text input
  if (!options.length) {
    return <FillBlankInput question={question} onAnswer={onAnswer} showFeedback={showFeedback} disabled={disabled} />;
  }

  return (
    <div>
      <h2 className="text-base sm:text-xl lg:text-2xl font-bold text-gray-800 mb-3 sm:mb-6 leading-tight">
        {question.question ?? question.question_text}
      </h2>
      <div className="space-y-2 sm:space-y-3">
        {options.map((opt) => {
          const isCorrect = opt.id === question.correct_answer || opt.text === question.correct_answer;
          const isSelected = opt.id === selected || opt.text === selected;

          let buttonClass = 'bg-white border-2 border-gray-300 text-gray-800';
          if (showFeedback) {
            if (isCorrect) buttonClass = 'bg-green-100 border-2 border-green-500 text-green-800';
            else if (isSelected) buttonClass = 'bg-red-100 border-2 border-red-500 text-red-800';
          }

          return (
            <motion.button
              key={opt.id}
              whileHover={!showFeedback ? { scale: 1.02 } : {}}
              whileTap={!showFeedback ? { scale: 0.98 } : {}}
              onClick={() => handleAnswer(opt.id)}
              disabled={disabled}
              className={`w-full p-3 sm:p-4 rounded-lg font-semibold text-sm sm:text-lg transition-all ${buttonClass} disabled:cursor-not-allowed min-h-[52px] flex items-center justify-center`}
            >
              <div className="flex items-center gap-2 sm:gap-3">
                <span>{opt.text}</span>
                {showFeedback && isCorrect && <Check className="text-green-600" size={20} />}
                {showFeedback && isSelected && !isCorrect && <X className="text-red-600" size={20} />}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function FillBlankInput({ question, onAnswer, showFeedback, disabled }: TaskProps) {
  const [input, setInput] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (disabled || submitted || !input.trim()) return;
    setSubmitted(true);
    const isCorrect = input.trim().toLowerCase() === (question.correct_answer ?? '').toLowerCase();
    onAnswer(input.trim(), isCorrect);
  };

  return (
    <div>
      <h2 className="text-base sm:text-xl font-bold text-gray-800 mb-4">{question.question ?? question.question_text}</h2>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        disabled={disabled || showFeedback}
        placeholder="Type your answer..."
        className="w-full p-3 text-center text-lg border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none disabled:bg-gray-100 mb-4"
      />
      {showFeedback && (
        <p className="text-center text-sm text-gray-600">Answer: {question.correct_answer}</p>
      )}
      {!showFeedback && (
        <button
          onClick={handleSubmit}
          disabled={disabled || submitted || !input.trim()}
          className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg disabled:opacity-50"
        >
          Submit
        </button>
      )}
    </div>
  );
}
