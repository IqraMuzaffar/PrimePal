// frontend/components/teacher/dashboard/WelcomeBanner.tsx

import { designTokens } from '@/lib/design-tokens';
import { Plus } from 'lucide-react';

interface WelcomeBannerProps {
  teacherName: string;
  activeClasses: number;
  pendingMissions: number;
  onNewMission?: () => void;
}

export function WelcomeBanner({
  teacherName,
  activeClasses,
  pendingMissions,
  onNewMission,
}: WelcomeBannerProps) {
  return (
    <div
      className="rounded-2xl p-6 flex justify-between items-center mb-6"
      style={{
        background: `linear-gradient(135deg, ${designTokens.colors.dark} 0%, ${designTokens.colors.darkSecondary} 100%)`,
        borderRadius: designTokens.borderRadius.xl,
        boxShadow: designTokens.effects.darkShadow,
      }}
    >
      {/* Left: Welcome message */}
      <div>
        <h1
          className="text-2xl font-bold text-white"
          style={{
            fontFamily: designTokens.typography.heading,
            fontSize: designTokens.typography.sizes['2xl'],
            fontWeight: designTokens.typography.weights.bold,
          }}
        >
          Good morning, {teacherName} 👋
        </h1>
        <p className="text-white/55 text-sm mt-1">
          {activeClasses} active {activeClasses === 1 ? 'class' : 'classes'} · {pendingMissions} pending {pendingMissions === 1 ? 'mission' : 'missions'} today
        </p>
      </div>

      {/* Right: New Mission button */}
      <button
        onClick={onNewMission}
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all hover:bg-white/20"
        style={{
          backgroundColor: 'rgba(255,255,255,0.12)',
          border: '1px solid rgba(255,255,255,0.2)',
          color: 'white',
          fontFamily: designTokens.typography.body,
          fontSize: designTokens.typography.sizes.base,
          fontWeight: designTokens.typography.weights.semibold,
        }}
      >
        <Plus size={15} strokeWidth={2} />
        New Mission
      </button>
    </div>
  );
}
