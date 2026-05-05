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

const PILLAR_LABELS: Record<string, string> = {
  reading: 'Reading',
  writing: 'Writing',
  listening: 'Listening',
  speaking: 'Speaking',
};

const PILLAR_EMOJIS: Record<string, string> = {
  reading: '📖',
  writing: '✏️',
  listening: '🎧',
  speaking: '🎤',
};

const DIFFICULTY_BADGES: Record<string, { label: string; color: string }> = {
  easy: { label: 'Easy', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  medium: { label: 'Medium', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  hard: { label: 'Hard', color: 'bg-rose-100 text-rose-700 border-rose-200' },
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
    { id: 'reading', name: 'Reading', icon: <BookOpen size={48} />, bgColor: 'bg-blue-600' },
    { id: 'writing', name: 'Writing', icon: <Edit3 size={48} />, bgColor: 'bg-emerald-600' },
    { id: 'listening', name: 'Listening', icon: <Headphones size={48} />, bgColor: 'bg-amber-500' },
    { id: 'speaking', name: 'Speaking', icon: <Mic size={48} />, bgColor: 'bg-rose-600' },
  ];

  const diffBadge = performance
    ? DIFFICULTY_BADGES[performance.difficulty_recommendation] || DIFFICULTY_BADGES.medium
    : null;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Page header */}
      <h1 className="font-baloo text-2xl sm:text-3xl font-extrabold text-amber-950 mb-1">Learning Missions</h1>
      <p className="font-nunito text-sm text-amber-800/70 mb-5">Choose a pillar to start practicing</p>

      {/* Progress banner */}
      {!perfLoading && performance && performance.overall_accuracy > 0 && (
        <div className="mb-6 rounded-[20px] bg-gradient-to-r from-amber-100 via-amber-200 to-amber-300 border-2 border-amber-400 p-5 shadow-[0_6px_24px_rgba(245,158,11,0.2)]">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-nunito font-semibold text-xs text-amber-800/70 mb-1">Your Performance</p>
              <h2 className="font-baloo font-extrabold text-xl text-amber-950 leading-none">
                {Math.round(performance.overall_accuracy)}% <span className="font-medium text-base opacity-70">accuracy</span>
              </h2>
            </div>
            <div className="text-center">
              {diffBadge && (
                <span className={`text-xs font-baloo font-bold px-3 py-1 rounded-full border ${diffBadge.color}`}>
                  Level: {diffBadge.label}
                </span>
              )}
            </div>
          </div>

          {/* Pillar chips */}
          <div className="flex gap-2 flex-wrap">
            {(['reading', 'writing', 'listening', 'speaking'] as const).map((p) => {
              const acc = performance.pillar_accuracy[p] ?? 0;
              const hasActivity = acc > 0;
              return (
                <div
                  key={p}
                  className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1 border text-xs font-nunito font-bold transition-all ${
                    hasActivity
                      ? 'bg-white border-amber-300 text-amber-950'
                      : 'bg-white/40 border-white/30 text-amber-800/50 opacity-60'
                  }`}
                >
                  <span className="text-sm">{PILLAR_EMOJIS[p]}</span>
                  <span>{PILLAR_LABELS[p]}</span>
                  {hasActivity && <span className="text-amber-600">{acc}%</span>}
                </div>
              );
            })}
          </div>

          {/* Weak/strong indicators */}
          {(performance.weak_topics.length > 0 || performance.strong_topics.length > 0) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {performance.weak_topics.map((t) => (
                <span key={t.topic} className="text-xs px-2 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200 font-nunito font-bold">
                  Practice more: {PILLAR_LABELS[t.topic] || t.topic}
                </span>
              ))}
              {performance.strong_topics.map((t) => (
                <span key={t.topic} className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-nunito font-bold">
                  Strong: {PILLAR_LABELS[t.topic] || t.topic}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Section label */}
      <div className="flex items-center gap-2.5 mb-4">
        <span className="font-baloo font-extrabold text-xs text-amber-700 uppercase tracking-widest">Choose a Pillar</span>
        <div className="flex-1 h-[1.5px] bg-gradient-to-r from-amber-300 to-transparent" />
        <span className="font-nunito font-semibold text-xs text-amber-700/60">Tap any card</span>
      </div>

      {/* 2x2 Pillar grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {pillars.map((pillar) => (
          <PillarCard
            key={pillar.id}
            pillar={pillar.id}
            bgColor={pillar.bgColor}
            icon={pillar.icon}
          />
        ))}
      </div>

      {/* Hint footer */}
      <div className="mt-5 bg-gradient-to-r from-amber-100 to-amber-50 rounded-2xl p-3.5 flex items-center gap-2.5 border border-amber-200">
        <span className="text-xl">💡</span>
        <span className="font-baloo font-bold text-sm text-amber-800">
          Complete all 4 pillars every day to keep your streak alive!
        </span>
      </div>
    </div>
  );
}
