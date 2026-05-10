// frontend/components/teacher/dashboard/QuickAction.tsx

"use client";

import { useState } from 'react';
import { LucideIcon } from 'lucide-react';
import { designTokens } from '@/lib/design-tokens';

interface QuickActionProps {
  label: string;
  icon: LucideIcon;
  color: string;
  bg: string;
  onClick?: () => void;
}

export function QuickAction({ label, icon: Icon, color, bg, onClick }: QuickActionProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="flex flex-col items-center gap-2 p-3 border rounded-lg flex-1 min-w-0 transition-all"
      style={{
        backgroundColor: isHovered ? bg : 'white',
        borderColor: isHovered ? color : designTokens.colors.slate[200],
        borderRadius: designTokens.borderRadius.md,
        transition: `all ${designTokens.effects.transition.fast}`,
        fontFamily: designTokens.typography.body,
      }}
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center"
        style={{
          backgroundColor: bg,
          borderRadius: designTokens.borderRadius.base,
        }}
      >
        <Icon size={17} strokeWidth={1.8} color={color} />
      </div>
      <span
        className="text-xs font-semibold text-center leading-tight"
        style={{
          color: designTokens.colors.slate[800],
          fontSize: '11px',
          fontWeight: designTokens.typography.weights.semibold,
        }}
      >
        {label}
      </span>
    </button>
  );
}
