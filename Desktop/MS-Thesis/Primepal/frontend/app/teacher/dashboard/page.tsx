"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Copy, Check, Users, ChevronRight } from "lucide-react";

import { apiFetch } from "@/lib/api";
import { getTeacherHeaders } from "@/lib/teacherAuth";
import CreateClassroomModal from "@/components/teacher/CreateClassroomModal";
import type { Classroom } from "@/types";

const GRADE_COLORS: Record<number, string> = {
  1: "bg-emerald-100 text-emerald-700",
  2: "bg-sky-100 text-sky-700",
  3: "bg-violet-100 text-violet-700",
  4: "bg-amber-100 text-amber-700",
  5: "bg-rose-100 text-rose-700",
};

export default function DashboardPage() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  async function fetchClassrooms() {
    setFetchError(null);
    try {
      const headers = await getTeacherHeaders();
      const data = await apiFetch<Classroom[]>("/classroom/", { headers });
      setClassrooms(data);
    } catch (err: unknown) {
      setFetchError(
        err instanceof Error ? err.message : "Failed to load classrooms."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchClassrooms();
  }, []);

  async function copyCode(e: React.MouseEvent, code: string) {
    e.preventDefault();
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  const gradeColor = (level: number) =>
    GRADE_COLORS[level] ?? "bg-gray-100 text-gray-700";

  return (
    <div className="bg-gray-50 min-h-full">
      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Page heading */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Classrooms</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Select a classroom to manage its roster and curriculum.
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shrink-0"
          >
            <Plus size={15} />
            Create New Class
          </button>
        </div>

        {/* Error banner */}
        {fetchError && (
          <div className="mb-6 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            {fetchError}
          </div>
        )}

        {/* Loading skeletons */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-gray-200 p-5 h-40 animate-pulse"
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && classrooms.length === 0 && !fetchError && (
          <div className="flex flex-col items-center justify-center text-center py-28 border-2 border-dashed border-gray-200 rounded-2xl bg-white">
            <div className="bg-indigo-50 p-4 rounded-2xl mb-4">
              <Users size={32} className="text-indigo-400" />
            </div>
            <p className="font-semibold text-gray-700 text-lg">
              No classrooms yet
            </p>
            <p className="text-sm text-gray-400 mt-1 mb-5">
              Create your first classroom to start adding students.
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
            >
              <Plus size={15} />
              Create New Class
            </button>
          </div>
        )}

        {/* Classroom card grid */}
        {!loading && classrooms.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {classrooms.map((c) => (
              <div
                key={c.id}
                className="group bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md hover:border-indigo-200 transition-all flex flex-col gap-4"
              >
                {/* Grade badge */}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${gradeColor(c.grade_level)}`}
                  >
                    Grade {c.grade_level}
                  </span>
                </div>

                {/* Class name */}
                <h3 className="font-semibold text-gray-900 leading-snug text-base">
                  {c.class_name}
                </h3>

                {/* Class code row */}
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg flex-1 text-center">
                    {c.class_code}
                  </span>
                  <button
                    onClick={(e) => copyCode(e, c.class_code)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                    title="Copy class code"
                  >
                    {copiedCode === c.class_code ? (
                      <Check size={15} className="text-green-500" />
                    ) : (
                      <Copy size={15} />
                    )}
                  </button>
                </div>

                {/* Open classroom link */}
                <Link
                  href={`/classroom/${c.id}`}
                  className="flex items-center justify-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800 border border-indigo-200 hover:border-indigo-400 rounded-lg py-2 transition-colors"
                >
                  Open Roster
                  <ChevronRight size={14} />
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* Summary footer when classrooms exist */}
        {!loading && classrooms.length > 0 && (
          <p className="text-xs text-gray-400 text-center mt-8">
            {classrooms.length} classroom{classrooms.length !== 1 ? "s" : ""}{" "}
            &mdash; click a card to manage students and curriculum.
          </p>
        )}
      </main>

      {showCreate && (
        <CreateClassroomModal
          onClose={() => setShowCreate(false)}
          onCreated={(newClassroom) => {
            setClassrooms((prev) => [newClassroom, ...prev]);
            setShowCreate(false);
          }}
        />
      )}
    </div>
  );
}
