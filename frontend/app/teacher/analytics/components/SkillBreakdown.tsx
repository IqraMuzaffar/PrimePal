"use client";

import React from "react";
import { BookOpenCheck, BookOpen, Headphones, MessageSquare, TrendingUp, TrendingDown } from "lucide-react";
import { ProgressBar } from "@/components/teacher/design-system";
import { TeacherPillarBreakdown } from "@/types/analytics";

interface SkillBreakdownProps {
  breakdown: TeacherPillarBreakdown[];
  pillar?: string;
}

export default function SkillBreakdown({ breakdown, pillar }: SkillBreakdownProps) {
  const pillarConfig: Record<string, { icon: any; color: string; label: string }> = {
    reading: { icon: BookOpenCheck, color: "#4361ee", label: "Reading" },
    writing: { icon: BookOpen, color: "#10b981", label: "Writing" },
    listening: { icon: Headphones, color: "#f59e0b", label: "Listening" },
    speaking: { icon: MessageSquare, color: "#ec4899", label: "Speaking" },
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-4">Skill Breakdown</h2>
      <div className="space-y-4">
        {breakdown.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-8">
            No skill data available
          </p>
        )}
        {breakdown.map((skill) => {
          const config = pillarConfig[skill.pillar] || pillarConfig.reading;
          const Icon = config.icon;
          const isSelected = pillar === skill.pillar;
          const opacity = !pillar || isSelected ? "opacity-100" : "opacity-40";

          return (
            <div
              key={skill.pillar}
              className={`border rounded-lg p-4 transition-all ${opacity} ${
                isSelected ? "border-2 border-indigo-400 bg-indigo-50" : "border-gray-200"
              }`}
            >
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4" style={{ color: config.color }} />
                  <span className="text-sm font-semibold text-gray-900">
                    {config.label}
                  </span>
                </div>
                <span className="text-lg font-bold" style={{ color: config.color }}>
                  {skill.avg_accuracy}%
                </span>
              </div>

              <ProgressBar value={skill.avg_accuracy} color={config.color} height={6} />

              <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-gray-100">
                <div className="text-xs">
                  <span className="text-gray-500">Attempts</span>
                  <p className="font-semibold text-gray-900">{skill.total_attempts}</p>
                </div>
                <div className="text-xs">
                  <span className="text-gray-500 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-emerald-600" /> Excelling
                  </span>
                  <p className="font-semibold text-gray-900">{skill.top_performers}</p>
                </div>
                <div className="text-xs">
                  <span className="text-gray-500 flex items-center gap-1">
                    <TrendingDown className="w-3 h-3 text-rose-600" /> Needs Help
                  </span>
                  <p className="font-semibold text-gray-900">{skill.needs_help}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
