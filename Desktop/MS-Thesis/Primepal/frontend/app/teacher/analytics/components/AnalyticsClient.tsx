"use client";

import React, { useMemo } from "react";
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
}

export default function AnalyticsClient({
  data,
  isLoading,
  error,
  gradeLevel,
  pillar,
}: AnalyticsClientProps) {
  // Client-side filtering — no network request on filter change
  const filteredData = useMemo((): TeacherAnalyticsData | undefined => {
    if (!data) return undefined;

    let gradeBreakdown = data.grade_breakdown;
    let pillarBreakdown = data.pillar_breakdown;
    let topStudents = data.top_students;
    let strugglingStudents = data.struggling_students;
    let weeklyTrends = data.weekly_trends;

    if (gradeLevel) {
      gradeBreakdown = gradeBreakdown.filter((g) => g.grade_level === gradeLevel);
      topStudents = topStudents.filter((s) => s.grade_level === gradeLevel);
      strugglingStudents = strugglingStudents.filter((s) => s.grade_level === gradeLevel);
    }

    if (pillar) {
      pillarBreakdown = pillarBreakdown.filter((p) => p.pillar === pillar);
    }

    // Recompute summary stats whenever any filter is active
    const hasFilter = gradeLevel || pillar;
    let summaryStats = data.summary_stats;

    if (hasFilter && gradeBreakdown.length > 0) {
      // When pillar is filtered, use the pillar breakdown for interaction/accuracy data
      if (pillar && pillarBreakdown.length > 0) {
        const filteredPillar = pillarBreakdown[0];
        summaryStats = {
          total_students: gradeLevel
            ? gradeBreakdown.reduce((sum, g) => sum + g.student_count, 0)
            : data.summary_stats.total_students,
          total_interactions: filteredPillar.total_attempts,
          avg_accuracy: filteredPillar.avg_accuracy,
          active_this_week: data.summary_stats.active_this_week,
        };
      } else if (gradeLevel) {
        summaryStats = {
          total_students: gradeBreakdown.reduce((sum, g) => sum + g.student_count, 0),
          total_interactions: gradeBreakdown.reduce((sum, g) => sum + g.total_interactions, 0),
          avg_accuracy: Math.round(
            gradeBreakdown.reduce((sum, g) => sum + g.avg_accuracy * g.student_count, 0) /
            Math.max(1, gradeBreakdown.reduce((sum, g) => sum + g.student_count, 0))
          ),
          active_this_week: data.summary_stats.active_this_week,
        };
      }
    } else if (hasFilter) {
      // Filters active but no matching data
      summaryStats = {
        total_students: 0,
        total_interactions: 0,
        avg_accuracy: 0,
        active_this_week: 0,
      };
    }

    return {
      ...data,
      summary_stats: summaryStats,
      grade_breakdown: gradeBreakdown,
      pillar_breakdown: pillarBreakdown,
      top_students: topStudents,
      struggling_students: strugglingStudents,
      weekly_trends: weeklyTrends,
    };
  }, [data, gradeLevel, pillar]);

  if (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return (
      <div className="p-6">
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
        <FilterBar showSearch={false} showPillar={true} showSection={false} />
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
      <FilterBar showSearch={false} showPillar={true} showSection={false} />

      {filteredData && (
        <div className="space-y-6 mt-6">
          <AnalyticsOverview stats={filteredData.summary_stats} pillar={pillar} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GradeBreakdown breakdown={filteredData.grade_breakdown} gradeLevel={gradeLevel} />
            <SkillBreakdown breakdown={filteredData.pillar_breakdown} pillar={pillar} />
          </div>

          <StudentRankings
            topStudents={filteredData.top_students}
            strugglingStudents={filteredData.struggling_students}
          />

          <PerformanceTrends trends={filteredData.weekly_trends} pillar={pillar} />
        </div>
      )}

      {filteredData && filteredData.summary_stats.total_students === 0 && (
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
