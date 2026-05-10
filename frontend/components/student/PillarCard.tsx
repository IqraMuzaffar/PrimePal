'use client';

import Link from 'next/link';
import { CheckCircle } from 'lucide-react';

interface PillarCardProps {
  pillar: 'reading' | 'writing' | 'listening' | 'speaking';
  bgColor: string;
  icon: React.ReactNode;
  gradient?: string;
  shadowColor?: string;
  tip?: string;
  done?: number;
  completed?: boolean;
}

const PILLAR_CONFIG: Record<string, { gradient: string; shadow: string; tip: string }> = {
  reading: {
    gradient: 'from-blue-900 via-blue-600 to-blue-500',
    shadow: '#1e3a8a',
    tip: 'Match words to pictures!',
  },
  writing: {
    gradient: 'from-emerald-900 via-emerald-600 to-emerald-500',
    shadow: '#064e3b',
    tip: 'Put sentences in order!',
  },
  listening: {
    gradient: 'from-amber-900 via-amber-600 to-amber-500',
    shadow: '#78350f',
    tip: 'Hear it, then choose!',
  },
  speaking: {
    gradient: 'from-rose-900 via-rose-600 to-rose-500',
    shadow: '#881337',
    tip: 'Speak out loud!',
  },
};

const PILLAR_ICONS: Record<string, string> = {
  reading: '📖',
  writing: '✏️',
  listening: '🎧',
  speaking: '🎤',
};

export default function PillarCard({ pillar, done = 0, completed = false }: PillarCardProps) {
  const config = PILLAR_CONFIG[pillar];
  const pillarName = pillar.charAt(0).toUpperCase() + pillar.slice(1);

  if (completed) {
    return (
      <div
        className="relative rounded-3xl p-7 flex flex-col gap-3 min-h-[160px] border-2 border-emerald-200 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
        }}
      >
        {/* Checkmark overlay */}
        <div className="absolute top-4 right-4">
          <CheckCircle size={32} className="text-emerald-500" strokeWidth={2.5} />
        </div>

        {/* Icon — faded */}
        <div className="text-5xl sm:text-6xl opacity-40 grayscale">
          {PILLAR_ICONS[pillar]}
        </div>

        {/* Info */}
        <div>
          <h3 className="font-baloo font-extrabold text-xl sm:text-2xl text-emerald-800 leading-none">
            {pillarName}
          </h3>
          <p className="font-nunito font-bold text-sm text-emerald-600 mt-1">
            {done}/10 Done Today
          </p>
        </div>

        {/* Completed badge */}
        <div className="mt-auto">
          <div className="inline-flex items-center gap-1.5 bg-emerald-500 text-white rounded-xl px-4 py-2 font-baloo font-extrabold text-xs shadow-md">
            <CheckCircle size={14} />
            Completed!
          </div>
        </div>
      </div>
    );
  }

  return (
    <Link href={`/student/missions/${pillar}`} aria-label={`Start ${pillar} mission`}>
      <div
        className={`bg-gradient-to-br ${config.gradient} rounded-3xl p-7 flex flex-col gap-3 cursor-pointer
                    border border-white/20 relative overflow-hidden
                    transition-transform duration-150 hover:-translate-y-1.5 active:translate-y-0 min-h-[160px]
                    shadow-[0_12px_24px_rgba(15,23,42,0.10)] hover:shadow-[0_24px_48px_rgba(0,0,0,0.18)]`}
      >
        {/* Shine overlay */}
        <div className="absolute top-0 left-0 right-0 h-[38%] bg-gradient-to-b from-white/[0.18] to-transparent rounded-t-[20px] pointer-events-none" />

        {/* Progress indicator */}
        {done > 0 && (
          <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm rounded-full px-2.5 py-1 font-baloo font-extrabold text-xs text-white">
            {done}/10
          </div>
        )}

        {/* Icon */}
        <div className="text-5xl sm:text-6xl animate-floatUp drop-shadow-md" style={{ animationDuration: '3.5s' }}>
          {PILLAR_ICONS[pillar]}
        </div>

        {/* Info */}
        <div>
          <h3 className="font-baloo font-extrabold text-xl sm:text-2xl text-white drop-shadow-sm leading-none">
            {pillarName}
          </h3>
          <p className="font-nunito font-semibold text-xs sm:text-sm text-white/75 mt-1">{config.tip}</p>
        </div>

        {/* Start button */}
        <div className="mt-auto">
          <div className="inline-flex items-center bg-white/20 border border-white/40 rounded-xl px-3 py-1.5 font-baloo font-extrabold text-xs text-white transition-colors hover:bg-white/30">
            ▶ Start →
          </div>
        </div>
      </div>
    </Link>
  );
}
