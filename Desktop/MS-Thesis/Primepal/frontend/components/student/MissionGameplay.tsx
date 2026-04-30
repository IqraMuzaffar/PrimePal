'use client';

import { useState, useCallback } from 'react';
import QuestionTimer from './QuestionTimer';
import TaskRouter from './tasks/TaskRouter';
import { motion } from 'framer-motion';
import { MissionQuestion, getTimerSeconds } from '@/types/missions';

interface MissionGameplayProps {
  questions: MissionQuestion[];
  pillar?: string;
  onComplete: (results: GameResult[]) => void;
}

interface GameResult {
  question_id: number;
  is_correct: boolean;
  time_remaining: number;
  task_type: string;
}

export default function MissionGameplay({ questions, onComplete }: MissionGameplayProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<GameResult[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [timerKey, setTimerKey] = useState(0);

  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;
  const taskType = currentQuestion?.task_type ?? currentQuestion?.type ?? 'multiple_choice';
  const timerSeconds = getTimerSeconds(taskType);

  const advance = useCallback((newResults: GameResult[]) => {
    if (isLastQuestion) {
      onComplete(newResults);
    } else {
      setCurrentIndex(currentIndex + 1);
      setShowFeedback(false);
      setTimerKey(k => k + 1);
    }
  }, [currentIndex, isLastQuestion, onComplete]);

  const handleAnswer = useCallback((answer: string, isCorrect: boolean) => {
    const result: GameResult = {
      question_id: currentQuestion.id,
      is_correct: isCorrect,
      time_remaining: 0,
      task_type: taskType,
    };

    const newResults = [...results, result];
    setResults(newResults);
    setShowFeedback(true);

    setTimeout(() => advance(newResults), 2000);
  }, [currentQuestion, taskType, results, advance]);

  const handleTimeUp = useCallback(() => {
    handleAnswer('', false);
  }, [handleAnswer]);

  if (!currentQuestion) return null;

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
          key={timerKey}
          initialSeconds={timerSeconds}
          onTimeUp={handleTimeUp}
        />

        {/* Task */}
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-lg sm:rounded-2xl p-3 sm:p-8 shadow-lg mb-3 sm:mb-6 flex-shrink-0"
        >
          <TaskRouter
            question={currentQuestion}
            onAnswer={handleAnswer}
            showFeedback={showFeedback}
            disabled={showFeedback}
          />
        </motion.div>

        {/* Skip Button */}
        {!showFeedback && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleAnswer('', false)}
            className="mx-auto px-4 sm:px-6 py-2 bg-gray-400 text-white rounded-lg font-semibold text-xs sm:text-sm hover:bg-gray-500 transition flex-shrink-0"
          >
            Skip Question
          </motion.button>
        )}
      </div>
    </div>
  );
}
