'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Volume2, ArrowLeft, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useStoryTime, useStoryTimeDailyStatus, queryKeys } from '@/lib/hooks/queries';
import PageHero from '@/components/student/PageHero';

type GameState = 'loading' | 'reading' | 'questioning' | 'finished';

export default function StoryTimePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: dailyStatus } = useStoryTimeDailyStatus();
  const canPlay = dailyStatus?.can_play ?? true;
  const attemptsUsed = dailyStatus?.attempts_used ?? 0;
  const attemptsLimit = dailyStatus?.attempts_limit ?? 2;
  const { data: storyData, isLoading: storyLoading, error: storyError, refetch: refetchStory } = useStoryTime(canPlay);

  const [gameState, setGameState] = useState<GameState>('loading');
  const [story, setStory] = useState<typeof storyData | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState({ correct: 0, totalPoints: 0 });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answerResult, setAnswerResult] = useState<{ correct: boolean; message: string } | null>(null);
  const [gameStarted, setGameStarted] = useState(false);

  function getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('primepal_student_token');
  }

  // Initialise game once query data arrives
  useEffect(() => {
    if (storyLoading) return;
    if (storyError) {
      setError('Failed to load story. Please try again.');
      return;
    }
    if (storyData && !gameStarted) {
      const token = getToken();
      if (!token) { router.push('/student/play'); return; }
      setStory(storyData);
      setGameState('reading');
      setCurrentQuestionIndex(0);
      setScore({ correct: 0, totalPoints: 0 });
      setSelectedAnswer(null);
      setAnswerResult(null);
      setGameStarted(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyLoading, storyData, storyError]);

  function speakStory() {
    if (!window.speechSynthesis || isSpeaking || !story) return;

    setIsSpeaking(true);
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(story.story_text);
    utterance.lang = 'en-US';
    utterance.rate = 0.8;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }

  async function submitAnswer(selectedIndex: number) {
    if (!story || isSubmitting) return;

    setSelectedAnswer(selectedIndex);
    setIsSubmitting(true);

    try {
      const token = getToken();
      const currentQuestion = story.questions[currentQuestionIndex];
      const isCorrect = selectedIndex === currentQuestion.correct_index;

      await apiFetch('/story-time/answer', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          question_id: currentQuestion.id,
          selected_index: selectedIndex,
          correct: isCorrect,
        }),
      });

      const pointsAwarded = isCorrect ? 10 : 0;
      setScore((prev) => ({
        correct: isCorrect ? prev.correct + 1 : prev.correct,
        totalPoints: prev.totalPoints + pointsAwarded,
      }));

      setAnswerResult({
        correct: isCorrect,
        message: isCorrect ? '✅ Correct!' : `❌ Wrong. Answer: ${currentQuestion.options[currentQuestion.correct_index]}`,
      });

      setTimeout(() => advanceToNextQuestion(), 1500);
    } catch (err) {
      console.error('Failed to submit answer:', err);
      setError('Failed to submit answer. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function advanceToNextQuestion() {
    if (!story) return;

    if (currentQuestionIndex < story.questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setAnswerResult(null);
      setGameState('questioning');
    } else {
      setGameState('finished');
    }
  }

  /* ================================================================ */
  /*  RENDER: Daily limit reached                                     */
  /* ================================================================ */

  if (!canPlay) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-green-50 pb-10">
        <PageHero label="STORY TIME" name="Read & Discover" subtitle="Daily limit reached" mascot="📖" />
        <div className="flex items-center justify-center px-4 mt-12">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl shadow-[0_24px_48px_rgba(0,0,0,0.12)] border-2 border-emerald-200 p-8 max-w-md w-full text-center"
          >
            <Lock className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
            <h2 className="font-baloo font-extrabold text-2xl text-slate-800 mb-2">
              Come Back Tomorrow!
            </h2>
            <p className="font-nunito text-slate-500 mb-4">
              You&apos;ve read <span className="font-bold text-emerald-600">{attemptsUsed}/{attemptsLimit}</span> stories today.
              Your daily Story Time sessions are used up.
            </p>
            <div className="bg-emerald-50 rounded-2xl px-4 py-3 mb-6">
              <p className="font-nunito text-sm text-emerald-700">
                Try <span className="font-bold">Daily Missions</span> or <span className="font-bold">Chat</span> to keep earning stars!
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => router.push('/student/home')}
              className="w-full py-4 rounded-2xl font-baloo font-extrabold text-lg text-white bg-gradient-to-r from-emerald-500 to-green-500 shadow-[0_6px_0_#059669,0_8px_18px_rgba(16,185,129,0.3)] active:translate-y-1 active:shadow-[0_2px_0_#059669] transition-all"
            >
              Back Home
            </motion.button>
          </motion.div>
        </div>
      </div>
    );
  }

  if (gameState === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-emerald-50 to-green-50 px-4">
        <div className="text-center">
          <div className="text-5xl mb-4">📖</div>
          <p className="text-gray-600 font-semibold mb-2">
            {storyLoading ? 'Creating your story...' : 'Loading your story...'}
          </p>
          <p className="text-sm text-gray-400 mb-6">This may take a few seconds</p>
          {storyError && (
            <div className="space-y-3">
              <p className="text-red-500 text-sm font-medium">Story generation failed. Please try again.</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => {
                    setError(null);
                    refetchStory();
                  }}
                  className="px-4 py-2 bg-emerald-500 text-white font-semibold rounded-lg hover:bg-emerald-600 transition-colors"
                >
                  🔄 Try Again
                </button>
                <button
                  onClick={() => router.push('/student/home')}
                  className="px-4 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
                >
                  🏠 Home
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-emerald-50 to-green-50 px-4">
        <div className="bg-white rounded-2xl border border-red-200 p-8 max-w-sm text-center">
          <p className="text-red-600 font-semibold mb-4">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                setError(null);
                setGameState('loading');
                setGameStarted(false);
                refetchStory();
              }}
              className="px-4 py-2 bg-emerald-500 text-white font-semibold rounded-lg hover:bg-emerald-600 transition-colors"
            >
              🔄 Try Again
            </button>
            <button
              onClick={() => router.push('/student/home')}
              className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Back Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!story) {
    return null;
  }

  const currentQuestion = story.questions[currentQuestionIndex];
  const progress = Math.round(((currentQuestionIndex + 1) / story.questions.length) * 100);

  if (gameState === 'finished') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-emerald-50 to-green-50 px-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-3xl shadow-2xl border-4 border-emerald-300 p-8 max-w-md text-center"
        >
          <div className="text-6xl mb-4">📖</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Story Complete!</h1>
          <p className="text-gray-600 mb-6">
            You got <span className="font-bold text-emerald-600">{score.correct} / {story.questions.length}</span> questions correct
          </p>
          <div className="bg-emerald-50 rounded-xl px-4 py-3 mb-6">
            <p className="text-sm text-gray-600 mb-1">Stars earned today</p>
            <p className="text-4xl font-bold text-emerald-600">{score.totalPoints} ⭐</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setScore({ correct: 0, totalPoints: 0 });
                setCurrentQuestionIndex(0);
                setSelectedAnswer(null);
                setAnswerResult(null);
                setStory(null);
                setGameStarted(false);
                setGameState('loading');
                queryClient.invalidateQueries({ queryKey: queryKeys.storyTime });
                queryClient.invalidateQueries({ queryKey: queryKeys.storyTimeDailyStatus });
              }}
              className="flex-1 px-4 py-3 bg-emerald-500 text-white font-bold rounded-lg hover:bg-emerald-600 transition-colors"
            >
              🔄 Read Again
            </button>
            <button
              onClick={() => router.push('/student/home')}
              className="flex-1 px-4 py-3 bg-gray-200 text-gray-900 font-bold rounded-lg hover:bg-gray-300 transition-colors"
            >
              🏠 Home
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-student-bg pb-6">
      <PageHero label="STORY TIME" name="Read & Discover" subtitle="Read the story, then answer the questions." mascot="📖" />

      {/* Back / Score bar */}
      <div className="max-w-3xl mx-auto px-4 flex items-center justify-between py-3">
        <button
          onClick={() => router.push('/student/home')}
          className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:opacity-80 transition-opacity"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <div className="text-right">
          <p className="text-xs text-slate-500">Score</p>
          <p className="text-2xl font-bold text-emerald-600">{score.totalPoints}</p>
        </div>
      </div>

      {gameState === 'reading' && (
        <>
          {/* Story Card */}
          <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-emerald-100 shadow-[0_12px_40px_rgba(15,23,42,0.06)]"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">{story.story_title}</h2>
              <p className="text-base sm:text-lg leading-relaxed font-nunito text-gray-700 mb-6">{story.story_text}</p>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={speakStory}
                disabled={isSpeaking}
                className={[
                  'flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-baloo font-extrabold text-white transition-all',
                  isSpeaking
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-br from-emerald-400 to-emerald-500 shadow-[0_4px_12px_rgba(16,185,129,0.3)]',
                ].join(' ')}
              >
                <Volume2 size={20} />
                {isSpeaking ? 'Listening...' : '🔊 Read Aloud'}
              </motion.button>
            </motion.div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setGameState('questioning')}
              className="w-full py-4 bg-gradient-to-r from-emerald-500 to-green-500 text-white font-bold text-lg rounded-xl hover:from-emerald-600 hover:to-green-600 transition-all shadow-md"
            >
              Start Questions →
            </motion.button>
          </div>
        </>
      )}

      {gameState === 'questioning' && (
        <>
          {/* Progress bar */}
          <div className="bg-white border-b border-gray-200">
            <div className="max-w-3xl mx-auto px-4 py-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-gray-700">
                  Question {currentQuestionIndex + 1} of {story.questions.length}
                </p>
                <p className="text-sm font-semibold text-emerald-600">{progress}%</p>
              </div>
              <div className="h-3 rounded-full bg-emerald-100 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-emerald-400 to-teal-400 h-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>

          {/* Question area */}
          <div className="max-w-3xl mx-auto px-4 py-8">
            <motion.div
              key={currentQuestionIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Question card */}
              <div className="bg-white rounded-3xl border-2 border-emerald-100 p-6 sm:p-8 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
                <p className="text-sm font-semibold text-gray-600 mb-2 uppercase tracking-widest">Question</p>
                <p className="text-xl sm:text-2xl font-baloo font-extrabold text-slate-900">{currentQuestion.question}</p>
              </div>

              {/* Answer options */}
              <div className="space-y-3">
                {currentQuestion.options.map((option, index) => {
                  const isSelected = selectedAnswer === index;
                  const isCorrectAnswer = index === currentQuestion.correct_index;
                  const shouldHighlight = answerResult && isSelected;

                  return (
                    <motion.button
                      key={index}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => !answerResult && !isSubmitting && submitAnswer(index)}
                      disabled={answerResult !== null || isSubmitting}
                      className={[
                        'block w-full text-left border-2 rounded-2xl px-5 py-4 font-nunito font-semibold text-base transition-all',
                        shouldHighlight
                          ? answerResult.correct
                            ? 'border-emerald-500 bg-emerald-100 text-emerald-900'
                            : 'border-rose-400 bg-rose-50 text-rose-900'
                          : answerResult && isCorrectAnswer
                          ? 'border-emerald-500 bg-emerald-100 text-emerald-900'
                          : 'bg-white border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 cursor-pointer',
                      ].join(' ')}
                    >
                      <span className="text-sm font-bold opacity-60 mr-2">
                        {String.fromCharCode(65 + index)}.
                      </span>
                      {option}
                    </motion.button>
                  );
                })}
              </div>

              {/* Result message */}
              {answerResult && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={[
                    'p-4 rounded-xl text-center font-semibold text-white',
                    answerResult.correct ? 'bg-green-500' : 'bg-red-500',
                  ].join(' ')}
                >
                  {answerResult.message}
                  {answerResult.correct && <p className="text-sm mt-2">+10 stars</p>}
                </motion.div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </div>
  );
}
