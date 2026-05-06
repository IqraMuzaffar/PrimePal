// frontend/app/teacher/classroom/[id]/page.tsx
"use client";

import { useState } from "react";
import { Copy, Check, UserPlus, Trash2, Lock, Pencil } from "lucide-react";
import { teacherMutate } from "@/lib/api-helpers";
import { useTeacherRole } from "@/lib/useTeacherRole";
import { useTeacherClassroom, teacherQueryKeys } from "@/lib/hooks/teacher-queries";
import { useQueryClient } from "@tanstack/react-query";
import BulkAddStudentsModal from "@/components/teacher/BulkAddStudentsModal";
import EditStudentModal from "@/components/teacher/EditStudentModal";
import SearchBar from "@/components/teacher/SearchBar";
import TopicSelectionBySkill from "@/components/teacher/TopicSelectionBySkill";
import type { Student } from "@/types";

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
  const queryClient = useQueryClient();
  const { data: classroomData, isLoading: loading } = useTeacherClassroom(params.id);
  const classroom = classroomData as ClassroomDetail | undefined;
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
  const { isAdmin } = useTeacherRole();

  async function copyCode() {
    if (!classroom) return;
    await navigator.clipboard.writeText(classroom.class_code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  }

  async function removeStudent(studentId: string) {
    if (!confirm("Remove this student from the roster?")) return;
    setRemoveError(null);
    try {
      const { getTeacherHeaders } = await import("@/lib/teacherAuth");
      const headers = await getTeacherHeaders();
      const res = await fetch(
        `${BASE_URL}/classroom/${params.id}/students/${studentId}`,
        { method: "DELETE", headers: headers as HeadersInit }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { detail?: string }).detail ?? `Error ${res.status}`);
      }
      queryClient.invalidateQueries({ queryKey: teacherQueryKeys.classroom(params.id) });
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
      await teacherMutate(`/auth/student/${studentId}/pin`, { secret_pin: pin }, "PATCH");
      queryClient.invalidateQueries({ queryKey: teacherQueryKeys.classroom(params.id) });
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

        {/* Active Topics by Skill */}
        <TopicSelectionBySkill classroomId={params.id} viewOnly />

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
                {isAdmin && (
                  <button
                    onClick={() => setShowBulkAdd(true)}
                    className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                  >
                    <UserPlus size={16} /> Add Students
                  </button>
                )}
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
                    <span className="flex-1 text-sm font-medium text-gray-800">
                      {s.student_name}
                    </span>
                    {s.roll_number && (
                      <span className="text-xs text-gray-400 font-mono">{s.roll_number}</span>
                    )}
                    {isAdmin && (
                      <>
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
                      </>
                    )}
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
          onAdded={() => {
            queryClient.invalidateQueries({ queryKey: teacherQueryKeys.classroom(params.id) });
          }}
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
          onSaved={(_updated) => {
            queryClient.invalidateQueries({ queryKey: teacherQueryKeys.classroom(params.id) });
            setEditStudent(null);
          }}
        />
      )}
    </div>
  );
}
