'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2 } from 'lucide-react';
import { useSpellingBeeDailyStatus, queryKeys } from '@/lib/hooks/queries';

interface DailyWord {
  word: string;
  hint: string;
  urdu_hint: string;
  difficulty: string;
  grade_level: number;
  time_limit: number;
}

interface SubmitResult {
  is_correct: boolean;
  correct_answer: string;
  points_awarded: number;
  new_total: number;
  meaning: string;
  sentence1: string;
  sentence2: string;
  urdu_hint: string;
}

type GamePhase = 'loading' | 'ready' | 'playing' | 'result' | 'done';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';

export default function SpellingBeePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: dailyStatus, isLoading: statusLoading } = useSpellingBeeDailyStatus();

  const [phase, setPhase] = useState<GamePhase>('loading');
  const [wordData, setWordData] = useState<DailyWord | null>(null);
  const [answer, setAnswer] = useState('');
  const [timeLeft, setTimeLeft] = useState(20);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasSpoken = useRef(false);

  // Check auth
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('primepal_student_token') : null;
    if (!token) router.push('/student/play');
  }, [router]);

  // Check daily status once loaded
  useEffect(() => {
    if (statusLoading) return;
    if (dailyStatus && !dailyStatus.can_play) {
      setPhase('done');
    } else {
      setPhase('ready');
    }
  }, [dailyStatus, statusLoading]);

  const speakWord = useCallback((word: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(word);
    u.rate = 0.75;
    u.lang = 'en-US';
    const voices = window.speechSynthesis.getVoices();
    const eng = voices.find(v => v.lang.startsWith('en'));
    if (eng) u.voice = eng;
    window.speechSynthesis.speak(u);
  }, []);

  const startGame = async () => {
    setError('');
    setPhase('loading');
    try {
      const token = localStorage.getItem('primepal_student_token');
      const res = await fetch(`${API_BASE}/spelling-bee/daily-word`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail ?? 'Failed to get word');
      }
      const data: DailyWord = await res.json();
      setWordData(data);
      setTimeLeft(data.time_limit);
      setAnswer('');
      setPhase('playing');
      hasSpoken.current = false;

      // Auto-speak after a moment
      setTimeout(() => {
        speakWord(data.word);
        hasSpoken.current = true;
      }, 500);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setPhase('ready');
    }
  };

  // Timer countdown
  useEffect(() => {
    if (phase !== 'playing') return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Focus input when playing
  useEffect(() => {
    if (phase === 'playing') {
      setTimeout(() => inputRef.current?.focus(), 600);
    }
  }, [phase]);

  const handleSubmit = async (timedOut = false) => {
    if (!wordData || isSubmitting) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setIsSubmitting(true);

    const finalAnswer = timedOut ? answer : answer;

    try {
      const token = localStorage.getItem('primepal_student_token');
      const res = await fetch(`${API_BASE}/spelling-bee/submit`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ word: wordData.word, answer: finalAnswer }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail ?? 'Submit failed');
      }
      const data: SubmitResult = await res.json();
      setResult(data);
      setPhase('result');

      // Invalidate caches
      queryClient.invalidateQueries({ queryKey: queryKeys.studentProfile });
      queryClient.invalidateQueries({ queryKey: queryKeys.dailySummary });
      queryClient.invalidateQueries({ queryKey: queryKeys.spellingBeeDailyStatus });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Submit failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && answer.trim()) {
      handleSubmit();
    }
  };

  // Timer color
  const timerColor = timeLeft > 10 ? 'text-emerald-600' : timeLeft > 5 ? 'text-amber-600' : 'text-red-600';
  const timerBg = timeLeft > 10 ? 'bg-emerald-100' : timeLeft > 5 ? 'bg-amber-100' : 'bg-red-100';
  const timerRing = timeLeft > 10 ? 'ring-emerald-300' : timeLeft > 5 ? 'ring-amber-300' : 'ring-red-300';

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="bg-gradient-to-br from-amber-400 via-yellow-400 to-orange-400 rounded-3xl p-6 sm:p-8 text-white shadow-[0_12px_32px_rgba(245,158,11,0.25)] relative overflow-hidden">
        <span className="pointer-events-none absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/15" aria-hidden="true" />
        <div className="flex items-center gap-4">
          <span className="text-5xl sm:text-6xl drop-shadow-lg">🐝</span>
          <div>
            <p className="text-xs sm:text-sm font-baloo font-extrabold uppercase tracking-wider opacity-90">Daily Challenge</p>
            <h1 className="font-baloo font-extrabold text-2xl sm:text-3xl leading-tight">Spelling Bee</h1>
            <p className="font-nunito font-semibold text-sm sm:text-base opacity-90 mt-1">
              Listen carefully and spell the word correctly!
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-4">
          <span className="bg-white/25 backdrop-blur-sm rounded-xl px-3 py-1.5 text-xs sm:text-sm font-baloo font-extrabold">
            +30 Points
          </span>
          <span className="bg-white/25 backdrop-blur-sm rounded-xl px-3 py-1.5 text-xs sm:text-sm font-baloo font-extrabold">
            20 Seconds
          </span>
          <span className="bg-white/25 backdrop-blur-sm rounded-xl px-3 py-1.5 text-xs sm:text-sm font-baloo font-extrabold">
            1 Try / Day
          </span>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 text-center">
          <p className="text-sm font-semibold text-red-700">{error}</p>
        </div>
      )}

      {/* Loading state */}
      {(phase === 'loading' && !error) && (
        <div className="bg-white rounded-3xl border-2 border-amber-100 p-12 flex flex-col items-center gap-4">
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="text-5xl"
          >
            🐝
          </motion.span>
          <p className="font-baloo font-extrabold text-lg text-slate-700">Getting your word...</p>
        </div>
      )}

      {/* Ready state — show start button */}
      {phase === 'ready' && (
        <div className="bg-white rounded-3xl border-2 border-amber-100 p-8 sm:p-12 flex flex-col items-center gap-6 shadow-[0_8px_24px_rgba(245,158,11,0.08)]">
          <motion.span
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-7xl sm:text-8xl"
          >
            🐝
          </motion.span>
          <div className="text-center">
            <h2 className="font-baloo font-extrabold text-xl sm:text-2xl text-slate-900">Ready for today&apos;s word?</h2>
            <p className="font-nunito font-semibold text-sm sm:text-base text-slate-500 mt-2">
              You&apos;ll hear a word. Type the correct spelling within 20 seconds.
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={startGame}
            className="px-8 py-4 bg-gradient-to-br from-amber-400 to-orange-500 text-white font-baloo font-extrabold text-lg sm:text-xl rounded-2xl shadow-[0_6px_0_rgba(194,120,3,0.5)] hover:shadow-[0_4px_0_rgba(194,120,3,0.5)] hover:translate-y-0.5 transition-all"
          >
            Start! 🎤
          </motion.button>
        </div>
      )}

      {/* Playing state — timer + audio + input */}
      {phase === 'playing' && wordData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl border-2 border-amber-100 p-6 sm:p-10 shadow-[0_8px_24px_rgba(245,158,11,0.08)]"
        >
          {/* Timer */}
          <div className="flex justify-center mb-6">
            <div className={`${timerBg} ${timerRing} ring-4 rounded-full w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center`}>
              <span className={`font-baloo font-extrabold text-3xl sm:text-4xl ${timerColor}`}>
                {timeLeft}
              </span>
            </div>
          </div>

          {/* Play audio button */}
          <div className="flex flex-col items-center gap-3 mb-6">
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => speakWord(wordData.word)}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg hover:bg-indigo-700 transition-colors"
            >
              <Volume2 size={32} />
            </motion.button>
            <p className="text-sm font-nunito font-semibold text-slate-500">Tap to hear the word again</p>
          </div>

          {/* Hint */}
          <div className="bg-amber-50 rounded-2xl p-4 mb-6 text-center border border-amber-200">
            <p className="text-xs font-baloo font-extrabold text-amber-600 uppercase tracking-wider mb-1">Hint</p>
            <p className="font-nunito font-bold text-base sm:text-lg text-amber-900">{wordData.hint}</p>
            {wordData.urdu_hint && (
              <p className="font-nunito font-semibold text-sm text-amber-700 mt-1" dir="rtl">{wordData.urdu_hint}</p>
            )}
          </div>

          {/* Input */}
          <div className="flex flex-col items-center gap-4">
            <input
              ref={inputRef}
              type="text"
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type the spelling here..."
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              className="w-full max-w-sm text-center text-xl sm:text-2xl font-baloo font-extrabold text-slate-900 border-2 border-amber-300 rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-amber-200 focus:border-amber-400 bg-amber-50/50 placeholder:text-slate-300 placeholder:font-normal placeholder:text-base"
            />
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => handleSubmit()}
              disabled={!answer.trim() || isSubmitting}
              className="px-8 py-3 bg-gradient-to-br from-emerald-400 to-green-500 text-white font-baloo font-extrabold text-lg rounded-2xl shadow-[0_4px_0_rgba(21,128,61,0.4)] hover:shadow-[0_2px_0_rgba(21,128,61,0.4)] hover:translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Checking...' : 'Submit'}
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Result state — learning screen */}
      <AnimatePresence>
        {phase === 'result' && result && wordData && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-5"
          >
            {/* Correct / Incorrect banner */}
            <div className={`rounded-3xl border-2 p-6 sm:p-8 text-center shadow-[0_12px_32px_rgba(0,0,0,0.08)] ${
              result.is_correct
                ? 'bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-300'
                : 'bg-gradient-to-br from-rose-50 to-pink-50 border-rose-300'
            }`}>
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', bounce: 0.6, delay: 0.1 }}
                className="text-6xl sm:text-7xl block mb-3"
              >
                {result.is_correct ? '🎉' : '😊'}
              </motion.span>

              <h2 className={`font-baloo font-extrabold text-2xl sm:text-3xl mb-2 ${
                result.is_correct ? 'text-emerald-700' : 'text-rose-700'
              }`}>
                {result.is_correct ? 'Perfect Spelling!' : 'Nice Try!'}
              </h2>

              {!result.is_correct && (
                <div className="mb-3">
                  <p className="font-nunito font-semibold text-sm text-slate-500 mb-1">The correct spelling is:</p>
                  <p className="font-baloo font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-widest">
                    {result.correct_answer.split('').map((letter, i) => (
                      <span
                        key={i}
                        className={
                          answer.trim().toLowerCase()[i] === letter
                            ? 'text-emerald-600'
                            : 'text-rose-600 underline decoration-2'
                        }
                      >
                        {letter}
                      </span>
                    ))}
                  </p>
                  {answer.trim() && (
                    <p className="font-nunito font-semibold text-sm text-slate-400 mt-1">
                      You typed: <span className="text-slate-600 italic">&ldquo;{answer.trim()}&rdquo;</span>
                    </p>
                  )}
                </div>
              )}

              {result.is_correct && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="inline-flex items-center gap-2 bg-emerald-200/60 rounded-full px-5 py-2"
                >
                  <span className="text-xl">⭐</span>
                  <span className="font-baloo font-extrabold text-lg text-emerald-800">
                    +{result.points_awarded} Points!
                  </span>
                </motion.div>
              )}
            </div>

            {/* Learning card — word meaning + sentences */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-3xl border-2 border-amber-200 p-6 sm:p-8 shadow-[0_8px_24px_rgba(245,158,11,0.10)]"
            >
              <div className="flex items-center gap-3 mb-5">
                <span className="text-3xl">📖</span>
                <h3 className="font-baloo font-extrabold text-xl sm:text-2xl text-slate-900">
                  Learn the Word: <span className="text-amber-600">{result.correct_answer}</span>
                </h3>
              </div>

              {/* Meaning */}
              {result.meaning && (
                <div className="bg-amber-50 rounded-2xl p-4 mb-4 border border-amber-100">
                  <p className="text-xs font-baloo font-extrabold text-amber-600 uppercase tracking-wider mb-1">Meaning</p>
                  <p className="font-nunito font-bold text-base sm:text-lg text-slate-800">{result.meaning}</p>
                </div>
              )}

              {/* Usage sentences */}
              {(result.sentence1 || result.sentence2) && (
                <div className="space-y-3 mb-4">
                  <p className="text-xs font-baloo font-extrabold text-indigo-600 uppercase tracking-wider">Example Sentences</p>
                  {result.sentence1 && (
                    <div className="flex items-start gap-3 bg-indigo-50 rounded-xl p-3 border border-indigo-100">
                      <span className="text-lg mt-0.5">1️⃣</span>
                      <p className="font-nunito font-semibold text-sm sm:text-base text-slate-700">{result.sentence1}</p>
                    </div>
                  )}
                  {result.sentence2 && (
                    <div className="flex items-start gap-3 bg-indigo-50 rounded-xl p-3 border border-indigo-100">
                      <span className="text-lg mt-0.5">2️⃣</span>
                      <p className="font-nunito font-semibold text-sm sm:text-base text-slate-700">{result.sentence2}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Urdu translation */}
              {result.urdu_hint && (
                <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
                  <p className="text-xs font-baloo font-extrabold text-emerald-600 uppercase tracking-wider mb-1">Urdu Translation</p>
                  <p className="font-nunito font-bold text-lg sm:text-xl text-emerald-800" dir="rtl">{result.urdu_hint}</p>
                </div>
              )}
            </motion.div>

            {/* Back button */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="flex justify-center"
            >
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => router.push('/student/home')}
                className="px-8 py-3 bg-gradient-to-br from-amber-400 to-orange-500 text-white font-baloo font-extrabold text-lg rounded-2xl shadow-[0_4px_0_rgba(194,120,3,0.4)] hover:shadow-[0_2px_0_rgba(194,120,3,0.4)] hover:translate-y-0.5 transition-all"
              >
                Back to Home
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Already done today */}
      {phase === 'done' && (
        <div className="bg-white rounded-3xl border-2 border-amber-100 p-8 sm:p-12 flex flex-col items-center gap-5 shadow-[0_8px_24px_rgba(245,158,11,0.08)]">
          <span className="text-6xl sm:text-7xl">🏆</span>
          <div className="text-center">
            <h2 className="font-baloo font-extrabold text-xl sm:text-2xl text-slate-900">
              You&apos;ve done today&apos;s Spelling Bee!
            </h2>
            <p className="font-nunito font-semibold text-sm sm:text-base text-slate-500 mt-2">
              Come back tomorrow for a new word.
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => router.push('/student/home')}
            className="px-6 py-3 bg-gradient-to-br from-amber-400 to-orange-500 text-white font-baloo font-extrabold rounded-2xl shadow-lg transition-all"
          >
            Back to Home
          </motion.button>
        </div>
      )}
    </div>
  );
}
