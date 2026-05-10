'use client';

import { useState, useCallback } from 'react';
import QuestionTimer from './QuestionTimer';
import TaskRouter from './tasks/TaskRouter';
import { motion, AnimatePresence } from 'framer-motion';
import { MissionQuestion, getTimerSeconds } from '@/types/missions';
import { Star, ArrowRight } from 'lucide-react';

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

function Confetti() {
  const colors = ['#f59e0b', '#10b981', '#3b82f6', '#f43f5e', '#a855f7', '#fbbf24'];
  return (
    <div className="fixed inset-0 pointer-events-none z-[200] overflow-hidden">
      {Array.from({ length: 24 }).map((_, i) => (
        <div
          key={i}
          className="absolute animate-confettiFall"
          style={{
            left: `${(i * 17 + 5) % 100}%`,
            top: `${(i * 13) % 30}%`,
            width: i % 3 === 0 ? 12 : 8,
            height: i % 3 === 0 ? 12 : 8,
            borderRadius: i % 2 === 0 ? '50%' : '2px',
            background: colors[i % colors.length],
            animationDelay: `${(i % 5) * 0.1}s`,
            animationDuration: `${1.2 + (i % 4) * 0.3}s`,
          }}
        />
      ))}
    </div>
  );
}

function ScorePopup({ points, isCorrect }: { points: number; isCorrect: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.3 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.3 }}
      transition={{ type: "spring", stiffness: 500, damping: 20 }}
      className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: [0, 1.2, 1] }}
        transition={{ type: "tween", duration: 0.5 }}
        className={`${
          isCorrect
            ? 'bg-gradient-to-br from-emerald-400 to-emerald-600'
            : 'bg-gradient-to-br from-red-400 to-red-600'
        } text-white rounded-3xl p-8 shadow-2xl flex flex-col items-center gap-4`}
      >
        <motion.div
          initial={{ rotate: -180, scale: 0 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="text-7xl"
        >
          {isCorrect ? '🎉' : '💪'}
        </motion.div>
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-4xl font-baloo font-extrabold"
        >
          {isCorrect ? `+${points}` : '0'}
        </motion.div>
        <motion.p
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-lg font-baloo font-bold"
        >
          {isCorrect ? 'Correct! 🎉' : 'Good try!'}
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
    <div className="h-[100dvh] bg-cream flex items-center justify-center p-4">
      <Confetti />
      <div className="bg-white rounded-[28px] p-8 shadow-[0_8px_0_rgba(120,53,15,0.15),0_16px_48px_rgba(0,0,0,0.12)] border-2 border-amber-300 max-w-md w-full text-center animate-popIn">
        <div className="text-7xl mb-4 animate-starBurst">{emoji}</div>
        <h2 className="font-baloo text-3xl font-extrabold text-amber-950 mb-2">{message}</h2>
        <p className="font-nunito font-semibold text-sm text-amber-700 mb-6">
          You got {correctCount} out of {results.length} correct — {pct}%!
        </p>

        <div className="flex gap-4 justify-center mb-6 flex-wrap">
          <div className="bg-white rounded-[20px] p-4 border-2 border-amber-300 shadow-sm text-center min-w-[90px]">
            <span className="text-3xl block mb-1">⭐</span>
            <div className="font-baloo font-extrabold text-2xl text-amber-950">+{totalScore}</div>
            <div className="font-nunito font-semibold text-xs text-amber-700">Stars earned</div>
          </div>
          <div className="bg-white rounded-[20px] p-4 border-2 border-emerald-300 shadow-sm text-center min-w-[90px]">
            <span className="text-3xl block mb-1">✅</span>
            <div className="font-baloo font-extrabold text-2xl text-emerald-800">{correctCount}/{results.length}</div>
            <div className="font-nunito font-semibold text-xs text-emerald-600">Correct</div>
          </div>
          <div className="bg-white rounded-[20px] p-4 border-2 border-rose-300 shadow-sm text-center min-w-[90px]">
            <span className="text-3xl block mb-1">🎯</span>
            <div className="font-baloo font-extrabold text-2xl text-rose-800">{pct}%</div>
            <div className="font-nunito font-semibold text-xs text-rose-600">Accuracy</div>
          </div>
        </div>

        <button
          onClick={onContinue}
          className="w-full py-3.5 bg-gradient-to-r from-amber-800 to-amber-600 text-white font-baloo font-extrabold text-lg rounded-[18px]
                     shadow-[0_6px_0_#78350f,0_8px_20px_rgba(120,53,15,0.3)]
                     hover:-translate-y-0.5 active:translate-y-[3px] active:shadow-[0_2px_0_#78350f]
                     transition-all flex items-center justify-center gap-2"
        >
          Continue <ArrowRight size={18} />
        </button>
      </div>
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
    <div className="h-[100dvh] bg-cream p-3 sm:p-6 flex flex-col overflow-hidden">
      <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col">
        {/* Progress header */}
        <div className="bg-amber-50 border-b-2 border-amber-200 rounded-t-2xl -mx-3 sm:-mx-6 px-4 sm:px-6 py-3 mb-3 flex-shrink-0">
          <div className="flex justify-between items-center mb-2">
            <span className="font-baloo font-extrabold text-sm text-amber-950">
              📖 Task {currentIndex + 1} of {questions.length}
            </span>
            <div className="flex items-center gap-1.5">
              <Star className="text-amber-400" size={14} />
              <span className="font-baloo font-bold text-sm text-amber-900">{runningScore} ⭐</span>
            </div>
          </div>
          {/* Dot progress */}
          <div className="flex gap-1.5 items-center">
            {Array.from({ length: questions.length }).map((_, i) => (
              <div
                key={i}
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  i < currentIndex
                    ? 'bg-emerald-500 w-2.5'
                    : i === currentIndex
                    ? 'bg-blue-500 w-6'
                    : 'bg-amber-200 w-2.5'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Timer */}
        {!showFeedback && (
          <QuestionTimer
            key={`timer-${currentIndex}`}
            initialSeconds={timerSeconds}
            onTimeUp={handleTimeUp}
            paused={showFeedback}
          />
        )}

        {/* Task card */}
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-[24px] p-4 sm:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.09)] border-2 border-amber-200 mb-3 sm:mb-6 flex-shrink-0 relative"
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

        {/* Skip */}
        {!showFeedback && (
          <button
            onClick={() => handleAnswer('', false)}
            className="mx-auto px-5 py-2 bg-amber-200 text-amber-800 rounded-xl font-baloo font-bold text-sm hover:bg-amber-300 transition flex-shrink-0"
          >
            Skip Question
          </button>
        )}
      </div>
    </div>
  );
}
