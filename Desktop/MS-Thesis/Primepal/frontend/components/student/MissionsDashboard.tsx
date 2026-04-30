'use client';

import { useEffect, useState } from 'react';
import PillarCard from '@/components/student/PillarCard';
import { BookOpen, Edit3, Headphones, Mic } from 'lucide-react';
import { apiFetch } from '@/lib/api';

type PillarType = 'reading' | 'writing' | 'listening' | 'speaking';

interface PerformanceProfile {
  overall_accuracy: number;
  pillar_accuracy: Record<string, number>;
  weak_topics: Array<{ topic: string; accuracy: number; suggested_difficulty: string }>;
  strong_topics: Array<{ topic: string; accuracy: number }>;
  difficulty_recommendation: string;
}

const PILLAR_COLORS: Record<string, string> = {
  reading: 'bg-red-500',
  writing: 'bg-blue-500',
  listening: 'bg-yellow-500',
  speaking: 'bg-green-500',
};

const PILLAR_LABELS: Record<string, string> = {
  reading: 'Reading',
  writing: 'Writing',
  listening: 'Listening',
  speaking: 'Speaking',
};

const DIFFICULTY_BADGES: Record<string, { label: string; color: string }> = {
  easy: { label: 'Easy', color: 'bg-green-100 text-green-700' },
  medium: { label: 'Medium', color: 'bg-yellow-100 text-yellow-700' },
  hard: { label: 'Hard', color: 'bg-red-100 text-red-700' },
};

export default function MissionsDashboard() {
  const [performance, setPerformance] = useState<PerformanceProfile | null>(null);
  const [perfLoading, setPerfLoading] = useState(true);

  useEffect(() => {
    const fetchPerformance = async () => {
      if (typeof window === 'undefined') return;
      const token = localStorage.getItem('primepal_student_token');
      if (!token) { setPerfLoading(false); return; }

      try {
        const data = await apiFetch<PerformanceProfile>(
          '/missions/performance',
          { headers: { Authorization: `Bearer ${token}` } },
        );
        setPerformance(data);
      } catch {
        // Performance data is optional; silently ignore errors
      } finally {
        setPerfLoading(false);
      }
    };
    fetchPerformance();
  }, []);

  const pillars: Array<{
    id: PillarType;
    name: string;
    icon: React.ReactNode;
    bgColor: string;
  }> = [
    {
      id: 'reading',
      name: 'Reading',
      icon: <BookOpen size={48} />,
      bgColor: 'bg-red-600',
    },
    {
      id: 'writing',
      name: 'Writing',
      icon: <Edit3 size={48} />,
      bgColor: 'bg-blue-600',
    },
    {
      id: 'listening',
      name: 'Listening',
      icon: <Headphones size={48} />,
      bgColor: 'bg-yellow-500',
    },
    {
      id: 'speaking',
      name: 'Speaking',
      icon: <Mic size={48} />,
      bgColor: 'bg-green-600',
    },
  ];

  const diffBadge = performance
    ? DIFFICULTY_BADGES[performance.difficulty_recommendation] || DIFFICULTY_BADGES.medium
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 lg:p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 mb-2">Learning Missions</h1>
        <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8">Choose a pillar to start practicing</p>

        {/* Performance Summary Section */}
        {!perfLoading && performance && performance.overall_accuracy > 0 && (
          <div className="mb-6 sm:mb-8 bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Your Performance</h2>
              {diffBadge && (
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${diffBadge.color}`}>
                  Level: {diffBadge.label}
                </span>
              )}
            </div>

            {/* Overall accuracy */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">Overall Accuracy</span>
                <span className="text-sm font-semibold text-gray-800">{performance.overall_accuracy}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5">
                <div
                  className="bg-indigo-500 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(performance.overall_accuracy, 100)}%` }}
                />
              </div>
            </div>

            {/* Per-pillar accuracy bars */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {(['reading', 'writing', 'listening', 'speaking'] as const).map((p) => {
                const acc = performance.pillar_accuracy[p] ?? 0;
                const isWeak = performance.weak_topics.some((t) => t.topic === p);
                const isStrong = performance.strong_topics.some((t) => t.topic === p);
                return (
                  <div key={p} className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <span className="text-xs font-medium text-gray-700">{PILLAR_LABELS[p]}</span>
                      {isWeak && <span className="text-xs" title="Needs practice">*</span>}
                      {isStrong && <span className="text-xs" title="Strong area">!</span>}
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className={`${PILLAR_COLORS[p]} h-2 rounded-full transition-all duration-500`}
                        style={{ width: `${Math.min(acc, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 mt-0.5 block">{acc}%</span>
                  </div>
                );
              })}
            </div>

            {/* Weak/strong indicators */}
            {(performance.weak_topics.length > 0 || performance.strong_topics.length > 0) && (
              <div className="mt-4 flex flex-wrap gap-2">
                {performance.weak_topics.map((t) => (
                  <span key={t.topic} className="text-xs px-2 py-1 rounded-full bg-orange-50 text-orange-600 border border-orange-200">
                    Practice more: {PILLAR_LABELS[t.topic] || t.topic}
                  </span>
                ))}
                {performance.strong_topics.map((t) => (
                  <span key={t.topic} className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                    Strong: {PILLAR_LABELS[t.topic] || t.topic}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 2x2 Grid (responsive: 1 col mobile, 2x2 tablet+) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
          {pillars.map((pillar) => (
            <PillarCard
              key={pillar.id}
              pillar={pillar.id}
              bgColor={pillar.bgColor}
              icon={pillar.icon}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
