'use client';

import { useState } from 'react';
import QuestionTimer from './QuestionTimer';
import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';

interface Question {
  id: string;
  pillar: string;
  question_text: string;
  options?: string[];
  correct_answer: string;
  type: string;
}

interface MissionGameplayProps {
  questions: Question[];
  onComplete: (results: GameResult[]) => void;
}

interface GameResult {
  question_id: string;
  is_correct: boolean;
  time_remaining: number;
}

export default function MissionGameplay({ questions, onComplete }: MissionGameplayProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<GameResult[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(15);

  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;

  const handleTimeUp = () => {
    handleAnswer(null);
  };

  const handleAnswer = (answer: string | null) => {
    const isCorrect = answer === currentQuestion.correct_answer;

    const result: GameResult = {
      question_id: currentQuestion.id,
      is_correct: isCorrect,
      time_remaining: timeRemaining,
    };

    const newResults = [...results, result];
    setResults(newResults);
    setShowFeedback(true);
    setSelectedAnswer(answer);

    // Show feedback for 2 seconds, then advance
    const timeout = setTimeout(() => {
      if (isLastQuestion) {
        onComplete(newResults);
      } else {
        setCurrentIndex(currentIndex + 1);
        setShowFeedback(false);
        setSelectedAnswer(null);
        setTimeRemaining(15);
      }
    }, 2000);

    return () => clearTimeout(timeout);
  };

  return (
    <div className="h-[100dvh] bg-gradient-to-br from-slate-50 to-slate-100 p-3 sm:p-6 flex flex-col overflow-hidden">
      <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col">
        {/* Progress */}
        <div className="mb-3 sm:mb-6 flex-shrink-0">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs sm:text-sm font-semibold text-gray-700">
              Question {currentIndex + 1} of {questions.length}
            </span>
            <span className="text-xs sm:text-sm text-gray-600">
              {Math.round(((currentIndex + 1) / questions.length) * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-300 rounded-full h-2">
            <div
              className="h-2 bg-blue-600 rounded-full transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Timer */}
        <QuestionTimer 
          initialSeconds={15} 
          onTimeUp={handleTimeUp} 
        />

        {/* Question */}
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-lg sm:rounded-2xl p-3 sm:p-8 shadow-lg mb-3 sm:mb-6 flex-shrink-0"
        >
          <h2 className="text-base sm:text-xl lg:text-2xl font-bold text-gray-800 mb-3 sm:mb-6 leading-tight">{currentQuestion.question_text}</h2>

          {currentQuestion.options ? (
            <div className="space-y-2 sm:space-y-3">
              {currentQuestion.options.map((option, idx) => {
                const isCorrect = option === currentQuestion.correct_answer;
                const isSelected = option === selectedAnswer;

                let buttonClass = 'bg-white border-2 border-gray-300 text-gray-800';
                if (showFeedback) {
                  if (isCorrect) {
                    buttonClass = 'bg-green-100 border-2 border-green-500 text-green-800';
                  } else if (isSelected && !isCorrect) {
                    buttonClass = 'bg-red-100 border-2 border-red-500 text-red-800';
                  }
                }

                return (
                  <motion.button
                    key={idx}
                    whileHover={!showFeedback ? { scale: 1.02 } : {}}
                    whileTap={!showFeedback ? { scale: 0.98 } : {}}
                    onClick={() => !showFeedback && handleAnswer(option)}
                    disabled={showFeedback}
                    className={`w-full p-3 sm:p-4 rounded-lg font-semibold text-sm sm:text-lg transition-all ${buttonClass} disabled:cursor-not-allowed min-h-[52px] sm:min-h-auto flex items-center justify-center`}
                  >
                    <div className="flex items-center gap-2 sm:gap-3">
                      <span>{option}</span>
                      {showFeedback && isCorrect && <Check className="text-green-600" size={20} />}
                      {showFeedback && isSelected && !isCorrect && <X className="text-red-600" size={20} />}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-gray-600">
              <p className="mb-4 text-sm sm:text-base">Correct answer: {currentQuestion.correct_answer}</p>
            </div>
          )}
        </motion.div>

        {/* Skip Button (optional) */}
        {!showFeedback && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleAnswer(null)}
            className="mx-auto px-4 sm:px-6 py-2 bg-gray-400 text-white rounded-lg font-semibold text-xs sm:text-sm hover:bg-gray-500 transition flex-shrink-0"
          >
            Skip Question
          </motion.button>
        )}
      </div>
    </div>
  );
}
