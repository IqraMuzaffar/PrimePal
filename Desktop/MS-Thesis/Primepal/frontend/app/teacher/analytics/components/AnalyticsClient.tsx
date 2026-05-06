"use client";

import React from "react";
import FilterBar from "@/components/teacher/FilterBar";
import { TeacherAnalyticsData } from "@/types/analytics";
import AnalyticsOverview from "./AnalyticsOverview";
import GradeBreakdown from "./GradeBreakdown";
import SkillBreakdown from "./SkillBreakdown";
import StudentRankings from "./StudentRankings";
import PerformanceTrends from "./PerformanceTrends";

interface AnalyticsClientProps {
  data?: TeacherAnalyticsData;
  isLoading: boolean;
  error: any;
  gradeLevel?: number;
  pillar?: string;
  section?: string;
}

export default function AnalyticsClient({
  data,
  isLoading,
  error,
  gradeLevel,
  pillar,
  section,
}: AnalyticsClientProps) {
  if (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Analytics Dashboard</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p className="font-semibold">Failed to load analytics data.</p>
          <p className="text-sm mt-1 font-mono">{msg}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Analytics Dashboard</h1>
        <FilterBar showSearch={false} showPillar={true} showSection={true} />
        <div className="grid grid-cols-1 gap-6 mt-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-gray-200 p-6 h-64 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Analytics Dashboard</h1>
      
      <FilterBar showSearch={false} showPillar={true} showSection={true} />

      {data && (
        <div className="space-y-6 mt-6">
          <AnalyticsOverview stats={data.summary_stats} pillar={pillar} />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GradeBreakdown breakdown={data.grade_breakdown} gradeLevel={gradeLevel} />
            <SkillBreakdown breakdown={data.pillar_breakdown} pillar={pillar} />
          </div>

          <StudentRankings
            topStudents={data.top_students}
            strugglingStudents={data.struggling_students}
          />

          <PerformanceTrends trends={data.weekly_trends} pillar={pillar} />
        </div>
      )}

      {data && data.summary_stats.total_students === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center mt-6">
          <p className="text-gray-500 font-medium">No analytics data available</p>
          <p className="text-sm text-gray-400 mt-1">
            Students need to complete missions to generate analytics
          </p>
        </div>
      )}
    </div>
  );
}
