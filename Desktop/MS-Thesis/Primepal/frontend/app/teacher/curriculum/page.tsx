"use client";

import { useCallback, useEffect, useState } from "react";
import { Upload, BookOpen } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { teacherFetch } from "@/lib/api-helpers";
import { useTeacherRole } from "@/lib/useTeacherRole";
import UploadBookModal from "@/components/teacher/UploadBookModal";
import type { SncTopic } from "@/types";

interface UploadRecord {
  id: string;
  book_title: string;
  grade_level: number;
  filename: string;
  total_chunks: number;
  embedded_count: number;
  created_at: string;
}

const GRADE_COLORS: Record<number, { badge: string; button: string }> = {
  1: { badge: "bg-emerald-100 text-emerald-700", button: "bg-emerald-600 hover:bg-emerald-700" },
  2: { badge: "bg-sky-100 text-sky-700",         button: "bg-sky-600 hover:bg-sky-700" },
  3: { badge: "bg-violet-100 text-violet-700",   button: "bg-violet-600 hover:bg-violet-700" },
  4: { badge: "bg-amber-100 text-amber-700",     button: "bg-amber-600 hover:bg-amber-700" },
  5: { badge: "bg-rose-100 text-rose-700",       button: "bg-rose-600 hover:bg-rose-700" },
  6: { badge: "bg-indigo-100 text-indigo-700",   button: "bg-indigo-600 hover:bg-indigo-700" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function CurriculumPage() {
  const [uploads, setUploads] = useState<UploadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalGrade, setModalGrade] = useState<number | null>(null);
  const [gradeTopics, setGradeTopics] = useState<SncTopic[]>([]);
  const { isAdmin } = useTeacherRole();

  const fetchUploads = useCallback(async () => {
    try {
      const data = await teacherFetch<UploadRecord[]>("/curriculum/uploads");
      setUploads(data);
    } catch {
      // silently ignore - show empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUploads();
  }, [fetchUploads]);

  const uploadsForGrade = (grade: number) =>
    uploads.filter((u) => u.grade_level === grade);

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Curriculum Hub</h1>

      {/* Grade cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {[1, 2, 3, 4, 5, 6].map((grade) => {
          const colors = GRADE_COLORS[grade];
          const gradeUploads = uploadsForGrade(grade);

          return (
            <div
              key={grade}
              className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm"
            >
              {/* Card header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${colors.badge}`}>
                  Grade {grade}
                </span>
                {isAdmin && (
                  <button
                    onClick={async () => {
                      setModalGrade(grade);
                      try {
                        const { data: { session } } = await supabase.auth.getSession();
                        if (!session) return;
                        const topicsBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
                        const res = await fetch(`${topicsBase}/topics?grade_level=${grade}`, {
                          headers: { Authorization: `Bearer ${session.access_token}` },
                        });
                        if (res.ok) setGradeTopics(await res.json());
                        else setGradeTopics([]);
                      } catch {
                        setGradeTopics([]);
                      }
                    }}
                    className={`flex items-center gap-1.5 text-xs font-medium text-white px-3 py-1.5 rounded-lg transition-colors ${colors.button}`}
                  >
                    <Upload size={12} />
                    Upload Book
                  </button>
                )}
              </div>

              {/* Upload history list */}
              <div className="px-5 py-3 min-h-[100px]">
                {loading && (
                  <p className="text-xs text-gray-400 text-center py-6">Loading…</p>
                )}

                {!loading && gradeUploads.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <BookOpen size={20} className="text-gray-300 mb-1" />
                    <p className="text-xs text-gray-400">No books uploaded yet</p>
                  </div>
                )}

                {!loading && gradeUploads.length > 0 && (
                  <ul className="space-y-2 py-1">
                    {gradeUploads.map((u) => (
                      <li key={u.id} className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">
                            {u.book_title}
                          </p>
                          <p className="text-xs text-gray-400 truncate">
                            {u.filename} · {u.embedded_count} chunks
                          </p>
                        </div>
                        <span className="text-xs text-gray-400 shrink-0 mt-0.5">
                          {formatDate(u.created_at)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Upload modal */}
      {modalGrade !== null && (
        <UploadBookModal
          gradeLevel={modalGrade}
          topics={gradeTopics}
          onClose={() => setModalGrade(null)}
          onSuccess={() => {
            setModalGrade(null);
            fetchUploads();
          }}
        />
      )}
    </div>
  );
}
