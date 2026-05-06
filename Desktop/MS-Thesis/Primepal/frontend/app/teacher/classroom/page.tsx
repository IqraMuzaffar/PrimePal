// frontend/app/teacher/classroom/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Copy, Check, BookOpen, Settings, Trash2 } from "lucide-react";
import { useTeacherRole } from "@/lib/useTeacherRole";
import { useTeacherClassrooms } from "@/lib/hooks/teacher-queries";
import { useQueryClient } from "@tanstack/react-query";
import { teacherQueryKeys } from "@/lib/hooks/teacher-queries";
import CreateClassroomModal from "@/components/teacher/CreateClassroomModal";

export default function ClassroomPage() {
  const { data: classrooms = [], isLoading: loading } = useTeacherClassrooms();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const { isAdmin } = useTeacherRole();

  async function copyCode(e: React.MouseEvent, code: string) {
    e.preventDefault();
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  return (
    <div className="bg-gray-50 min-h-full p-4 lg:p-6">
      <div className="max-w-5xl mx-auto">

        {/* Page header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Classroom Manager</h1>
              <p className="text-gray-600 mt-1">Create, manage, and organize your classrooms</p>
            </div>
            {isAdmin && (
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-5 py-2.5 rounded-lg transition-colors shrink-0"
              >
                <Plus size={18} />
                New Classroom
              </button>
            )}
          </div>

          {/* Info banner */}
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
            <BookOpen className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-medium">Need help?</p>
              <p>Click on a classroom card to manage students, or use the action buttons to edit classroom details.</p>
            </div>
          </div>
        </div>

        {/* Loading skeletons */}
        {loading && (
          <div className="grid grid-cols-1 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-gray-200 p-5 h-24 animate-pulse"
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && classrooms.length === 0 && (
          <div className="text-center py-24 bg-white rounded-2xl border-2 border-dashed border-gray-200">
            <BookOpen size={40} className="mx-auto mb-4 text-gray-300" />
            <p className="font-semibold text-gray-700 text-lg">No classrooms yet</p>
            <p className="text-sm text-gray-500 mt-2">
              {isAdmin ? "Create your first classroom to start managing students." : "No classrooms have been assigned to you yet."}
            </p>
            {isAdmin && (
              <button
                onClick={() => setShowCreate(true)}
                className="mt-6 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-5 py-2.5 rounded-lg transition-colors mx-auto"
              >
                <Plus size={18} />
                Create Classroom
              </button>
            )}
          </div>
        )}

        {/* Classroom list - table view for management */}
        {!loading && classrooms.length > 0 && (
          <div className="space-y-4">
            {/* Group by grade */}
            {(() => {
              const byGrade: Record<number, typeof classrooms> = {};
              for (const c of classrooms) {
                if (!byGrade[c.grade_level]) byGrade[c.grade_level] = [];
                byGrade[c.grade_level].push(c);
              }
              const sortedGrades = Object.keys(byGrade).map(Number).sort((a, b) => a - b);

              return sortedGrades.map((grade) => (
                <div key={grade}>
                  {/* Grade section header */}
                  <div className="flex items-center gap-3 mb-3 px-1">
                    <h2 className="text-base font-bold text-gray-700 uppercase tracking-wide">
                      Grade {grade}
                    </h2>
                    <span className="inline-block px-2.5 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                      {byGrade[grade].length} {byGrade[grade].length === 1 ? 'class' : 'classes'}
                    </span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>

                  {/* Classroom rows */}
                  <div className="space-y-2 mb-6">
                    {byGrade[grade].map((c) => (
                      <div
                        key={c.id}
                        className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-indigo-300 transition-all"
                      >
                        <div className="flex items-center justify-between gap-4">
                          {/* Left: Classroom info */}
                          <div className="flex-1 min-w-0">
                            <Link
                              href={`/teacher/classroom/${c.id}`}
                              className="block font-semibold text-gray-900 hover:text-indigo-600 transition-colors truncate text-lg"
                            >
                              {c.class_name}
                            </Link>
                            <div className="flex items-center gap-3 mt-2">
                              <span className="font-mono text-sm font-bold tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded">
                                {c.class_code}
                              </span>
                              <button
                                onClick={(e) => copyCode(e, c.class_code)}
                                className="p-1.5 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                title="Copy class code"
                              >
                                {copiedCode === c.class_code ? (
                                  <Check size={16} className="text-green-500" />
                                ) : (
                                  <Copy size={16} />
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Right: Actions */}
                          <div className="flex items-center gap-2 shrink-0">
                            <Link
                              href={`/teacher/classroom/${c.id}`}
                              className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors text-sm font-medium"
                              title="Manage roster & settings"
                            >
                              <Settings size={16} />
                              Manage
                            </Link>
                            {isAdmin && (
                              <button
                                className="flex items-center justify-center p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete classroom"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ));
            })()}
          </div>
        )}

        {/* Stats footer */}
        {!loading && classrooms.length > 0 && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-indigo-600">{classrooms.length}</p>
                <p className="text-xs text-gray-500 mt-1">Total Classrooms</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-600">
                  {classrooms.reduce((grades, c) => grades.add(c.grade_level), new Set()).size}
                </p>
                <p className="text-xs text-gray-500 mt-1">Grade Levels</p>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <p className="text-2xl font-bold text-violet-600">
                  {classrooms.sort((a, b) => a.grade_level - b.grade_level)[0]?.grade_level} - {
                    classrooms.sort((a, b) => b.grade_level - a.grade_level)[0]?.grade_level
                  }
                </p>
                <p className="text-xs text-gray-500 mt-1">Grade Range</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Classroom Modal */}
      {showCreate && (
        <CreateClassroomModal
          onClose={() => setShowCreate(false)}
          onCreated={(_newClassroom) => {
            queryClient.invalidateQueries({ queryKey: teacherQueryKeys.classrooms });
            setShowCreate(false);
          }}
        />
      )}
    </div>
  );
}
