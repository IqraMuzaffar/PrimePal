// frontend/app/teacher/classroom/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Copy, Check, UserPlus, Trash2, Lock, Pencil } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { getTeacherHeaders } from "@/lib/teacherAuth";
import BulkAddStudentsModal from "@/components/teacher/BulkAddStudentsModal";
import EditStudentModal from "@/components/teacher/EditStudentModal";
import SearchBar from "@/components/teacher/SearchBar";
import type { SncTopic, Student } from "@/types";

interface ClassroomDetail {
  id: string;
  class_name: string;
  class_code: string;
  grade_level: number;
  current_week_topic?: string;
  students: Student[];
}


type Tab = "roster" | "missions";

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
  const [searchQuery, setSearchQuery] = useState("");

  // PIN management state
  const [pinStudent, setPinStudent] = useState<Student | null>(null);
  const [pinValue, setPinValue] = useState("");
  const [pinSaving, setPinSaving] = useState(false);
  const [pinSaveError, setPinSaveError] = useState<string | null>(null);
  const [pinSaved, setPinSaved] = useState(false);

  // Edit student state
  const [editStudent, setEditStudent] = useState<Student | null>(null);

  // Active Topics state
  const [allTopics, setAllTopics] = useState<SncTopic[]>([]);
  const [activeTopicIds, setActiveTopicIds] = useState<Set<number>>(new Set());
  const [topicsLoaded, setTopicsLoaded] = useState(false);
  const [topicsSaving, setTopicsSaving] = useState(false);
  const [topicsSaved, setTopicsSaved] = useState(false);
  const [topicsSaveError, setTopicsSaveError] = useState<string | null>(null);

  async function fetchClassroom(): Promise<ClassroomDetail | null> {
    try {
      const headers = await getTeacherHeaders();
      const data = await apiFetch<ClassroomDetail>(
        `/classroom/${params.id}`,
        { headers }
      );
      setClassroom(data);
      return data;
    } finally {
      setLoading(false);
    }
    return null;
  }

  async function fetchTopics(gradeLevel: number) {
    try {
      const headers = await getTeacherHeaders();
      const [allTopicsData, activeTopicsData] = await Promise.all([
        apiFetch<SncTopic[]>(`/topics?grade_level=${gradeLevel}`, { headers }),
        apiFetch<SncTopic[]>(`/classroom/${params.id}/active-topics`, { headers }),
      ]);
      setAllTopics(allTopicsData);
      setActiveTopicIds(new Set(activeTopicsData.map((t) => t.id)));
    } finally {
      setTopicsLoaded(true);
    }
  }

  useEffect(() => {
    async function init() {
      const data = await fetchClassroom();
      if (data) await fetchTopics(data.grade_level);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function copyCode() {
    if (!classroom) return;
    await navigator.clipboard.writeText(classroom.class_code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  }


  async function saveActiveTopics() {
    setTopicsSaving(true);
    setTopicsSaveError(null);
    try {
      const headers = await getTeacherHeaders();
      await apiFetch(`/classroom/${params.id}/active-topics`, {
        method: "PUT",
        body: JSON.stringify({ topic_ids: Array.from(activeTopicIds) }),
        headers,
      });
      setTopicsSaved(true);
      setTimeout(() => setTopicsSaved(false), 1500);
    } catch (err: unknown) {
      setTopicsSaveError(err instanceof Error ? err.message : "Failed to save topics.");
    } finally {
      setTopicsSaving(false);
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

  // ── Filter students based on search query ──────────────────────────────────
  const filteredStudents = classroom.students.filter((student) => {
    const query = searchQuery.toLowerCase();
    return (
      student.student_name.toLowerCase().includes(query) ||
      (student.roll_number && student.roll_number.toLowerCase().includes(query))
    );
  });

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

        {/* Active Topics */}
        <div className="bg-white rounded-2xl border border-gray-200 mb-6 p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Active Topics</h2>
              <p className="text-xs text-gray-500 mt-1">
                Toggle topics to control what the AI generates questions about. All topics are active by default.
              </p>
            </div>
            <button
              onClick={saveActiveTopics}
              disabled={topicsSaving || !topicsLoaded}
              className="text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg transition-colors"
            >
              {topicsSaving ? "Saving…" : "Save Changes"}
            </button>
          </div>

          {!topicsLoaded ? (
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-8 w-20 bg-gray-200 rounded-full animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {allTopics.map((topic) => {
                const isActive = activeTopicIds.has(topic.id);
                return (
                  <button
                    key={topic.id}
                    onClick={() => {
                      setActiveTopicIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(topic.id)) next.delete(topic.id);
                        else next.add(topic.id);
                        return next;
                      });
                    }}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-all ${
                      isActive
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white text-gray-500 border-gray-300 hover:border-indigo-400"
                    }`}
                  >
                    {topic.topic_name}
                  </button>
                );
              })}
            </div>
          )}

          {topicsSaveError && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mt-3">
              {topicsSaveError}
            </p>
          )}
          {topicsSaved && (
            <p className="text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2 mt-3">
              ✓ Topics saved!
            </p>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
          {(["roster", "missions"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
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
          <div className="space-y-4">
            {/* Search Bar */}
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search by name or roll number..."
            />

            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              {/* Toolbar */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-700">
                  {filteredStudents.length} of {classroom.students.length} student
                  {filteredStudents.length !== 1 ? "s" : ""}
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
            {filteredStudents.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-12">
                {searchQuery
                  ? "No students match your search."
                  : "No students yet. Click \"Add Students\" to build your roster."}
              </p>
            )}

            {/* Student rows */}
            {filteredStudents.length > 0 && (
              <ul className="divide-y divide-gray-50">
                {filteredStudents.map((s) => (
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
                    {s.roll_number && (
                      <span className="text-xs text-gray-400 font-mono">{s.roll_number}</span>
                    )}
                    <button
                      onClick={() => setEditStudent(s)}
                      className="p-1.5 rounded text-gray-300 hover:text-indigo-500 transition-colors"
                      title={`Edit ${s.student_name}`}
                    >
                      <Pencil size={15} />
                    </button>
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
          </div>
        )}

        {/* ── Missions Tab ── */}
        {activeTab === "missions" && (
          <div className="bg-white rounded-2xl border border-gray-200 flex flex-col items-center justify-center py-20 text-gray-400">
            <p className="font-medium capitalize text-gray-500">Missions</p>
            <p className="text-sm mt-1">Coming soon in a future feature.</p>
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

      {/* Edit Student Modal */}
      {editStudent && (
        <EditStudentModal
          student={editStudent}
          classroomId={params.id}
          onClose={() => setEditStudent(null)}
          onSaved={(updated) => {
            setClassroom((prev) =>
              prev
                ? { ...prev, students: prev.students.map((s) => (s.id === updated.id ? updated : s)) }
                : prev
            );
            setEditStudent(null);
          }}
        />
      )}
    </div>
  );
}
