"use client";

import { Activity, Target, Building2, TrendingUp, Trophy } from "lucide-react";
import type { AnalyticsDashboardData } from "@/types/analytics";

interface Props {
  data: AnalyticsDashboardData;
}

export default function AnalyticsOverview({ data }: Props) {
  const { summaryStats, topStudents, classrooms } = data;

  // Calculate top performing grade
  const gradeStats = classrooms.reduce(
    (acc, classroom) => {
      const grade = classroom.grade;
      if (!acc[grade]) {
        acc[grade] = { totalAccuracy: 0, count: 0 };
      }
      acc[grade].totalAccuracy += classroom.avgAccuracy;
      acc[grade].count += 1;
      return acc;
    },
    {} as Record<number, { totalAccuracy: number; count: number }>
  );

  const topGrade = Object.entries(gradeStats).reduce((best, [grade, stats]) => {
    const avg = stats.totalAccuracy / stats.count;
    return avg > best.avg ? { grade: Number(grade), avg } : best;
  }, { grade: 1, avg: 0 });

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 70) return "bg-green-100 text-green-700";
    if (accuracy >= 40) return "bg-yellow-100 text-yellow-700";
    return "bg-red-100 text-red-700";
  };

  return (
    <div className="space-y-8">
      {/* Summary Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Interactions</p>
            <Activity className="w-5 h-5 text-indigo-400" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{summaryStats.totalInteractions}</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">System Accuracy</p>
            <Target className="w-5 h-5 text-indigo-400" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{Math.round(summaryStats.avgAccuracy)}%</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Active Classrooms</p>
            <Building2 className="w-5 h-5 text-indigo-400" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{summaryStats.activeClassrooms}</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Top Grade</p>
            <TrendingUp className="w-5 h-5 text-indigo-400" />
          </div>
          <p className="text-3xl font-bold text-gray-900">Grade {topGrade.grade}</p>
          <p className="text-xs text-gray-500 mt-1">{Math.round(topGrade.avg)}% avg</p>
        </div>
      </div>

      {/* Top Performers */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-amber-50 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-600" />
          <h3 className="text-lg font-semibold text-gray-900">Top 5 Students</h3>
        </div>

        <div className="divide-y divide-gray-100">
          {topStudents.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">No students yet</p>
          ) : (
            topStudents.map((student, idx) => (
              <div key={student.id} className="px-6 py-4 flex items-center gap-4">
                <div className="text-sm font-bold text-gray-500 w-6 text-center">
                  {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
                </div>

                {student.avatarUrl ? (
                  <img
                    src={student.avatarUrl}
                    alt={student.name}
                    className="w-10 h-10 rounded-full bg-gray-100"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
                    {student.name.charAt(0).toUpperCase()}
                  </div>
                )}

                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{student.name}</p>
                  <p className="text-xs text-gray-500">Grade {student.grade}</p>
                </div>

                <div className="text-right">
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full inline-block ${getAccuracyColor(student.accuracy)}`}>
                    {student.accuracy}%
                  </span>
                  <p className="text-xs text-gray-500 mt-1">{student.totalPoints} pts</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Grade Comparison */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Average Accuracy by Grade</h3>
        </div>

        <div className="px-6 py-6 space-y-4">
          {[1, 2, 3, 4, 5].map((grade) => {
            const stats = gradeStats[grade];
            const avgAccuracy = stats ? Math.round(stats.totalAccuracy / stats.count) : 0;
            const getBarColor = (acc: number) => {
              if (acc >= 70) return "bg-green-500";
              if (acc >= 40) return "bg-yellow-500";
              return "bg-red-500";
            };

            return (
              <div key={grade}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Grade {grade}</span>
                  <span className="text-sm font-bold text-gray-900">{avgAccuracy}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${getBarColor(avgAccuracy)}`}
                    style={{ width: `${avgAccuracy}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
