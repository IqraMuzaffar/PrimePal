"use client";

import React from "react";
import { Users, Trophy, AlertCircle } from "lucide-react";
import { ProgressBar } from "@/components/teacher/design-system";
import { TeacherGradeBreakdown } from "@/types/analytics";

interface GradeBreakdownProps {
  breakdown: TeacherGradeBreakdown[];
  gradeLevel?: number;
}

export default function GradeBreakdown({ breakdown, gradeLevel }: GradeBreakdownProps) {
  const gradeColors: Record<number, string> = {
    1: "#4361ee",
    2: "#10b981",
    3: "#f59e0b",
    4: "#ef4444",
    5: "#8b5cf6",
    6: "#ec4899",
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-4">Grade Performance</h2>
      <div className="space-y-4">
        {breakdown.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-8">
            No grade data available
          </p>
        )}
        {breakdown.map((grade) => {
          const isSelected = gradeLevel === grade.grade_level;
          const opacity = !gradeLevel || isSelected ? "opacity-100" : "opacity-40";
          
          return (
            <div
              key={grade.grade_level}
              className={`border rounded-lg p-4 transition-all ${opacity} ${
                isSelected ? "border-2 border-indigo-400 bg-indigo-50" : "border-gray-200"
              }`}
            >
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs font-bold px-2.5 py-1 rounded-full"
                    style={{
                      backgroundColor: `${gradeColors[grade.grade_level] || "#6b7280"}18`,
                      color: gradeColors[grade.grade_level] || "#6b7280",
                    }}
                  >
                    Grade {grade.grade_level}
                  </span>
                  <span className="text-sm text-gray-600 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {grade.student_count}
                  </span>
                </div>
                <span className="text-lg font-bold" style={{ color: gradeColors[grade.grade_level] }}>
                  {grade.avg_accuracy}%
                </span>
              </div>

              <ProgressBar
                value={grade.avg_accuracy}
                color={gradeColors[grade.grade_level] || "#6b7280"}
                height={6}
              />

              <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-gray-100">
                <div className="text-xs">
                  <span className="text-gray-500">Interactions</span>
                  <p className="font-semibold text-gray-900">{grade.total_interactions}</p>
                </div>
                {grade.top_student && (
                  <div className="text-xs">
                    <span className="text-gray-500 flex items-center gap-1">
                      <Trophy className="w-3 h-3" /> Top
                    </span>
                    <p className="font-semibold text-gray-900 truncate">
                      {grade.top_student.name}
                    </p>
                  </div>
                )}
                <div className="text-xs">
                  <span className="text-gray-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Struggling
                  </span>
                  <p className="font-semibold text-gray-900">{grade.struggling_count}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
