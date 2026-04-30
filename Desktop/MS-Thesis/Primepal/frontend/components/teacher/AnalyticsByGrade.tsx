"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronDown, BookOpen, Users, Activity, AlertTriangle, TrendingUp, Shield } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { getTeacherHeaders } from "@/lib/teacherAuth";
import type { AnalyticsDashboardData } from "@/types/analytics";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface GradeOverview {
  grade_level: number;
  total_students: number;
  active_today: number;
  idle_students: number;
  avg_accuracy: number;
  pillar_accuracy: Record<string, number>;
  weak_pillars: string[];
  strong_pillars: string[];
  idle_student_list: { student_id: string; student_name: string; last_activity_date: string | null }[];
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
  selectedGrade: number | null;
  onGradeChange: (grade: number | null) => void;
}

/* ------------------------------------------------------------------ */
/* Helpers: CSS-based charts                                           */
/* ------------------------------------------------------------------ */

function AccuracyBar({ label, value }: { label: string; value: number }) {
  const color =
    value >= 70 ? "bg-green-500" : value >= 40 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 text-sm font-medium text-gray-600 capitalize">{label}</span>
      <div className="flex-1 bg-gray-200 rounded-full h-4">
        <div className={`h-4 rounded-full transition-all ${color}`} style={{ width: `${Math.min(value, 100)}%` }} />
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

function IdleBadge({ lastActivity }: { lastActivity: string | null }) {
  if (!lastActivity) {
    return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">Never active</span>;
  }
  const now = new Date();
  const last = new Date(lastActivity);
  const diffHours = (now.getTime() - last.getTime()) / (1000 * 60 * 60);
  if (diffHours > 72) {
    return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">Idle 3+ days</span>;
  }
  if (diffHours > 48) {
    return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Inactive</span>;
  }
  return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Active</span>;
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

export default function AnalyticsByGrade({ data, selectedGrade, onGradeChange }: Props) {
  const { classrooms } = data;
  const uniqueGrades = Array.from(new Set(classrooms.map((c) => c.grade))).sort();

  const [gradeOverview, setGradeOverview] = useState<GradeOverview | null>(null);
  const [weeklyTrend, setWeeklyTrend] = useState<WeeklyTrendData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedGrade) {
      setGradeOverview(null);
      setWeeklyTrend(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const headers = await getTeacherHeaders();
        const [overview, trend] = await Promise.all([
          apiFetch<GradeOverview>(`/evaluator/grade-overview/${selectedGrade}`, { headers }),
          apiFetch<WeeklyTrendData>(`/evaluator/weekly-trend/${selectedGrade}?weeks=6`, { headers }),
        ]);
        if (!cancelled) {
          setGradeOverview(overview);
          setWeeklyTrend(trend);
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message || "Failed to load grade overview");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [selectedGrade]);

  /* ---- Grade cards (no grade selected) ---- */
  const gradeCards = uniqueGrades.map((grade) => {
    const rooms = classrooms.filter((c) => c.grade === grade);
    const studentCount = rooms.reduce((sum, c) => sum + c.studentCount, 0);
    const avgAcc = rooms.length > 0 ? rooms.reduce((s, c) => s + c.avgAccuracy, 0) / rooms.length : 0;
    const accColor = avgAcc >= 70 ? "text-green-600" : avgAcc >= 40 ? "text-yellow-600" : "text-red-600";
    return (
      <button
        key={grade}
        onClick={() => onGradeChange(grade)}
        className="bg-white rounded-2xl border border-gray-200 p-6 text-left hover:border-indigo-300 hover:shadow-md transition-all"
      >
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Grade {grade}</p>
        <p className="text-3xl font-bold text-gray-900 mb-2">{studentCount} <span className="text-base font-normal text-gray-500">students</span></p>
        <p className={`text-sm font-semibold ${accColor}`}>{Math.round(avgAcc)}% avg accuracy</p>
        <p className="text-xs text-gray-400 mt-1">{rooms.length} classroom{rooms.length !== 1 ? "s" : ""}</p>
      </button>
    );
  });

  return (
    <div className="space-y-8">
      {/* Grade Selector */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">Select a Grade</label>
        <div className="relative">
          <select
            value={selectedGrade ?? ""}
            onChange={(e) => onGradeChange(e.target.value ? Number(e.target.value) : null)}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none bg-white cursor-pointer"
          >
            <option value="">-- All Grades Overview --</option>
            {uniqueGrades.map((grade) => (
              <option key={grade} value={grade}>Grade {grade}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-3.5 w-5 h-5 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* No grade selected: show overview cards */}
      {!selectedGrade && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {gradeCards}
        </div>
      )}

      {/* Loading / Error */}
      {selectedGrade && loading && (
        <div className="bg-white rounded-2xl border border-gray-200 flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      )}

      {selectedGrade && error && (
        <div className="bg-red-50 rounded-2xl border border-red-200 p-6 text-center text-red-700 text-sm">{error}</div>
      )}

      {/* Grade detail view */}
      {selectedGrade && gradeOverview && !loading && (
        <>
          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Students</p>
                <Users className="w-4 h-4 text-indigo-400" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{gradeOverview.total_students}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Active Today</p>
                <Activity className="w-4 h-4 text-green-400" />
              </div>
              <p className="text-2xl font-bold text-green-600">{gradeOverview.active_today}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Idle</p>
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-2xl font-bold text-amber-600">{gradeOverview.idle_students}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Avg Accuracy</p>
                <TrendingUp className="w-4 h-4 text-indigo-400" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{Math.round(gradeOverview.avg_accuracy)}%</p>
            </div>
          </div>

          {/* Pillar Accuracy Bars */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-5">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              <h3 className="text-lg font-semibold text-gray-900">Skill Pillar Accuracy</h3>
            </div>
            <div className="space-y-3">
              {["reading", "writing", "listening", "speaking"].map((p) => (
                <AccuracyBar key={p} label={p} value={gradeOverview.pillar_accuracy[p] ?? 0} />
              ))}
            </div>

            {/* Weak / Strong labels */}
            <div className="mt-5 flex flex-wrap gap-2">
              {gradeOverview.strong_pillars.map((p) => (
                <span key={p} className="text-xs font-semibold px-3 py-1 rounded-full bg-green-100 text-green-700 capitalize flex items-center gap-1">
                  <Shield className="w-3 h-3" /> {p} (strong)
                </span>
              ))}
              {gradeOverview.weak_pillars.map((p) => (
                <span key={p} className="text-xs font-semibold px-3 py-1 rounded-full bg-red-100 text-red-700 capitalize flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {p} (needs work)
                </span>
              ))}
            </div>
          </div>

          {/* Weekly Trend */}
          {weeklyTrend && weeklyTrend.weeks.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-5">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-semibold text-gray-900">Weekly Accuracy Trend</h3>
              </div>
              <WeeklyBars weeks={weeklyTrend.weeks} />
            </div>
          )}

          {/* Idle Students */}
          {gradeOverview.idle_student_list.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2 bg-amber-50">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Idle Students ({gradeOverview.idle_student_list.length})
                </h3>
              </div>
              <div className="divide-y divide-gray-100">
                {gradeOverview.idle_student_list.map((student) => (
                  <div key={student.student_id} className="px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-xs">
                        {student.student_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <Link
                          href={`/teacher/students/${student.student_id}/report`}
                          className="text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
                        >
                          {student.student_name}
                        </Link>
                        <p className="text-xs text-gray-400">
                          Last active: {student.last_activity_date ? new Date(student.last_activity_date).toLocaleDateString() : "Never"}
                        </p>
                      </div>
                    </div>
                    <IdleBadge lastActivity={student.last_activity_date} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Classrooms in Grade */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Classrooms in Grade {selectedGrade}</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {classrooms
                .filter((c) => c.grade === selectedGrade)
                .map((classroom) => (
                  <div key={classroom.id} className="px-6 py-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{classroom.name}</p>
                      <p className="text-xs text-gray-500">{classroom.studentCount} student{classroom.studentCount !== 1 ? "s" : ""}</p>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{Math.round(classroom.avgAccuracy)}% avg</span>
                  </div>
                ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
