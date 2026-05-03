'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import MissionGameplay from '@/components/student/MissionGameplay';
import { apiFetch } from '@/lib/api';
import { MissionQuestion } from '@/types/missions';
import { useNetworkStatus } from '@/lib/use-network-status';
import { addPendingAnswer, flushPendingAnswers } from '@/lib/network-queue';
import { useMissionPillar } from '@/lib/hooks/queries';

interface GameResult {
  question_id: number;
  is_correct: boolean;
  time_remaining: number;
  task_type: string;
  points_value: number;
}

export default function PillarMissionPage() {
  const params = useParams();
  const router = useRouter();
  const pillar = params.pillar as string;
  const { isOnline } = useNetworkStatus();

  const { data, isLoading: loading, error: queryError } = useMissionPillar(pillar);
  const questions: MissionQuestion[] = data?.questions ?? [];
  const error = queryError ? 'Failed to load questions' : null;

  // On mount, flush any pending answers from previous sessions
  useEffect(() => {
    const token = typeof window !== 'undefined'
      ? localStorage.getItem('primepal_student_token')
      : null;
    if (token && isOnline) {
      flushPendingAnswers(token).catch(() => {});
    }
  }, [isOnline]);

  const handleComplete = async (results: GameResult[]) => {
    const token = typeof window !== 'undefined'
      ? localStorage.getItem('primepal_student_token')
      : null;
    if (!token) { router.push('/student/missions'); return; }

    for (const result of results) {
      try {
        await apiFetch('/missions/complete', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            question_correct: result.is_correct,
            task_type: result.task_type,
            pillar: pillar,
            points_value: result.points_value,
            submitted_at: new Date().toISOString(),
          }),
        });
      } catch {
        // Network failure — queue the answer locally
        addPendingAnswer({
          student_id: '', // will be resolved from token on server
          question_id: result.question_id,
          answer_data: null,
          pillar: pillar,
          task_type: result.task_type,
          points_value: result.points_value,
          question_correct: result.is_correct,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Try to flush any previously queued answers
    flushPendingAnswers(token).catch(() => {});

    router.push('/student/missions');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600 text-lg">Loading questions...</p>
        </div>
      </div>
    );
  }

  if (error || questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
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
