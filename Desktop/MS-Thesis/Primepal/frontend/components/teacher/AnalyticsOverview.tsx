"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Activity, Target, TrendingUp, Trophy, Users, BookOpen } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { getTeacherHeaders } from "@/lib/teacherAuth";
import type { AnalyticsDashboardData } from "@/types/analytics";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface DashboardStats {
  total_students: number;
  total_interactions: number;
  avg_accuracy: number;
  active_this_week: number;
}

interface SkillAccuracy {
  reading: number;
  writing: number;
  listening: number;
  speaking: number;
  active_today: number;
}

interface WeeklyTrendPoint {
  week_label: string;
  accuracy: number;
  interactions: number;
}

interface WeeklyTrendData {
  grade_level: number;
  pillar: string | null;
  weeks: WeeklyTrendPoint[];
}

interface Props {
  data: AnalyticsDashboardData;
}

/* ------------------------------------------------------------------ */
/* CSS-based charts                                                    */
/* ------------------------------------------------------------------ */

function AccuracyBar({ label, value }: { label: string; value: number }) {
  const color =
    value >= 70 ? "bg-green-500" : value >= 40 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 text-sm font-medium text-gray-600 capitalize">{label}</span>
      <div className="flex-1 bg-gray-200 rounded-full h-3">
        <div className={`h-3 rounded-full transition-all ${color}`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
      <span className="w-12 text-sm font-bold text-gray-700 text-right">{Math.round(value)}%</span>
    </div>
  );
}

function WeeklyBars({ weeks }: { weeks: WeeklyTrendPoint[] }) {
  const maxVal = Math.max(...weeks.map((w) => w.accuracy), 1);
  return (
    <div className="flex items-end gap-2 h-32">
      {weeks.map((w, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-xs font-bold text-gray-600">{Math.round(w.accuracy)}%</span>
          <div
            className="w-full bg-indigo-500 rounded-t transition-all"
            style={{ height: `${(w.accuracy / maxVal) * 100}%`, minHeight: w.accuracy > 0 ? "4px" : "0px" }}
          />
          <span className="text-[10px] text-gray-500 text-center leading-tight">{w.week_label}</span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

export default function AnalyticsOverview({ data }: Props) {
  const { topStudents, classrooms } = data;

  const [dashStats, setDashStats] = useState<DashboardStats | null>(null);
  const [skillAccuracy, setSkillAccuracy] = useState<SkillAccuracy | null>(null);
  const [weeklyTrends, setWeeklyTrends] = useState<WeeklyTrendData[]>([]);
  const [, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const headers = await getTeacherHeaders();

        // Fetch dashboard stats and skill accuracy in parallel
        const [stats, skills] = await Promise.all([
          apiFetch<DashboardStats>("/evaluator/dashboard-stats", { headers }),
          apiFetch<SkillAccuracy>("/evaluator/skill-accuracy", { headers }),
        ]);

        if (cancelled) return;
        setDashStats(stats);
        setSkillAccuracy(skills);

        // Fetch weekly trends for each grade that has classrooms
        const uniqueGrades = Array.from(new Set(classrooms.map((c) => c.grade))).sort();
        if (uniqueGrades.length > 0) {
          // Fetch trend for the first grade as a representative
          const trend = await apiFetch<WeeklyTrendData>(
            `/evaluator/weekly-trend/${uniqueGrades[0]}?weeks=6`,
            { headers }
          );
          if (!cancelled) setWeeklyTrends([trend]);
        }
      } catch {
        // Silently fall back to server-provided data
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [classrooms]);

  // Merge live stats with server-provided data
  const totalStudents = dashStats?.total_students ?? data.summaryStats.totalStudents;
  const totalInteractions = dashStats?.total_interactions ?? data.summaryStats.totalInteractions;
  const avgAccuracy = dashStats?.avg_accuracy ?? data.summaryStats.avgAccuracy;
  const activeToday = skillAccuracy?.active_today ?? 0;

  // Calculate top performing grade from classrooms data
  const gradeStats = classrooms.reduce(
    (acc, classroom) => {
      const grade = classroom.grade;
      if (!acc[grade]) acc[grade] = { totalAccuracy: 0, count: 0 };
      acc[grade].totalAccuracy += classroom.avgAccuracy;
      acc[grade].count += 1;
      return acc;
    },
    {} as Record<number, { totalAccuracy: number; count: number }>
  );

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 70) return "bg-green-100 text-green-700";
    if (accuracy >= 40) return "bg-yellow-100 text-yellow-700";
    return "bg-red-100 text-red-700";
  };

  const getSkillCardColor = (accuracy: number) => {
    if (accuracy >= 70) return "border-green-200 bg-green-50";
    if (accuracy >= 40) return "border-yellow-200 bg-yellow-50";
    return "border-red-200 bg-red-50";
  };

  return (
    <div className="space-y-8">
      {/* Summary Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Students</p>
            <Users className="w-5 h-5 text-indigo-400" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{totalStudents}</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Interactions</p>
            <Activity className="w-5 h-5 text-indigo-400" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{totalInteractions}</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">System Accuracy</p>
            <Target className="w-5 h-5 text-indigo-400" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{Math.round(avgAccuracy)}%</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Active Today</p>
            <TrendingUp className="w-5 h-5 text-green-400" />
          </div>
          <p className="text-3xl font-bold text-green-600">{activeToday}</p>
        </div>
      </div>

      {/* Skill Accuracy Cards */}
      {skillAccuracy && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-semibold text-gray-900">Skill Pillar Accuracy</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {(["reading", "writing", "listening", "speaking"] as const).map((skill) => {
                const val = skillAccuracy[skill];
                return (
                  <div key={skill} className={`rounded-xl border p-4 ${getSkillCardColor(val)}`}>
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-600 capitalize mb-1">{skill}</p>
                    <p className="text-2xl font-bold text-gray-900">{Math.round(val)}%</p>
                  </div>
                );
              })}
            </div>
            <div className="space-y-3">
              {(["reading", "writing", "listening", "speaking"] as const).map((skill) => (
                <AccuracyBar key={skill} label={skill} value={skillAccuracy[skill]} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Weekly Trend */}
      {weeklyTrends.length > 0 && weeklyTrends[0].weeks.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-semibold text-gray-900">Weekly Accuracy Trend</h3>
            <span className="text-xs text-gray-400">(Grade {weeklyTrends[0].grade_level})</span>
          </div>
          <WeeklyBars weeks={weeklyTrends[0].weeks} />
        </div>
      )}

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
                  {idx === 0 ? "\u{1F947}" : idx === 1 ? "\u{1F948}" : idx === 2 ? "\u{1F949}" : `#${idx + 1}`}
                </div>

                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
                  {student.name.charAt(0).toUpperCase()}
                </div>

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
            const avgAcc = stats ? Math.round(stats.totalAccuracy / stats.count) : 0;
            const getBarColor = (acc: number) => {
              if (acc >= 70) return "bg-green-500";
              if (acc >= 40) return "bg-yellow-500";
              return "bg-red-500";
            };

            return (
              <div key={grade}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Grade {grade}</span>
                  <span className="text-sm font-bold text-gray-900">{avgAcc}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${getBarColor(avgAcc)}`}
                    style={{ width: `${avgAcc}%` }}
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
