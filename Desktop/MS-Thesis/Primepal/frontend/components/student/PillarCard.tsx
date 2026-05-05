'use client';

import Link from 'next/link';

interface PillarCardProps {
  pillar: 'reading' | 'writing' | 'listening' | 'speaking';
  bgColor: string;
  icon: React.ReactNode;
  gradient?: string;
  shadowColor?: string;
  tip?: string;
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

export default function PillarCard({ pillar }: PillarCardProps) {
  const config = PILLAR_CONFIG[pillar];
  const pillarName = pillar.charAt(0).toUpperCase() + pillar.slice(1);

  return (
    <Link href={`/student/missions/${pillar}`} aria-label={`Start ${pillar} mission`}>
      <div
        className={`bg-gradient-to-br ${config.gradient} rounded-[20px] p-5 sm:p-6 flex flex-col gap-3 cursor-pointer
                    border border-white/20 relative overflow-hidden
                    transition-transform duration-150 hover:-translate-y-[3px] active:translate-y-0 min-h-[180px] sm:min-h-[210px]`}
        style={{
          boxShadow: `0 7px 0 ${config.shadow}, 0 10px 28px ${config.shadow}55`,
        }}
      >
        {/* Shine overlay */}
        <div className="absolute top-0 left-0 right-0 h-[38%] bg-gradient-to-b from-white/[0.18] to-transparent rounded-t-[20px] pointer-events-none" />

        {/* Icon */}
        <div className="text-4xl sm:text-5xl animate-floatUp drop-shadow-md" style={{ animationDuration: '3.5s' }}>
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
