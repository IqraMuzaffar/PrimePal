// frontend/components/teacher/classrooms/GradeCard.tsx

"use client";

import { useState } from 'react';
import { designTokens } from '@/lib/design-tokens';

interface GradeCardProps {
  grade: string;
  gradeNumber: number;
  color: string;
  subject: string;
  topic: string;
  studentCount: number;
  accuracy: number;
  isSelected: boolean;
  onClick: () => void;
}

export function GradeCard({
  grade,
  gradeNumber,
  color,
  subject,
  topic,
  studentCount,
  accuracy,
  isSelected,
  onClick,
}: GradeCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const accuracyColor =
    accuracy >= 80 ? designTokens.colors.success :
    accuracy >= 65 ? designTokens.colors.warning :
    designTokens.colors.danger;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="bg-white rounded-lg overflow-hidden cursor-pointer transition-all"
      style={{
        borderRadius: designTokens.borderRadius.lg,
        border: `2px solid ${isSelected ? color : isHovered ? `${color}55` : designTokens.colors.slate[200]}`,
        boxShadow: isSelected ? `0 4px 20px ${color}30` : isHovered ? '0 4px 12px rgba(0,0,0,0.08)' : designTokens.effects.cardShadow,
        transform: isHovered && !isSelected ? 'translateY(-2px)' : 'translateY(0)',
        transition: `all ${designTokens.effects.transition.base}`,
      }}
    >
      {/* Top color stripe */}
      <div className="h-1" style={{ backgroundColor: color }} />

      {/* Content */}
      <div className="p-3.5">
        {/* Grade badge and accuracy */}
        <div className="flex justify-between items-center mb-2">
          <span
            className="px-2.5 py-1 rounded-full text-xs font-bold"
            style={{
              backgroundColor: `${color}18`,
              color: color,
              fontFamily: designTokens.typography.heading,
              fontSize: designTokens.typography.sizes.sm,
              fontWeight: designTokens.typography.weights.bold,
            }}
          >
            {grade}
          </span>
          <span
            className="text-base font-extrabold"
            style={{
              color: accuracyColor,
              fontFamily: designTokens.typography.heading,
              fontWeight: designTokens.typography.weights.extrabold,
            }}
          >
            {accuracy}%
          </span>
        </div>

        {/* Subject and topic */}
        <div
          className="font-semibold mb-0.5"
          style={{
            color: designTokens.colors.dark,
            fontSize: '13.5px',
            fontWeight: designTokens.typography.weights.semibold,
          }}
        >
          {subject}
        </div>
        <div
          className="text-xs mb-2.5"
          style={{
            color: designTokens.colors.slate[500],
            fontSize: '11px',
          }}
        >
          {topic}
        </div>

        {/* Student count and selected indicator */}
        <div className="flex justify-between items-center">
          <span
            className="text-xs"
            style={{
              color: designTokens.colors.slate[600],
              fontSize: '11.5px',
            }}
          >
            {studentCount} students
          </span>
          {isSelected && (
            <span
              className="text-xs font-semibold"
              style={{
                color: color,
                fontSize: '11px',
                fontWeight: designTokens.typography.weights.semibold,
              }}
            >
              Selected ✓
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
