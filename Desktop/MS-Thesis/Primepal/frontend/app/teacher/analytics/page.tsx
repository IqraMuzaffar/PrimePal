// Feature 10: Global teacher analytics — all classrooms rolled up
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { apiFetch } from "@/lib/api";
import { getTeacherHeaders } from "@/lib/teacherAuth";

interface StudentSummary {
  student_id: string;
  student_name: string;
  avatar_url: string | null;
  total_interactions: number;
  mission_accuracy_pct: number;
}

interface ClassroomReportResponse {
  classroom_id: string;
  grade_level: number;
  students: StudentSummary[];
}

interface StudentInsightReport {
  engagement_level: string;
  mission_accuracy_pct: number;
  total_interactions: number;
  strengths: string[];
  areas_for_improvement: string[];
  recommended_topics: string[];
  teacher_note: string;
}

interface ClassroomWithName extends ClassroomReportResponse {
  classroom_name?: string;
}

export default function AnalyticsPage() {
  const [classrooms, setClassrooms] = useState<ClassroomWithName[]>([]);
  const [loading, setLoading] = useState(true);

  // Student report modal
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedStudentName, setSelectedStudentName] = useState<string | null>(null);
  const [selectedStudentReport, setSelectedStudentReport] = useState<StudentInsightReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  async function fetchAllClassrooms() {
    try {
      const headers = await getTeacherHeaders();
      const classroomList = await apiFetch<Array<{ id: string; class_name: string; grade_level: number }>>(
        "/classroom",
        { headers }
      );

      // Fetch analytics for each classroom
      const analyticsPromises = classroomList.map(async (room) => {
        try {
          const data = await apiFetch<ClassroomReportResponse>(
            `/evaluator/report/classroom/${room.id}`,
            { headers }
          );
          return {
            ...data,
            classroom_name: room.class_name,
          };
        } catch {
          // If this classroom has no analytics, return empty
          return {
            classroom_id: room.id,
            classroom_name: room.class_name,
            grade_level: room.grade_level,
            students: [],
          };
        }
      });

      const results = await Promise.all(analyticsPromises);
      setClassrooms(results);
    } catch {
      setClassrooms([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchStudentReport(studentId: string, studentName: string) {
    setSelectedStudentReport(null);
    setSelectedStudentId(studentId);
    setSelectedStudentName(studentName);
    setReportLoading(true);
    try {
      const headers = await getTeacherHeaders();
      const data = await apiFetch<StudentInsightReport>(
        `/evaluator/report/student/${studentId}`,
        { headers }
      );
      setSelectedStudentReport(data);
    } catch {
      setSelectedStudentReport(null);
    } finally {
      setReportLoading(false);
    }
  }

  useEffect(() => {
    fetchAllClassrooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Loading / empty states ──────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400 text-sm">
        <svg className="animate-spin h-5 w-5 mr-2 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        Loading analytics…
      </div>
    );
  }

  if (classrooms.length === 0) {
    return (
      <div className="bg-gray-50 min-h-full p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Teacher Analytics</h1>
          <p className="text-gray-500 mb-8">Monitor student progress across all your classrooms.</p>
          <div className="bg-white rounded-2xl border border-gray-200 flex flex-col items-center justify-center py-24 text-gray-400">
            <p className="font-medium text-gray-500">No classrooms yet</p>
            <p className="text-sm mt-1">Create a classroom to start tracking student analytics.</p>
          </div>
        </div>
      </div>
    );
  }

  // Get all students across all classrooms
  const allStudents = classrooms.flatMap((room) =>
    room.students.map((s) => ({
      ...s,
      classroom_id: room.classroom_id,
      classroom_name: room.classroom_name || "Unknown",
      grade_level: room.grade_level,
    }))
  );

  return (
    <div className="bg-gray-50 min-h-full p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Teacher Analytics</h1>
        <p className="text-gray-500 mb-8">Monitor student progress across all your classrooms.</p>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Total Classrooms</p>
            <p className="text-2xl font-bold text-gray-900">{classrooms.length}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Total Students</p>
            <p className="text-2xl font-bold text-gray-900">{allStudents.length}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Total Interactions</p>
            <p className="text-2xl font-bold text-gray-900">
              {allStudents.reduce((sum, s) => sum + s.total_interactions, 0)}
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Avg Accuracy</p>
            <p className="text-2xl font-bold text-gray-900">
              {allStudents.length > 0
                ? Math.round(
                    allStudents.reduce((sum, s) => sum + s.mission_accuracy_pct, 0) / allStudents.length
                  )
                : 0}
              %
            </p>
          </div>
        </div>

        {/* Flex layout: classrooms + student report side-by-side */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Classrooms and students */}
          <div className="lg:col-span-2 space-y-6">
            {classrooms.map((room) => (
              <div key={room.classroom_id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
                  <h3 className="text-sm font-semibold text-gray-900">{room.classroom_name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Grade {room.grade_level} • {room.students.length} student{room.students.length !== 1 ? "s" : ""}</p>
                </div>

                {room.students.length === 0 && (
                  <p className="text-center text-gray-400 text-sm py-8">No students yet.</p>
                )}

                {room.students.length > 0 && (
                  <ul className="divide-y divide-gray-50">
                    {room.students.map((s) => {
                      const accuracyColor =
                        s.mission_accuracy_pct >= 70
                          ? "bg-green-100 text-green-700"
                          : s.mission_accuracy_pct >= 40
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700";

                      const isSelected = selectedStudentId === s.student_id;

                      return (
                        <li
                          key={s.student_id}
                          onClick={() => fetchStudentReport(s.student_id, s.student_name)}
                          className={`flex items-center gap-3 px-5 py-3 cursor-pointer transition-colors ${
                            isSelected
                              ? "bg-indigo-50 border-l-4 border-indigo-500"
                              : "hover:bg-gray-50"
                          }`}
                        >
                          {s.avatar_url ? (
                            <Image
                              src={s.avatar_url}
                              alt={s.student_name}
                              width={32}
                              height={32}
                              className="rounded-full bg-gray-100 shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 text-indigo-600 text-xs font-bold">
                              {s.student_name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{s.student_name}</p>
                            <p className="text-xs text-gray-400">{s.total_interactions} interactions</p>
                          </div>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${accuracyColor}`}>
                            {s.mission_accuracy_pct}%
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ))}
          </div>

          {/* Right: Student Report */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden sticky top-6 h-fit">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-900">
                Student Insight
                {selectedStudentName && (
                  <span className="ml-2 font-normal text-indigo-600">— {selectedStudentName}</span>
                )}
              </h3>
            </div>

            {!selectedStudentName && !reportLoading && (
              <p className="text-center text-gray-400 text-sm py-12 px-4">
                Select a student to view their AI-generated insight report.
              </p>
            )}

            {reportLoading && (
              <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
                <svg className="animate-spin h-5 w-5 mr-2 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Loading…
              </div>
            )}

            {!reportLoading && selectedStudentName && !selectedStudentReport && (
              <p className="text-center text-gray-400 text-sm py-12 px-4">
                Could not load report. Try again later.
              </p>
            )}

            {!reportLoading && selectedStudentReport && (
              <div className="px-5 py-4 space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto">
                {/* Engagement pill */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 font-medium">Engagement:</span>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      selectedStudentReport.engagement_level.toLowerCase() === "high"
                        ? "bg-green-100 text-green-700"
                        : selectedStudentReport.engagement_level.toLowerCase() === "medium"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {selectedStudentReport.engagement_level}
                  </span>
                </div>

                {/* Metrics */}
                <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Accuracy:</span>
                    <span className="font-semibold text-gray-900">{selectedStudentReport.mission_accuracy_pct}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Interactions:</span>
                    <span className="font-semibold text-gray-900">{selectedStudentReport.total_interactions}</span>
                  </div>
                </div>

                {/* Teacher note */}
                {selectedStudentReport.teacher_note && (
                  <blockquote className="bg-indigo-50 border-l-4 border-indigo-400 px-4 py-3 rounded-r-xl text-sm text-indigo-800 italic">
                    {selectedStudentReport.teacher_note}
                  </blockquote>
                )}

                {/* Strengths */}
                {selectedStudentReport.strengths.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Strengths</p>
                    <ul className="space-y-1">
                      {selectedStudentReport.strengths.map((item, i) => (
                        <li key={i} className="text-xs text-gray-700 flex items-start gap-2">
                          <span className="shrink-0">✅</span><span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Areas to Improve */}
                {selectedStudentReport.areas_for_improvement.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Areas to Improve</p>
                    <ul className="space-y-1">
                      {selectedStudentReport.areas_for_improvement.map((item, i) => (
                        <li key={i} className="text-xs text-gray-700 flex items-start gap-2">
                          <span className="shrink-0">⚠️</span><span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommended Topics */}
                {selectedStudentReport.recommended_topics.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Recommended Topics</p>
                    <ul className="space-y-1">
                      {selectedStudentReport.recommended_topics.map((item, i) => (
                        <li key={i} className="text-xs text-gray-700 flex items-start gap-2">
                          <span className="shrink-0">📚</span><span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
