// frontend/components/teacher/design-system/StatCard.tsx

import { LucideIcon } from 'lucide-react';
import { designTokens } from '@/lib/design-tokens';

interface StatCardProps {
  value: string | number;
  label: string;
  subtitle?: string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  trend?: number;
}

export function StatCard({
  value,
  label,
  subtitle,
  icon: Icon,
  iconColor,
  iconBg,
  trend,
}: StatCardProps) {
  const trendColor = trend !== undefined && trend >= 0
    ? designTokens.colors.success
    : designTokens.colors.danger;
  const trendBg = trend !== undefined && trend >= 0
    ? designTokens.colors.successBg
    : designTokens.colors.dangerBg;

  return (
    <div
      className="bg-white rounded-xl p-5 flex-1 min-w-0 border"
      style={{
        borderRadius: designTokens.borderRadius.lg,
        borderColor: designTokens.colors.slate[200],
        boxShadow: designTokens.effects.cardShadow,
        padding: designTokens.spacing.card,
      }}
    >
      {/* Icon and Trend */}
      <div className="flex justify-between items-start mb-3.5">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{
            backgroundColor: iconBg,
            borderRadius: '11px',
          }}
        >
          <Icon size={19} strokeWidth={1.8} color={iconColor} />
        </div>
        {trend !== undefined && (
          <span
            className="text-xs font-semibold rounded-full px-2 py-1"
            style={{
              color: trendColor,
              backgroundColor: trendBg,
              fontSize: '11.5px',
              fontWeight: designTokens.typography.weights.semibold,
            }}
          >
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>

      {/* Value */}
      <div
        className="text-3xl font-extrabold leading-none"
        style={{
          color: designTokens.colors.slate[900],
          fontFamily: designTokens.typography.heading,
          fontWeight: designTokens.typography.weights.extrabold,
        }}
      >
        {value}
      </div>

      {/* Label */}
      <div
        className="font-semibold mt-1.5"
        style={{
          color: designTokens.colors.slate[600],
          fontSize: designTokens.typography.sizes.base,
          fontWeight: designTokens.typography.weights.semibold,
        }}
      >
        {label}
      </div>

      {/* Subtitle */}
      {subtitle && (
        <div
          className="mt-0.5"
          style={{
            color: designTokens.colors.slate[500],
            fontSize: designTokens.typography.sizes.xs,
          }}
        >
          {subtitle}
        </div>
      )}
    </div>
  );
}
