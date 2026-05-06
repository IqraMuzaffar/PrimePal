// frontend/components/teacher/design-system/TopBar.tsx

"use client";

import { Bell } from 'lucide-react';
import { designTokens } from '@/lib/design-tokens';

interface TopBarProps {
  pageTitle: string;
  userEmail?: string;
}

export function TopBar({ pageTitle, userEmail }: TopBarProps) {
  const today = new Date();
  const dateString = today.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Calculate current week (simplified)
  const startOfYear = new Date(today.getFullYear(), 0, 1);
  const days = Math.floor((today.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((days + 1) / 7);

  return (
    <div
      className="h-16 bg-white flex items-center px-7 gap-4 shrink-0 border-b"
      style={{ borderColor: '#e8eaf0' }}
    >
      {/* Left: Title + Date */}
      <div className="flex-1">
        <div
          className="font-bold text-lg leading-tight"
          style={{
            color: designTokens.colors.dark,
            fontFamily: designTokens.typography.heading,
            fontSize: designTokens.typography.sizes.xl,
          }}
        >
          {pageTitle}
        </div>
        <div
          className="text-xs mt-0.5"
          style={{
            color: '#9aa8c9',
            fontSize: designTokens.typography.sizes.xs,
          }}
        >
          {dateString} · Term 2, Week {weekNumber}
        </div>
      </div>

      {/* Right: Bell + Avatar */}
      <div className="flex items-center gap-2.5">
        {/* Bell icon with notification dot */}
        <button
          className="w-10 h-10 rounded-lg flex items-center justify-center relative transition-colors hover:bg-gray-100"
          style={{ backgroundColor: '#f4f5fb' }}
        >
          <Bell size={17} strokeWidth={1.8} color={designTokens.colors.primary} />
          <span
            className="absolute top-2 right-2 w-2 h-2 rounded-full border-2 border-white"
            style={{ backgroundColor: designTokens.colors.danger }}
          />
        </button>

        {/* User avatar */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm cursor-pointer"
          style={{
            background: `linear-gradient(135deg, ${designTokens.colors.primary} 0%, ${designTokens.colors.primaryLight} 100%)`,
            fontFamily: designTokens.typography.heading,
          }}
        >
          {userEmail?.[0]?.toUpperCase() || 'T'}
        </div>
      </div>
    </div>
  );
}
