"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronDown, ChevronLeft, ChevronRight, Eye, Flame } from "lucide-react";
import SearchBar from "@/components/teacher/SearchBar";
import { apiFetch } from "@/lib/api";
import { getTeacherHeaders } from "@/lib/teacherAuth";
import type { AnalyticsDashboardData } from "@/types/analytics";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface StudentWithStats {
  student_id: string;
  student_name: string;
  roll_number: string | null;
  avatar_url: string | null;
  classroom_id: string;
  classroom_name: string;
  grade_level: number;
  total_points: number;
  total_interactions: number;
  mission_accuracy_pct: number;
  active_this_week: boolean;
  // Extended fields from the students table (via grade-overview or joined)
  last_activity_date?: string | null;
  current_streak?: number;
  pillar_accuracies?: Record<string, number>;
}

interface StudentsListResponse {
  students: StudentWithStats[];
  total_count: number;
}

interface Props {
  data: AnalyticsDashboardData;
  page: number;
  filters: { grade?: number; class?: string };
  onPageChange: (page: number) => void;
  onFiltersChange: (filters: { grade?: number; class?: string }) => void;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function ActivityBadge({ activeThisWeek, lastActivity }: { activeThisWeek: boolean; lastActivity?: string | null }) {
  if (lastActivity) {
    const now = new Date();
    const last = new Date(lastActivity);
    const diffHours = (now.getTime() - last.getTime()) / (1000 * 60 * 60);
    if (diffHours <= 24) {
      return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700"><span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" /> Active</span>;
    }
    if (diffHours <= 48) {
      return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Inactive</span>;
    }
    return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">Idle 3+ days</span>;
  }
  // Fall back to active_this_week boolean
  if (activeThisWeek) {
    return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700"><span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" /> Active</span>;
  }
  return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">Idle</span>;
}

function _MiniPillarBar({ value }: { value: number }) {
  const color = value >= 70 ? "bg-green-500" : value >= 40 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="w-12 bg-gray-200 rounded-full h-1.5 inline-block">
      <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

export default function AnalyticsByStudent({
  data,
  page,
  filters,
  onPageChange,
  onFiltersChange,
}: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const { classrooms } = data;

  // Live student data from the evaluator/students endpoint
  const [liveStudents, setLiveStudents] = useState<StudentWithStats[]>([]);
  const [liveLoading, setLiveLoading] = useState(true);

  const uniqueGrades = Array.from(new Set(classrooms.map((c) => c.grade))).sort();
  const uniqueClasses = Array.from(new Set(classrooms.map((c) => c.name))).sort();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const headers = await getTeacherHeaders();
        const params = new URLSearchParams();
        if (filters.grade) params.set("grade_level", String(filters.grade));
        if (searchQuery) params.set("search", searchQuery);
        const qs = params.toString();
        const resp = await apiFetch<StudentsListResponse>(
          `/evaluator/students${qs ? `?${qs}` : ""}`,
          { headers }
        );
        if (!cancelled) {
          setLiveStudents(resp.students);
        }
      } catch {
        // Fall back to server-provided data
      } finally {
        if (!cancelled) setLiveLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [filters.grade, searchQuery]);

  // Use live data if available, otherwise fall back to server-provided studentTableData
  const useServerFallback = liveLoading && liveStudents.length === 0;

  const serverStudents: StudentWithStats[] = data.studentTableData.items.map((s) => ({
    student_id: s.id,
    student_name: s.name,
    roll_number: s.rollNumber,
    avatar_url: s.avatarUrl,
    classroom_id: s.classId,
    classroom_name: s.className,
    grade_level: s.grade,
    total_points: s.totalPoints,
    total_interactions: 0,
    mission_accuracy_pct: s.accuracy,
    active_this_week: true,
    last_activity_date: null,
    current_streak: 0,
  }));

  const allStudents = useServerFallback ? serverStudents : liveStudents;

  // Client-side filtering for class (not supported in the API)
  const filteredStudents = allStudents.filter((student) => {
    if (filters.class && student.classroom_name !== filters.class) return false;
    // Search is handled server-side for live data, but apply for fallback
    if (useServerFallback && searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !student.student_name.toLowerCase().includes(query) &&
        !(student.roll_number && student.roll_number.toLowerCase().includes(query))
      ) {
        return false;
      }
    }
    return true;
  });

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 70) return "bg-green-100 text-green-700";
    if (accuracy >= 40) return "bg-yellow-100 text-yellow-700";
    return "bg-red-100 text-red-700";
  };

  const startIdx = (page - 1) * 10;
  const endIdx = startIdx + 10;
  const paginatedStudents = filteredStudents.slice(startIdx, endIdx);
  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / 10));

  return (
    <div className="space-y-8">
      {/* Search Bar */}
      <SearchBar
        value={searchQuery}
        onChange={(val) => { setSearchQuery(val); onPageChange(1); }}
        placeholder="Search by name or roll number..."
      />

      {/* Filter Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">Filter by Grade</label>
          <div className="relative">
            <select
              value={filters.grade ?? ""}
              onChange={(e) => {
                onFiltersChange({ ...filters, grade: e.target.value ? Number(e.target.value) : undefined });
                onPageChange(1);
              }}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none bg-white cursor-pointer"
            >
              <option value="">All Grades</option>
              {uniqueGrades.map((grade) => (
                <option key={grade} value={grade}>Grade {grade}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-3.5 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">Filter by Class</label>
          <div className="relative">
            <select
              value={filters.class ?? ""}
              onChange={(e) => {
                onFiltersChange({ ...filters, class: e.target.value || undefined });
                onPageChange(1);
              }}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none bg-white cursor-pointer"
            >
              <option value="">All Classes</option>
              {uniqueClasses.map((cls) => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-3.5 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Name</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Grade</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Class</th>
                <th className="px-6 py-3 text-center font-semibold text-gray-700">Accuracy</th>
                <th className="px-6 py-3 text-center font-semibold text-gray-700">Points</th>
                <th className="px-6 py-3 text-center font-semibold text-gray-700">Status</th>
                <th className="px-6 py-3 text-center font-semibold text-gray-700">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400 text-sm">
                    {liveLoading ? "Loading students..." : "No students found"}
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((student) => (
                  <tr key={student.student_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                          {student.student_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="text-gray-900 font-medium">{student.student_name}</span>
                          {(student.current_streak ?? 0) > 0 && (
                            <span className="ml-2 inline-flex items-center gap-0.5 text-xs text-orange-600">
                              <Flame className="w-3 h-3" />{student.current_streak}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">Grade {student.grade_level}</td>
                    <td className="px-6 py-4 text-gray-600">{student.classroom_name}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`text-xs font-semibold px-3 py-1 rounded-full inline-block ${getAccuracyColor(student.mission_accuracy_pct)}`}>
                        {student.mission_accuracy_pct}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-gray-900 font-semibold">
                      {student.total_points}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <ActivityBadge
                        activeThisWeek={student.active_this_week}
                        lastActivity={student.last_activity_date}
                      />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Link
                        href={`/teacher/students/${student.student_id}/report`}
                        className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 transition-colors text-sm font-medium"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredStudents.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
            <p className="text-sm text-gray-600">
              Showing {startIdx + 1}--{Math.min(endIdx, filteredStudents.length)} of{" "}
              {filteredStudents.length} students
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onPageChange(Math.max(1, page - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>

              <span className="text-sm text-gray-600 px-3">
                Page {page} of {totalPages}
              </span>

              <button
                onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
