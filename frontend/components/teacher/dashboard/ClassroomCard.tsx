// frontend/components/teacher/dashboard/ClassroomCard.tsx

"use client";

import { useState } from 'react';
import { designTokens } from '@/lib/design-tokens';
import { ProgressBar } from '@/components/teacher/design-system';

interface ClassroomCardProps {
  gradeLevel: string;
  gradeColor: string;
  subject: string;
  topic: string;
  studentCount: number;
  accuracy: number;
  onView: () => void;
  onReports: () => void;
}

export function ClassroomCard({
  gradeLevel,
  gradeColor,
  subject,
  topic,
  studentCount,
  accuracy,
  onView,
  onReports,
}: ClassroomCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const accuracyColor =
    accuracy >= 80 ? designTokens.colors.success :
    accuracy >= 65 ? designTokens.colors.warning :
    designTokens.colors.danger;

  return (
    <div
      className="bg-white rounded-lg border overflow-hidden cursor-pointer transition-all"
      style={{
        borderRadius: designTokens.borderRadius.lg,
        borderColor: designTokens.colors.slate[200],
        boxShadow: isHovered ? designTokens.effects.hoverShadow : designTokens.effects.cardShadow,
        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
        transition: `all ${designTokens.effects.transition.base}`,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Top color stripe */}
      <div className="h-1" style={{ backgroundColor: gradeColor }} />

      {/* Content */}
      <div className="p-4">
        {/* Grade badge and student count */}
        <div className="flex justify-between items-center mb-2.5">
          <span
            className="px-2.5 py-1 rounded-full text-xs font-bold"
            style={{
              backgroundColor: `${gradeColor}1a`,
              color: gradeColor,
              fontFamily: designTokens.typography.heading,
              fontSize: designTokens.typography.sizes.sm,
              fontWeight: designTokens.typography.weights.bold,
            }}
          >
            {gradeLevel}
          </span>
          <span
            className="text-xs"
            style={{
              color: designTokens.colors.slate[500],
              fontSize: '11px',
            }}
          >
            {studentCount} students
          </span>
        </div>

        {/* Subject and topic */}
        <div
          className="font-semibold mb-1"
          style={{
            color: designTokens.colors.dark,
            fontSize: '14.5px',
            fontWeight: designTokens.typography.weights.semibold,
          }}
        >
          {subject}
        </div>
        <div
          className="text-xs mb-3"
          style={{
            color: designTokens.colors.slate[500],
            fontSize: '11.5px',
          }}
        >
          Topic: {topic}
        </div>

        {/* Accuracy */}
        <div className="mb-3">
          <div className="flex justify-between mb-1">
            <span
              className="text-xs"
              style={{
                color: designTokens.colors.slate[600],
                fontSize: '11px',
              }}
            >
              Accuracy
            </span>
            <span
              className="text-xs font-bold"
              style={{
                color: accuracyColor,
                fontSize: designTokens.typography.sizes.sm,
                fontWeight: designTokens.typography.weights.bold,
                fontFamily: designTokens.typography.heading,
              }}
            >
              {accuracy}%
            </span>
          </div>
          <ProgressBar value={accuracy} color={accuracyColor} height={6} />
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={onView}
            className="flex-1 py-2 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90"
            style={{
              backgroundColor: gradeColor,
              fontFamily: designTokens.typography.body,
              fontSize: designTokens.typography.sizes.sm,
              fontWeight: designTokens.typography.weights.semibold,
              borderRadius: designTokens.borderRadius.sm,
            }}
          >
            View Class
          </button>
          <button
            onClick={onReports}
            className="flex-1 py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-90"
            style={{
              backgroundColor: designTokens.colors.slate[100],
              color: designTokens.colors.primary,
              fontFamily: designTokens.typography.body,
              fontSize: designTokens.typography.sizes.sm,
              fontWeight: designTokens.typography.weights.semibold,
              borderRadius: designTokens.borderRadius.sm,
            }}
          >
            Reports
          </button>
        </div>
      </div>
    </div>
  );
}
