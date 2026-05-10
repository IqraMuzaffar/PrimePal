'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ArrowLeft, CheckCircle2, XCircle, Trophy, Home, RotateCcw, Lock } from 'lucide-react';
import TaskRouter from '@/components/student/tasks/TaskRouter';
import PageHero from '@/components/student/PageHero';
import { useMissionComplete } from '@/lib/hooks/mutations';
import { usePuzzlePalaceDailyStatus, queryKeys } from '@/lib/hooks/queries';
import { studentFetch } from '@/lib/api-helpers';
import { MissionQuestion } from '@/types/missions';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Room {
  room_number: number;
  room_name: string;
  task_type: string;
  pillar: string;
  questions: MissionQuestion[];
}

interface PuzzlePalaceData {
  rooms: Room[];
  topic: string;
}

type GamePhase = 'intro' | 'playing' | 'room-result' | 'finished';

interface RoomResult {
  room: Room;
  answers: { correct: boolean; points: number }[];
}

/* ------------------------------------------------------------------ */
/*  Room visual metadata                                               */
/* ------------------------------------------------------------------ */

const ROOM_META: Record<string, { emoji: string; color: string }> = {
  'Fill the Gap':   { emoji: '\uD83D\uDCDD', color: 'from-blue-400 to-blue-600' },
  'Scramble Fix':   { emoji: '\uD83D\uDD00', color: 'from-emerald-400 to-emerald-600' },
  'Odd One Out':    { emoji: '\uD83D\uDD0D', color: 'from-amber-400 to-amber-600' },
  'Missing Letter': { emoji: '\uD83D\uDD24', color: 'from-rose-400 to-rose-600' },
  'True or False':  { emoji: '\u2705', color: 'from-purple-400 to-purple-600' },
};

const fallbackMeta = { emoji: '\uD83C\uDFF0', color: 'from-violet-400 to-violet-600' };

function meta(roomName: string) {
  return ROOM_META[roomName] ?? fallbackMeta;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function PuzzlePalacePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const completeMission = useMissionComplete();

  /* ---------- daily status ---------- */
  const { data: dailyStatus } = usePuzzlePalaceDailyStatus();
  const canPlay = dailyStatus?.can_play ?? true;
  const attemptsUsed = dailyStatus?.attempts_used ?? 0;
  const attemptsLimit = dailyStatus?.attempts_limit ?? 2;

  /* ---------- data fetch ---------- */
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<PuzzlePalaceData>({
    queryKey: ['puzzlePalaceRooms'],
    queryFn: () => studentFetch<PuzzlePalaceData>('/puzzle-palace/rooms'),
    staleTime: Infinity,
    retry: 1,
    enabled: canPlay,
  });

  /* ---------- game state ---------- */
  const [phase, setPhase] = useState<GamePhase>('intro');
  const [roomIndex, setRoomIndex] = useState(0);
  const [questionIndexInRoom, setQuestionIndexInRoom] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [roomResults, setRoomResults] = useState<RoomResult[]>([]);
  const [currentRoomAnswers, setCurrentRoomAnswers] = useState<{ correct: boolean; points: number }[]>([]);
  const [totalScore, setTotalScore] = useState(0);

  const rooms = data?.rooms ?? [];
  const currentRoom = rooms[roomIndex];
  const totalQuestions = rooms.reduce((n, r) => n + r.questions.length, 0);
  const questionsAnsweredBefore = rooms.slice(0, roomIndex).reduce((n, r) => n + r.questions.length, 0) + questionIndexInRoom;
  const currentQuestion = currentRoom?.questions[questionIndexInRoom];

  /* ---------- handlers ---------- */

  function handleAnswer(answer: string, isCorrect: boolean) {
    setShowFeedback(true);
    setDisabled(true);

    const pts = isCorrect ? 10 : 0;

    // Submit to backend
    completeMission.mutate({
      question_correct: isCorrect,
      task_type: currentRoom.task_type,
      pillar: currentRoom.pillar,
      points_value: 10,
      submitted_at: new Date().toISOString(),
    });

    setCurrentRoomAnswers((prev) => [...prev, { correct: isCorrect, points: pts }]);
    setTotalScore((prev) => prev + pts);

    // After 1.5s advance
    setTimeout(() => {
      setShowFeedback(false);
      setDisabled(false);

      const nextQInRoom = questionIndexInRoom + 1;
      if (nextQInRoom < currentRoom.questions.length) {
        // More questions in this room
        setQuestionIndexInRoom(nextQInRoom);
      } else {
        // Room finished
        setRoomResults((prev) => [
          ...prev,
          { room: currentRoom, answers: [...currentRoomAnswers, { correct: isCorrect, points: pts }] },
        ]);
        setCurrentRoomAnswers([]);

        if (roomIndex + 1 < rooms.length) {
          setPhase('room-result');
        } else {
          // All rooms done - build final result including this room
          setRoomResults((prev) => {
            // Already pushed above, so just trigger finished
            return prev;
          });
          setPhase('finished');
        }
      }
    }, 1500);
  }

  function advanceToNextRoom() {
    setRoomIndex((prev) => prev + 1);
    setQuestionIndexInRoom(0);
    setPhase('playing');
  }

  function resetGame() {
    setPhase('intro');
    setRoomIndex(0);
    setQuestionIndexInRoom(0);
    setShowFeedback(false);
    setDisabled(false);
    setRoomResults([]);
    setCurrentRoomAnswers([]);
    setTotalScore(0);
    queryClient.invalidateQueries({ queryKey: ['puzzlePalaceRooms'] });
    queryClient.invalidateQueries({ queryKey: queryKeys.puzzlePalaceDailyStatus });
    refetch();
  }

  /* ================================================================ */
  /*  RENDER: Loading                                                  */
  /* ================================================================ */

  /* ================================================================ */
  /*  RENDER: Daily limit reached                                     */
  /* ================================================================ */

  if (!canPlay) {
    return (
      <div className="min-h-screen pb-10">
        <PageHero
          label="PUZZLE PALACE"
          name="Puzzle Palace"
          waveEmoji="\uD83C\uDFF0"
          subtitle="Daily limit reached"
          mascot="\uD83C\uDFF0"
        />
        <div className="flex items-center justify-center px-4 mt-12">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl shadow-[0_24px_48px_rgba(0,0,0,0.12)] border-2 border-amber-200 p-8 max-w-md w-full text-center"
          >
            <Lock className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h2 className="font-baloo font-extrabold text-2xl text-slate-800 mb-2">
              Come Back Tomorrow!
            </h2>
            <p className="font-nunito text-slate-500 mb-4">
              You&apos;ve played <span className="font-bold text-amber-600">{attemptsUsed}/{attemptsLimit}</span> times today.
              Your daily Puzzle Palace sessions are used up.
            </p>
            <div className="bg-amber-50 rounded-2xl px-4 py-3 mb-6">
              <p className="font-nunito text-sm text-amber-700">
                Try <span className="font-bold">Daily Missions</span> or <span className="font-bold">Chat</span> to keep earning stars!
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => router.push('/student/home')}
              className="w-full py-4 rounded-2xl font-baloo font-extrabold text-lg text-white bg-gradient-to-r from-violet-500 to-pink-500 shadow-[0_6px_0_#7c3aed,0_8px_18px_rgba(139,92,246,0.3)] active:translate-y-1 active:shadow-[0_2px_0_#7c3aed] transition-all"
            >
              Back Home
            </motion.button>
          </motion.div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-violet-500 mx-auto mb-4" />
          <p className="font-nunito font-semibold text-slate-500">Preparing the Palace...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="bg-white rounded-2xl border border-red-200 p-8 max-w-sm text-center shadow-md">
          <p className="text-red-600 font-semibold mb-4">Failed to load Puzzle Palace. Please try again.</p>
          <button
            onClick={() => router.push('/student/home')}
            className="px-4 py-2 bg-violet-600 text-white font-semibold rounded-lg hover:bg-violet-700 transition-colors"
          >
            Back Home
          </button>
        </div>
      </div>
    );
  }

  /* ================================================================ */
  /*  RENDER: Intro                                                    */
  /* ================================================================ */

  if (phase === 'intro') {
    return (
      <div className="min-h-screen pb-10">
        <PageHero
          label="PUZZLE PALACE"
          name="Puzzle Palace"
          waveEmoji="\uD83C\uDFF0"
          subtitle={`Today\u2019s topic: ${data.topic}`}
          mascot="\uD83C\uDFF0"
        />

        <div className="max-w-2xl mx-auto px-4 mt-8 space-y-4">
          <h2 className="font-baloo font-extrabold text-2xl text-slate-800 text-center">
            5 Rooms Await You!
          </h2>

          <div className="space-y-3">
            {rooms.map((room) => {
              const m = meta(room.room_name);
              return (
                <motion.div
                  key={room.room_number}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: room.room_number * 0.1 }}
                  className="flex items-center gap-4 bg-white rounded-2xl px-5 py-4 shadow-md"
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${m.color} flex items-center justify-center text-2xl shrink-0 shadow-sm`}>
                    {m.emoji}
                  </div>
                  <div className="min-w-0">
                    <p className="font-baloo font-extrabold text-slate-800 leading-tight">
                      Room {room.room_number}: {room.room_name}
                    </p>
                    <p className="font-nunito text-sm text-slate-500 capitalize">{room.pillar} pillar</p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {dailyStatus && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-center mt-2">
              <p className="font-nunito font-semibold text-sm text-amber-700">
                {attemptsLimit - attemptsUsed} of {attemptsLimit} plays remaining today
              </p>
            </div>
          )}

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97, translateY: '4px' }}
            onClick={() => setPhase('playing')}
            className="w-full mt-4 py-4 rounded-2xl font-baloo font-extrabold text-xl text-white bg-gradient-to-r from-violet-500 to-pink-500 shadow-[0_6px_0_#7c3aed,0_8px_18px_rgba(139,92,246,0.3)] active:translate-y-1 active:shadow-[0_2px_0_#7c3aed] transition-all"
          >
            Enter the Palace!
          </motion.button>
        </div>
      </div>
    );
  }

  /* ================================================================ */
  /*  RENDER: Room Result                                              */
  /* ================================================================ */

  if (phase === 'room-result') {
    const lastResult = roomResults[roomResults.length - 1];
    const roomPts = lastResult.answers.reduce((s, a) => s + a.points, 0);
    const m = meta(lastResult.room.room_name);

    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-3xl shadow-[0_24px_48px_rgba(0,0,0,0.12)] p-8 max-w-md w-full text-center"
        >
          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${m.color} flex items-center justify-center text-3xl mx-auto mb-4 shadow-md`}>
            {m.emoji}
          </div>
          <h2 className="font-baloo font-extrabold text-2xl text-slate-800 mb-1">
            Room {lastResult.room.room_number} Complete!
          </h2>
          <p className="font-nunito text-slate-500 mb-5">{lastResult.room.room_name}</p>

          <div className="space-y-2 mb-5">
            {lastResult.answers.map((a, i) => (
              <div key={i} className="flex items-center justify-center gap-2 font-nunito font-semibold text-lg">
                {a.correct ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-400" />
                )}
                <span className={a.correct ? 'text-emerald-700' : 'text-red-500'}>
                  Question {i + 1} &mdash; {a.correct ? '+10' : '+0'} pts
                </span>
              </div>
            ))}
          </div>

          <div className="bg-violet-50 rounded-2xl px-4 py-3 mb-6">
            <p className="font-nunito text-sm text-slate-500">Room points</p>
            <p className="font-baloo font-extrabold text-3xl text-violet-600">{roomPts} pts</p>
          </div>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97, translateY: '4px' }}
            onClick={advanceToNextRoom}
            className="w-full py-4 rounded-2xl font-baloo font-extrabold text-lg text-white bg-gradient-to-r from-violet-500 to-pink-500 shadow-[0_6px_0_#7c3aed,0_8px_18px_rgba(139,92,246,0.3)] active:translate-y-1 active:shadow-[0_2px_0_#7c3aed] transition-all"
          >
            Next Room &rarr;
          </motion.button>
        </motion.div>
      </div>
    );
  }

  /* ================================================================ */
  /*  RENDER: Finished                                                 */
  /* ================================================================ */

  if (phase === 'finished') {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-3xl shadow-[0_24px_48px_rgba(0,0,0,0.18)] border-4 border-amber-300 p-8 max-w-md w-full text-center"
        >
          <Trophy className="w-16 h-16 text-amber-500 mx-auto mb-3" />
          <h1 className="font-baloo font-extrabold text-3xl text-slate-900 mb-1">
            Palace Conquered!
          </h1>
          <p className="font-nunito text-slate-500 mb-6">
            You scored <span className="font-bold text-violet-600">{totalScore}</span> / {totalQuestions * 10} points
          </p>

          {/* Per-room breakdown */}
          <div className="space-y-2 mb-6 text-left">
            {roomResults.map((rr) => {
              const m = meta(rr.room.room_name);
              const pts = rr.answers.reduce((s, a) => s + a.points, 0);
              const correctCount = rr.answers.filter((a) => a.correct).length;
              return (
                <div key={rr.room.room_number} className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3">
                  <span className="text-xl">{m.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-baloo font-extrabold text-sm text-slate-700 truncate">
                      {rr.room.room_name}
                    </p>
                    <p className="font-nunito text-xs text-slate-400">
                      {correctCount}/{rr.answers.length} correct
                    </p>
                  </div>
                  <span className="font-baloo font-extrabold text-violet-600">{pts} pts</span>
                </div>
              );
            })}
          </div>

          <div className="flex gap-3">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => router.push('/student/home')}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-baloo font-extrabold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              <Home className="w-5 h-5" />
              Home
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={resetGame}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-baloo font-extrabold text-white bg-gradient-to-r from-violet-500 to-pink-500 shadow-[0_6px_0_#7c3aed] active:translate-y-1 active:shadow-[0_2px_0_#7c3aed] transition-all"
            >
              <RotateCcw className="w-5 h-5" />
              Play Again
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  /* ================================================================ */
  /*  RENDER: Playing                                                  */
  /* ================================================================ */

  const m = meta(currentRoom.room_name);
  const progressPercent = Math.round(((questionsAnsweredBefore + (showFeedback ? 1 : 0)) / totalQuestions) * 100);

  return (
    <div className="min-h-screen pb-10">
      {/* Room header */}
      <div className={`bg-gradient-to-r ${m.color} px-6 py-5 text-white`}>
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.push('/student/home')}
            className="flex items-center gap-1.5 text-white/80 hover:text-white text-sm font-semibold transition-colors"
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <div className="text-center">
            <p className="font-baloo font-extrabold text-lg leading-tight">
              {m.emoji} Room {currentRoom.room_number}: {currentRoom.room_name}
            </p>
            <p className="font-nunito text-sm text-white/70 capitalize">{currentRoom.pillar} pillar</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full font-baloo font-extrabold text-sm">
            {totalScore} pts
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-1.5">
            <p className="font-nunito text-sm font-semibold text-slate-600">
              Question {questionsAnsweredBefore + 1} of {totalQuestions}
            </p>
            <p className="font-nunito text-sm font-semibold text-violet-600">{progressPercent}%</p>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-violet-400 to-pink-400 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Question area */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${roomIndex}-${questionIndexInRoom}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="bg-white rounded-3xl p-6 sm:p-8 shadow-[0_12px_40px_rgba(15,23,42,0.06)]"
          >
            {currentQuestion && (
              <TaskRouter
                question={currentQuestion}
                onAnswer={handleAnswer}
                showFeedback={showFeedback}
                disabled={disabled}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
