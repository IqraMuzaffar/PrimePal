'use client';

import { useState, useCallback } from 'react';
import QuestionTimer from './QuestionTimer';
import TaskRouter from './tasks/TaskRouter';
import { motion, AnimatePresence } from 'framer-motion';
import { MissionQuestion, getTimerSeconds } from '@/types/missions';
import { Trophy, Star, ArrowRight } from 'lucide-react';

interface MissionGameplayProps {
  questions: MissionQuestion[];
  pillar?: string;
  onComplete: (results: GameResult[]) => void;
}

export interface GameResult {
  question_id: number;
  is_correct: boolean;
  time_remaining: number;
  task_type: string;
  points_value: number;
}

function ScorePopup({ points, isCorrect }: { points: number; isCorrect: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.3 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.3 }}
      transition={{
        type: "spring",
        stiffness: 500,
        damping: 20
      }}
      className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: [0, 1.2, 1] }}
        transition={{ type: "tween", duration: 0.5 }}
        className={`${
          isCorrect
            ? 'bg-gradient-to-br from-green-400 to-green-600'
            : 'bg-gradient-to-br from-red-400 to-red-600'
        } text-white rounded-3xl p-8 shadow-2xl flex flex-col items-center gap-4`}
      >
        <motion.div
          initial={{ rotate: -180, scale: 0 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="text-7xl"
        >
          {isCorrect ? '⭐' : '❌'}
        </motion.div>
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-4xl font-black"
        >
          {isCorrect ? `+${points}` : '0'}
        </motion.div>
        <motion.p
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-lg font-semibold"
        >
          {isCorrect ? 'Great Job! 🎉' : 'Try Again!'}
        </motion.p>
      </motion.div>
    </motion.div>
  );
}

function MissionSummary({ results, questions, onContinue }: {
  results: GameResult[];
  questions: MissionQuestion[];
  onContinue: () => void;
}) {
  const totalScore = results.reduce((sum, r) => sum + (r.is_correct ? r.points_value : 0), 0);
  const maxScore = questions.reduce((sum, q) => sum + (q.points_value || 10), 0);
  const correctCount = results.filter(r => r.is_correct).length;
  const pct = Math.round((totalScore / maxScore) * 100);

  let message = 'Keep practicing!';
  let emoji = '💪';
  if (pct >= 90) { message = 'Outstanding!'; emoji = '🏆'; }
  else if (pct >= 70) { message = 'Great job!'; emoji = '🌟'; }
  else if (pct >= 50) { message = 'Good effort!'; emoji = '👏'; }

  return (
    <div className="h-[100dvh] bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl p-8 shadow-xl max-w-md w-full text-center"
      >
        <div className="text-6xl mb-4">{emoji}</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">{message}</h2>
        <div className="flex items-center justify-center gap-2 mb-6">
          <Trophy className="text-yellow-500" size={24} />
          <span className="text-3xl font-black text-gray-800">{totalScore}</span>
          <span className="text-lg text-gray-400">/ {maxScore}</span>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          {correctCount} of {results.length} correct
        </p>

        <div className="grid grid-cols-5 gap-2 mb-6">
          {results.map((r, i) => (
            <div
              key={i}
              className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold mx-auto ${
                r.is_correct ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-500'
              }`}
            >
              {r.is_correct ? `+${r.points_value}` : '0'}
            </div>
          ))}
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onContinue}
          className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2"
        >
          Continue <ArrowRight size={18} />
        </motion.button>
      </motion.div>
    </div>
  );
}

export default function MissionGameplay({ questions, onComplete }: MissionGameplayProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<GameResult[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [_timerKey, setTimerKey] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [lastScore, setLastScore] = useState<{ points: number; isCorrect: boolean } | null>(null);

  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;
  const taskType = currentQuestion?.task_type ?? currentQuestion?.type ?? 'multiple_choice';
  const timerSeconds = getTimerSeconds(taskType);

  const runningScore = results.reduce((sum, r) => sum + (r.is_correct ? r.points_value : 0), 0);

  const advance = useCallback((_newResults: GameResult[]) => {
    if (isLastQuestion) {
      setShowSummary(true);
    } else {
      setCurrentIndex(prev => prev + 1);
      setShowFeedback(false);
      setTimerKey(k => k + 1);
      setLastScore(null);
    }
  }, [isLastQuestion]);

  const handleAnswer = useCallback((_answer: string, isCorrect: boolean) => {
    const pointsValue = currentQuestion.points_value || 10;
    const result: GameResult = {
      question_id: currentQuestion.id,
      is_correct: isCorrect,
      time_remaining: 0,
      task_type: taskType,
      points_value: pointsValue,
    };

    const newResults = [...results, result];
    setResults(newResults);
    setShowFeedback(true);
    setLastScore({ points: isCorrect ? pointsValue : 0, isCorrect });

    // Show feedback longer (2.5 seconds) so students can see the popup
    setTimeout(() => advance(newResults), 2500);
  }, [currentQuestion, taskType, results, advance]);

  const handleTimeUp = useCallback(() => {
    handleAnswer('', false);
  }, [handleAnswer]);

  if (showSummary) {
    return (
      <MissionSummary
        results={results}
        questions={questions}
        onContinue={() => onComplete(results)}
      />
    );
  }

  if (!currentQuestion) return null;

  return (
    <div className="h-[100dvh] bg-gradient-to-br from-slate-50 to-slate-100 p-3 sm:p-6 flex flex-col overflow-hidden">
      <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col">
        {/* Progress + Score */}
        <div className="mb-3 sm:mb-6 flex-shrink-0">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs sm:text-sm font-semibold text-gray-700">
              Question {currentIndex + 1} of {questions.length}
            </span>
            <div className="flex items-center gap-1">
              <Star className="text-yellow-500" size={14} />
              <span className="text-xs sm:text-sm font-bold text-gray-800">{runningScore}</span>
            </div>
          </div>
          <div className="w-full bg-gray-300 rounded-full h-2">
            <div
              className="h-2 bg-blue-600 rounded-full transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Timer - hide during feedback, remount on question change */}
        {!showFeedback && (
          <QuestionTimer
            key={`timer-${currentIndex}`}
            initialSeconds={timerSeconds}
            onTimeUp={handleTimeUp}
            paused={showFeedback}
          />
        )}

        {/* Task */}
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-lg sm:rounded-2xl p-3 sm:p-8 shadow-lg mb-3 sm:mb-6 flex-shrink-0 relative"
        >
          <AnimatePresence>
            {lastScore && (
              <ScorePopup points={lastScore.points} isCorrect={lastScore.isCorrect} />
            )}
          </AnimatePresence>

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
