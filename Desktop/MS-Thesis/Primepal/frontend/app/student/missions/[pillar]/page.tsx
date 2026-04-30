'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import MissionGameplay from '@/components/student/MissionGameplay';
import { apiFetch } from '@/lib/api';
import { MissionQuestion } from '@/types/missions';

interface GameResult {
  question_id: number;
  is_correct: boolean;
  time_remaining: number;
  task_type: string;
}

export default function PillarMissionPage() {
  const params = useParams();
  const router = useRouter();
  const pillar = params.pillar as string;

  const [questions, setQuestions] = useState<MissionQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuestions = async () => {
      if (typeof window === 'undefined') return;
      const token = localStorage.getItem('primepal_student_token');
      if (!token) { setError('User not logged in'); return; }

      try {
        const response = await apiFetch<{ questions: MissionQuestion[] }>(
          `/missions/pillar?pillar=${pillar}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        setQuestions(response.questions);
      } catch (err) {
        setError('Failed to load questions');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchQuestions();
  }, [pillar]);

  const handleComplete = async (results: GameResult[]) => {
    try {
      const token = localStorage.getItem('primepal_student_token');
      if (!token) { router.push('/student/missions'); return; }

      for (const result of results) {
        await apiFetch('/missions/complete', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            question_correct: result.is_correct,
            task_type: result.task_type,
            pillar: pillar,
          }),
        });
      }

      router.push('/student/missions');
    } catch (err) {
      console.error('Failed to save results', err);
      router.push('/student/missions');
    }
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
