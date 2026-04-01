// frontend/app/(teacher)/classroom/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Copy, Check, UserPlus, Trash2 } from "lucide-react";
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

  // ── Loading / error states ──────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400 text-sm">
        Loading…
      </div>
    );
  }

  if (!classroom) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-red-500 text-sm">
        Classroom not found.
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">

        {/* Back link */}
        <Link
          href="/classroom"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-5"
        >
          <ArrowLeft size={15} /> All Classrooms
        </Link>

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

        {/* ── Coming Soon Tabs ── */}
        {activeTab !== "roster" && (
          <div className="bg-white rounded-2xl border border-gray-200 flex flex-col items-center justify-center py-20 text-gray-400">
            <p className="font-medium capitalize text-gray-500">{activeTab}</p>
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
    </div>
  );
}
