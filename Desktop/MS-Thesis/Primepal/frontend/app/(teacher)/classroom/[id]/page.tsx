// frontend/app/(teacher)/classroom/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Copy, Check, UserPlus, Trash2, Lock } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { getTeacherHeaders } from "@/lib/teacherAuth";
import BulkAddStudentsModal from "@/components/teacher/BulkAddStudentsModal";
import type { Student } from "@/types";

interface ClassroomDetail {
  id: string;
  class_name: string;
  class_code: string;
  grade_level: number;
  students: Student[];
}

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

type Tab = "roster" | "missions" | "analytics";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export default function ClassroomDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [classroom, setClassroom] = useState<ClassroomDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("roster");
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  // PIN management state
  const [pinStudent, setPinStudent] = useState<Student | null>(null);
  const [pinValue, setPinValue] = useState("");
  const [pinSaving, setPinSaving] = useState(false);
  const [pinSaveError, setPinSaveError] = useState<string | null>(null);
  const [pinSaved, setPinSaved] = useState(false);

  // Analytics state
  const [analyticsData, setAnalyticsData] = useState<ClassroomReportResponse | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [selectedStudentReport, setSelectedStudentReport] = useState<StudentInsightReport | null>(null);
  const [selectedStudentName, setSelectedStudentName] = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  async function fetchClassroom() {
    try {
      const headers = await getTeacherHeaders();
      const data = await apiFetch<ClassroomDetail>(
        `/classroom/${params.id}`,
        { headers }
      );
      setClassroom(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchClassroom();
  }, [params.id]);

  async function copyCode() {
    if (!classroom) return;
    await navigator.clipboard.writeText(classroom.class_code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  }

  async function fetchAnalytics() {
    if (analyticsData) return; // already loaded
    setAnalyticsLoading(true);
    try {
      const headers = await getTeacherHeaders();
      const data = await apiFetch<ClassroomReportResponse>(
        `/evaluator/report/classroom/${params.id}`,
        { headers }
      );
      setAnalyticsData(data);
    } catch {
      // silently fail — tab shows empty state
    } finally {
      setAnalyticsLoading(false);
    }
  }

  async function fetchStudentReport(studentId: string, studentName: string) {
    setSelectedStudentReport(null);
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

  async function removeStudent(studentId: string) {
    if (!confirm("Remove this student from the roster?")) return;
    setRemoveError(null);
    try {
      const headers = await getTeacherHeaders();
      // DELETE returns 204 No Content — use fetch directly to avoid apiFetch's res.json()
      const res = await fetch(
        `${BASE_URL}/classroom/${params.id}/students/${studentId}`,
        { method: "DELETE", headers: headers as HeadersInit }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { detail?: string }).detail ?? `Error ${res.status}`);
      }
      // Optimistic update: remove from local state without re-fetch
      setClassroom((prev) =>
        prev
          ? { ...prev, students: prev.students.filter((s) => s.id !== studentId) }
          : prev
      );
    } catch (err: unknown) {
      setRemoveError(
        err instanceof Error ? err.message : "Failed to remove student."
      );
    }
  }

  async function savePin(studentId: string, pin: string) {
    if (!/^\d{4}$/.test(pin)) {
      setPinSaveError("PIN must be exactly 4 digits.");
      return;
    }
    setPinSaving(true);
    setPinSaveError(null);
    setPinSaved(false);
    try {
      const headers = await getTeacherHeaders();
      await apiFetch(`/auth/student/${studentId}/pin`, {
        method: "PATCH",
        body: JSON.stringify({ secret_pin: pin }),
        headers,
      });
      setClassroom((prev) =>
        prev
          ? {
              ...prev,
              students: prev.students.map((s) =>
                s.id === studentId ? { ...s, secret_pin: pin } : s
              ),
            }
          : prev
      );
      setPinSaved(true);
      setTimeout(() => {
        setPinStudent(null);
        setPinSaved(false);
      }, 1200);
    } catch (err: unknown) {
      setPinSaveError(err instanceof Error ? err.message : "Failed to save PIN.");
    } finally {
      setPinSaving(false);
    }
  }

  // ── Loading / error states ──────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400 text-sm">
        Loading…
      </div>
    );
  }

  if (!classroom) {
    return (
      <div className="flex items-center justify-center py-24 text-red-500 text-sm">
        Classroom not found.
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="bg-gray-50 min-h-full p-6">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {classroom.class_name}
            </h1>
            <span className="mt-1 inline-block text-xs font-medium bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
              Grade {classroom.grade_level}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold tracking-widest text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl">
              {classroom.class_code}
            </span>
            <button
              onClick={copyCode}
              className="p-2 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
              title="Copy class code"
            >
              {codeCopied ? (
                <Check size={18} className="text-green-500" />
              ) : (
                <Copy size={18} />
              )}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
          {(["roster", "missions", "analytics"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                if (tab === "analytics") fetchAnalytics();
              }}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ── Roster Tab ── */}
        {activeTab === "roster" && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <p className="text-sm font-medium text-gray-700">
                {classroom.students.length} student
                {classroom.students.length !== 1 ? "s" : ""}
              </p>
              <button
                onClick={() => setShowBulkAdd(true)}
                className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                <UserPlus size={16} /> Add Students
              </button>
            </div>

            {/* Remove error banner */}
            {removeError && (
              <p className="text-sm text-red-600 bg-red-50 px-5 py-2 border-b border-red-100">
                {removeError}
              </p>
            )}

            {/* Empty state */}
            {classroom.students.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-12">
                No students yet. Click &quot;Add Students&quot; to build your
                roster.
              </p>
            )}

            {/* Student rows */}
            {classroom.students.length > 0 && (
              <ul className="divide-y divide-gray-50">
                {classroom.students.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center gap-3 px-5 py-3"
                  >
                    <Image
                      src={s.avatar_url}
                      alt={s.student_name}
                      width={32}
                      height={32}
                      className="rounded-full bg-gray-100 shrink-0"
                    />
                    <span className="flex-1 text-sm font-medium text-gray-800">
                      {s.student_name}
                    </span>
                    <button
                      onClick={() => {
                        setPinStudent(s);
                        setPinValue(s.secret_pin ?? "1234");
                        setPinSaveError(null);
                        setPinSaved(false);
                      }}
                      className="p-1.5 rounded text-gray-300 hover:text-indigo-500 transition-colors"
                      title={`Manage PIN for ${s.student_name}`}
                    >
                      <Lock size={15} />
                    </button>
                    <button
                      onClick={() => removeStudent(s.id)}
                      className="p-1.5 rounded text-gray-300 hover:text-red-500 transition-colors"
                      title={`Remove ${s.student_name}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* ── Missions Tab ── */}
        {activeTab === "missions" && (
          <div className="bg-white rounded-2xl border border-gray-200 flex flex-col items-center justify-center py-20 text-gray-400">
            <p className="font-medium capitalize text-gray-500">Missions</p>
            <p className="text-sm mt-1">Coming soon in a future feature.</p>
          </div>
        )}

        {/* ── Analytics Tab ── */}
        {activeTab === "analytics" && (
          <div className="flex flex-col md:flex-row gap-4">

            {/* Left panel — Class Overview */}
            <div className="w-full md:w-1/2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-800">Class Overview</h2>
              </div>

              {analyticsLoading && (
                <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
                  <svg className="animate-spin h-5 w-5 mr-2 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Loading…
                </div>
              )}

              {!analyticsLoading && !analyticsData && (
                <p className="text-center text-gray-400 text-sm py-12 px-4">
                  No analytics data available.
                </p>
              )}

              {!analyticsLoading && analyticsData && analyticsData.students.length === 0 && (
                <p className="text-center text-gray-400 text-sm py-12 px-4">
                  No students in this classroom yet.
                </p>
              )}

              {!analyticsLoading && analyticsData && analyticsData.students.length > 0 && (
                <ul className="divide-y divide-gray-50">
                  {analyticsData.students.map((s) => {
                    const accuracyColor =
                      s.mission_accuracy_pct >= 70
                        ? "bg-green-100 text-green-700"
                        : s.mission_accuracy_pct >= 40
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-red-100 text-red-700";
                    return (
                      <li key={s.student_id} className="flex items-center gap-3 px-5 py-3">
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
                        <button
                          onClick={() => fetchStudentReport(s.student_id, s.student_name)}
                          className="shrink-0 text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-lg transition-colors"
                        >
                          View Report
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Right panel — Student Insight */}
            <div className="w-full md:w-1/2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-800">
                  Student Insight
                  {selectedStudentName && (
                    <span className="ml-2 font-normal text-indigo-600">— {selectedStudentName}</span>
                  )}
                </h2>
              </div>

              {!selectedStudentName && !reportLoading && (
                <p className="text-center text-gray-400 text-sm py-12 px-4">
                  Select a student to see their AI-generated insight report.
                </p>
              )}

              {reportLoading && (
                <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
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
                <div className="px-5 py-4 space-y-4">
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

                  {/* Teacher note */}
                  {selectedStudentReport.teacher_note && (
                    <blockquote className="bg-indigo-50 border-l-4 border-indigo-400 px-4 py-3 rounded-r-xl text-sm text-indigo-800 italic">
                      {selectedStudentReport.teacher_note}
                    </blockquote>
                  )}

                  {/* Strengths */}
                  {selectedStudentReport.strengths.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Strengths</p>
                      <ul className="space-y-1">
                        {selectedStudentReport.strengths.map((item, i) => (
                          <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                            <span>✅</span><span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Areas to Improve */}
                  {selectedStudentReport.areas_for_improvement.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Areas to Improve</p>
                      <ul className="space-y-1">
                        {selectedStudentReport.areas_for_improvement.map((item, i) => (
                          <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                            <span>⚠️</span><span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Recommended Topics */}
                  {selectedStudentReport.recommended_topics.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Recommended Topics</p>
                      <ul className="space-y-1">
                        {selectedStudentReport.recommended_topics.map((item, i) => (
                          <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                            <span>📚</span><span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      {/* Bulk Add Modal */}
      {showBulkAdd && (
        <BulkAddStudentsModal
          classroomId={params.id}
          onClose={() => setShowBulkAdd(false)}
          onAdded={fetchClassroom}
        />
      )}

      {/* PIN Management Modal */}
      {pinStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-1">
              Secret PIN — {pinStudent.student_name}
            </h3>
            <p className="text-sm text-gray-500 mb-5">
              Share this PIN with the student so they can log in.
            </p>

            <label className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1 block">
              PIN (4 digits)
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={pinValue}
              onChange={(e) => {
                setPinValue(e.target.value.replace(/\D/g, "").slice(0, 4));
                setPinSaveError(null);
                setPinSaved(false);
              }}
              className="w-full text-center text-3xl font-black tracking-[0.4em] border-2 border-gray-200
                         rounded-xl px-4 py-3 mb-4 focus:outline-none focus:border-indigo-500
                         focus:ring-2 focus:ring-indigo-100 transition-all"
            />

            {pinSaveError && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">
                {pinSaveError}
              </p>
            )}

            {pinSaved && (
              <p className="text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2 mb-3">
                ✓ PIN saved!
              </p>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setPinStudent(null)}
                className="flex-1 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => savePin(pinStudent.id, pinValue)}
                disabled={pinSaving || pinValue.length !== 4}
                className="flex-1 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl
                           hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {pinSaving ? "Saving…" : "Save PIN"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
