// frontend/components/teacher/design-system/TopBar.tsx

"use client";

import { Bell, CalendarDays } from 'lucide-react';
import { designTokens } from '@/lib/design-tokens';

interface TopBarProps {
  pageTitle: string;
  userEmail?: string;
}

export function TopBar({ pageTitle, userEmail }: TopBarProps) {
  const today = new Date();
  const _dateString = today.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const startOfYear = new Date(today.getFullYear(), 0, 1);
  const days = Math.floor((today.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((days + 1) / 7);

  return (
    <div
      className="flex items-center px-8 gap-4 shrink-0"
      style={{
        height: 72,
        backgroundColor: '#fff',
        borderBottom: '1px solid #eaecf4',
        boxShadow: '0 1px 6px rgba(15,23,41,0.05)',
      }}
    >
      {/* Left: Title + Date */}
      <div className="flex-1 flex items-center gap-4">
        {/* Accent bar */}
        <div
          style={{
            width: 4,
            height: 32,
            borderRadius: 4,
            background: `linear-gradient(180deg, ${designTokens.colors.primary} 0%, ${designTokens.colors.primaryLight} 100%)`,
            flexShrink: 0,
          }}
        />
        <div>
          <div
            className="font-bold leading-tight"
            style={{
              color: designTokens.colors.dark,
              fontSize: 20,
              letterSpacing: '-0.01em',
            }}
          >
            {pageTitle}
          </div>
        </div>

        {/* Date chip — sits between title and right actions */}
        <div
          className="flex items-center gap-2 ml-4"
          style={{
            backgroundColor: '#f4f5fb',
            border: '1px solid #e4e7f2',
            borderRadius: 12,
            padding: '6px 14px',
          }}
        >
          <CalendarDays size={14} strokeWidth={1.8} color={designTokens.colors.primary} />
          <span style={{ fontSize: 13, color: '#5a6e94', fontWeight: 500 }}>
            {today.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
          <span style={{ width: 1, height: 14, backgroundColor: '#dde1f0', margin: '0 2px' }} />
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: designTokens.colors.primary,
              letterSpacing: '0.02em',
            }}
          >
            Wk {weekNumber}
          </span>
        </div>
      </div>

      {/* Right: Bell + Avatar */}
      <div className="flex items-center gap-3">
        {/* Bell */}
        <button
          className="relative flex items-center justify-center rounded-xl transition-colors"
          style={{
            width: 42,
            height: 42,
            backgroundColor: '#f4f5fb',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = designTokens.colors.primaryBg)}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#f4f5fb')}
        >
          <Bell size={18} strokeWidth={1.8} color={designTokens.colors.primary} />
          <span
            className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full border-2 border-white"
            style={{ backgroundColor: designTokens.colors.danger }}
          />
        </button>

        {/* User info + avatar */}
        <div className="flex items-center gap-2.5 cursor-pointer group">
          <div className="text-right hidden sm:block">
            <div style={{ fontSize: 13, fontWeight: 600, color: designTokens.colors.dark }}>
              {userEmail?.split('@')[0] || 'Teacher'}
            </div>
            <div style={{ fontSize: 11, color: '#9aa8c9' }}>Teacher</div>
          </div>
          <div
            className="flex items-center justify-center text-white font-bold rounded-full shrink-0"
            style={{
              width: 42,
              height: 42,
              fontSize: 16,
              background: `linear-gradient(135deg, ${designTokens.colors.primary} 0%, ${designTokens.colors.primaryLight} 100%)`,
              boxShadow: '0 2px 10px rgba(67,97,238,0.3)',
            }}
          >
            {userEmail?.[0]?.toUpperCase() || 'T'}
          </div>
        </div>
      </div>
    </div>
  );
}
