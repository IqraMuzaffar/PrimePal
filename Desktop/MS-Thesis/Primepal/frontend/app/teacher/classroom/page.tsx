// frontend/app/(teacher)/classroom/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Copy, Check, BookOpen } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { getTeacherHeaders } from "@/lib/teacherAuth";
import CreateClassroomModal from "@/components/teacher/CreateClassroomModal";
import type { Classroom } from "@/types";

export default function ClassroomPage() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  async function fetchClassrooms() {
    try {
      const headers = await getTeacherHeaders();
      const data = await apiFetch<Classroom[]>("/classroom/", { headers });
      setClassrooms(data);
    } catch {
      // Session expired or unauthenticated — show empty state
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchClassrooms();
  }, []);

  async function copyCode(e: React.MouseEvent, code: string) {
    e.preventDefault(); // don't navigate to classroom detail
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  return (
    <div className="bg-gray-50 min-h-full p-6">
      <div className="max-w-4xl mx-auto">

        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Classroom Manager</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Manage your classes and student rosters
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
          >
            <Plus size={16} />
            New Classroom
          </button>
        </div>

        {/* Loading skeletons */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-gray-200 p-5 h-36 animate-pulse"
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && classrooms.length === 0 && (
          <div className="text-center py-24 text-gray-400">
            <BookOpen size={40} className="mx-auto mb-3 opacity-40" />
            <p className="font-medium text-gray-500">No classrooms yet</p>
            <p className="text-sm mt-1">
              Create your first classroom to get started.
            </p>
          </div>
        )}

        {/* Classroom card grid */}
        {!loading && classrooms.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {classrooms.map((c) => (
              <Link
                key={c.id}
                href={`/teacher/classroom/${c.id}`}
                className="block bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md hover:border-indigo-200 transition-all"
              >
                <div className="mb-3">
                  <span className="text-xs font-medium bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                    Grade {c.grade_level}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-4 leading-tight">
                  {c.class_name}
                </h3>
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
                      <Check size={16} className="text-green-500" />
                    ) : (
                      <Copy size={16} />
                    )}
                  </button>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

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
