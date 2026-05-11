'use client';

import { useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import MissionGameplay from '@/components/student/MissionGameplay';
import LoadingCountdown from '@/components/student/LoadingCountdown';
import { MissionQuestion } from '@/types/missions';
import { useNetworkStatus } from '@/lib/use-network-status';
import { addPendingAnswer, flushPendingAnswers } from '@/lib/network-queue';
import { useMissionPillar } from '@/lib/hooks/queries';
import { useMissionBatchSubmit } from '@/lib/hooks/mutations';

interface GameResult {
  question_id: number;
  is_correct: boolean;
  time_remaining: number;
  task_type: string;
  points_value: number;
  skipped?: boolean;
  answered_at: string;
}

export default function PillarMissionPage() {
  const params = useParams();
  const router = useRouter();
  const pillar = params.pillar as string;
  const { isOnline } = useNetworkStatus();
  const batchSubmit = useMissionBatchSubmit();

  const { data, isLoading: loading, error: queryError } = useMissionPillar(pillar);
  const questions: MissionQuestion[] = data?.questions ?? [];
  const isPillarCompleted = queryError?.message?.includes('completed for today') || queryError?.message?.includes('429');
  const error = queryError && !isPillarCompleted ? 'Failed to load questions' : null;

  useEffect(() => {
    const token = typeof window !== 'undefined'
      ? localStorage.getItem('primepal_student_token')
      : null;
    if (token && isOnline) {
      flushPendingAnswers(token).catch(() => {});
    }
  }, [isOnline]);

  const submittedRef = useRef(false);

  const handleComplete = async (results: GameResult[]) => {
    // Guard against double submission (React re-renders, double-clicks, etc.)
    if (submittedRef.current) return;
    submittedRef.current = true;

    const token = typeof window !== 'undefined'
      ? localStorage.getItem('primepal_student_token')
      : null;
    if (!token) { router.push('/student/missions'); return; }

    // Only submit actually attempted questions (exclude skipped/timed-out)
    const attempted = results.filter(r => !r.skipped);
    if (attempted.length === 0) { router.push('/student/missions'); return; }

    const answers = attempted.map(result => ({
      question_correct: result.is_correct,
      task_type: result.task_type,
      pillar: pillar,
      points_value: result.points_value,
      submitted_at: result.answered_at, // use actual answer time for idempotency
    }));

    try {
      await batchSubmit.mutateAsync(answers);
    } catch {
      // Offline fallback: queue individual answers
      for (const result of attempted) {
        addPendingAnswer({
          student_id: '',
          question_id: result.question_id,
          answer_data: null,
          pillar: pillar,
          task_type: result.task_type,
          points_value: result.points_value,
          question_correct: result.is_correct,
          timestamp: result.answered_at,
        });
      }
    }

    router.push('/student/missions');
  };

  if (isPillarCompleted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-student-bg px-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-3xl shadow-[0_24px_48px_rgba(0,0,0,0.12)] border-2 border-emerald-200 p-8 max-w-md w-full text-center"
        >
          <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h2 className="font-baloo font-extrabold text-2xl text-slate-800 mb-2">
            Pillar Complete!
          </h2>
          <p className="font-nunito text-slate-500 mb-4">
            You&apos;ve finished all <span className="font-bold text-emerald-600">10/10</span> questions
            for <span className="font-bold capitalize">{pillar}</span> today.
          </p>
          <div className="bg-emerald-50 rounded-2xl px-4 py-3 mb-6">
            <p className="font-nunito text-sm text-emerald-700">
              Great work! Try another pillar or come back tomorrow.
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push('/student/missions')}
            className="w-full py-4 rounded-2xl font-baloo font-extrabold text-lg text-white bg-gradient-to-r from-violet-500 to-pink-500 shadow-[0_6px_0_#7c3aed,0_8px_18px_rgba(139,92,246,0.3)] active:translate-y-1 active:shadow-[0_2px_0_#7c3aed] transition-all"
          >
            Back to Missions
          </motion.button>
        </motion.div>
      </div>
    );
  }

  if (loading) {
    return (
      <LoadingCountdown
        loadingText="Preparing your questions..."
        emoji="🎯"
      />
    );
  }

  if (error || questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-student-bg">
        <div className="text-center">
          <p className="text-red-600 text-lg mb-4">{error || 'No questions available'}</p>
          <button onClick={() => router.back()} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return <MissionGameplay questions={questions} pillar={pillar} onComplete={handleComplete} />;
}
