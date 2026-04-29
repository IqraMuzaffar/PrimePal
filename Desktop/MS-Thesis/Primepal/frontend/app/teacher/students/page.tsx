"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, GraduationCap, FileText, ChevronRight, AlertCircle, RefreshCw, UserPlus, Pencil, Trash2, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "@/lib/api";
import { getTeacherHeaders } from "@/lib/teacherAuth";
import BulkAddStudentsModal from "@/components/teacher/BulkAddStudentsModal";
import EditStudentModal from "@/components/teacher/EditStudentModal";
import type { Student } from "@/types";

interface StudentRow {
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
}

const GRADE_COLORS: Record<number, string> = {
  1: "bg-emerald-100 text-emerald-700",
  2: "bg-sky-100 text-sky-700",
  3: "bg-violet-100 text-violet-700",
  4: "bg-amber-100 text-amber-700",
  5: "bg-rose-100 text-rose-700",
};

function accuracyColor(pct: number) {
  if (pct >= 70) return "text-emerald-600";
  if (pct >= 40) return "text-amber-600";
  return "text-rose-600";
}

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [classroomDetails, setClassroomDetails] = useState<Record<string, { id: string; students: Student[] }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterClassroom, setFilterClassroom] = useState("all");
  const [filterGrade, setFilterGrade] = useState("all");

  // Management states
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [pinStudent, setPinStudent] = useState<Student | null>(null);
  const [pinValue, setPinValue] = useState("");
  const [pinSaving, setPinSaving] = useState(false);
  const [pinSaveError, setPinSaveError] = useState<string | null>(null);
  const [pinSaved, setPinSaved] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const headers = await getTeacherHeaders();
        const data = await apiFetch<{ students: StudentRow[] }>("/evaluator/students", { headers });
        setStudents(data.students || []);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        console.error("Students load error:", msg);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function fetchClassroomDetails(classroomId: string) {
    if (classroomDetails[classroomId]) return;
    try {
      const headers = await getTeacherHeaders();
      const data = await apiFetch<{ id: string; students: Student[] }>(
        `/classroom/${classroomId}`,
        { headers }
      );
      setClassroomDetails((prev) => ({ ...prev, [classroomId]: data }));
    } catch (err) {
      console.error("Failed to fetch classroom details:", err);
    }
  }

  async function savePin(studentId: string, pin: string) {
    setPinSaving(true);
    setPinSaveError(null);
    try {
      const headers = await getTeacherHeaders();
      await apiFetch(`/classroom/${filterClassroom}/students/${studentId}`, {
        headers,
        method: "PATCH",
        body: JSON.stringify({ secret_pin: pin }),
      });
      setPinSaved(true);
      setTimeout(() => {
        setPinStudent(null);
        setPinSaved(false);
      }, 1500);
    } catch (err) {
      setPinSaveError(err instanceof Error ? err.message : "Failed to save PIN");
    } finally {
      setPinSaving(false);
    }
  }

  async function removeStudent(studentId: string) {
    if (!confirm("Remove this student from the roster?")) return;
    setDeleting(studentId);
    setRemoveError(null);
    try {
      const headers = await getTeacherHeaders();
      await apiFetch(`/classroom/${filterClassroom}/students/${studentId}`, {
        headers,
        method: "DELETE",
      });
      // Refresh the data
      window.location.reload();
    } catch (err) {
      setRemoveError(err instanceof Error ? err.message : "Failed to remove student");
      setDeleting(null);
    }
  }

  // Unique classrooms and grades for filter dropdowns
  const classrooms = Array.from(new Map(students.map(s => [s.classroom_id, s.classroom_name])).entries());
  const grades = Array.from(new Set(students.map(s => s.grade_level))).sort();

  const filtered = students.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q || s.student_name.toLowerCase().includes(q) || (s.roll_number ?? "").toLowerCase().includes(q);
    const matchClassroom = filterClassroom === "all" || s.classroom_id === filterClassroom;
    const matchGrade = filterGrade === "all" || String(s.grade_level) === filterGrade;
    return matchSearch && matchClassroom && matchGrade;
  });

  return (
    <div className="bg-gray-50 min-h-full">
      <main className="max-w-6xl mx-auto px-4 lg:px-6 py-6 lg:py-8">

        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <GraduationCap className="w-6 h-6 text-indigo-600" />
              Student Directory
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {loading ? "Loading…" : error ? "Failed to load" : `${students.length} students across all classrooms`}
            </p>
          </div>
          {error && (
            <button
              onClick={() => { setError(null); setLoading(true); window.location.reload(); }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-700"
            >
              <RefreshCw size={14} /> Retry
            </button>
          )}
        </div>

        {/* Error banner */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-rose-700">Failed to load students</p>
              <p className="text-xs text-rose-600 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Filters & Actions */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or roll number…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <select
              value={filterClassroom}
              onChange={e => {
                setFilterClassroom(e.target.value);
                if (e.target.value !== "all") {
                  fetchClassroomDetails(e.target.value);
                }
              }}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
            >
              <option value="all">All Classrooms</option>
              {classrooms.map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
            <select
              value={filterGrade}
              onChange={e => setFilterGrade(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
            >
              <option value="all">All Grades</option>
              {grades.map(g => (
                <option key={g} value={String(g)}>Grade {g}</option>
              ))}
            </select>
          </div>

          {/* Action buttons - only visible when classroom selected */}
          {filterClassroom !== "all" && (
            <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
              <button
                onClick={() => {
                  setShowBulkAdd(true);
                }}
                className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-lg transition-colors"
              >
                <UserPlus size={16} /> Add Students
              </button>
            </div>
          )}

          {/* Error banner */}
          {removeError && (
            <div className="mt-3 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {removeError}
            </div>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="divide-y divide-gray-100">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex items-center gap-4 px-6 py-4 animate-pulse">
                  <div className="w-9 h-9 rounded-full bg-gray-200 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-40" />
                    <div className="h-3 bg-gray-100 rounded w-24" />
                  </div>
                  <div className="h-4 bg-gray-200 rounded w-16" />
                  <div className="h-4 bg-gray-200 rounded w-20" />
                  <div className="h-4 bg-gray-200 rounded w-12" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <GraduationCap className="w-8 h-8 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No students found</p>
              <p className="text-xs text-gray-400 mt-1">Try adjusting your search or filters</p>
            </div>
          ) : (
            <>
              {/* Table header */}
              <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 px-6 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <span>Student</span>
                <span>Classroom</span>
                <span className="text-center">Points</span>
                <span className="text-center">Accuracy</span>
                <span className="text-center">Status</span>
                <span />
              </div>

              <div className="divide-y divide-gray-100">
                {filtered.map(s => (
                  <motion.div
                    key={s.student_id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className={`grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 items-center px-6 py-4 hover:bg-gray-50 transition-colors ${
                      filterClassroom !== "all" ? "sm:grid-cols-[2fr_1fr_1fr_1fr_auto]" : ""
                    }`}
                  >
                    {/* Name + roll */}
                    <div className="flex items-center gap-3">
                      {s.avatar_url ? (
                        <Image
                          src={s.avatar_url}
                          alt={s.student_name}
                          width={36}
                          height={36}
                          className="rounded-full bg-gray-100 shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm shrink-0">
                          {s.student_name[0]}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{s.student_name}</p>
                        <p className="text-xs text-gray-400">{s.roll_number ? `#${s.roll_number}` : "No roll no."}</p>
                      </div>
                    </div>

                    {/* Classroom - hide if classroom filter is active */}
                    {filterClassroom === "all" && (
                      <div>
                        <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full ${GRADE_COLORS[s.grade_level] ?? "bg-gray-100 text-gray-600"}`}>
                          Gr {s.grade_level}
                        </span>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{s.classroom_name}</p>
                      </div>
                    )}

                    {/* Points */}
                    <div className="text-center">
                      <p className="font-bold text-gray-900 text-sm">⭐ {s.total_points}</p>
                      <p className="text-xs text-gray-400">{s.total_interactions} q&apos;s</p>
                    </div>

                    {/* Accuracy */}
                    <div className="text-center">
                      <p className={`font-bold text-sm ${accuracyColor(s.mission_accuracy_pct)}`}>
                        {s.total_interactions === 0 ? "—" : `${s.mission_accuracy_pct}%`}
                      </p>
                      <p className="text-xs text-gray-400">accuracy</p>
                    </div>

                    {/* Active badge - hide if classroom filter is active */}
                    {filterClassroom === "all" && (
                      <div className="flex justify-center">
                        {s.active_this_week ? (
                          <span className="text-xs bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded-full">Active</span>
                        ) : (
                          <span className="text-xs bg-gray-100 text-gray-500 font-semibold px-2 py-0.5 rounded-full">Inactive</span>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className={`flex items-center gap-2 shrink-0 ${filterClassroom !== "all" ? "justify-end" : ""}`}>
                      {filterClassroom !== "all" ? (
                        <>
                          <button
                            onClick={() => setEditStudent({ id: s.student_id, student_name: s.student_name, avatar_url: s.avatar_url || "", roll_number: s.roll_number, email: null, secret_pin: "" })}
                            className="p-1.5 rounded text-gray-300 hover:text-indigo-500 transition-colors shrink-0"
                            title={`Edit ${s.student_name}`}
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => {
                              setPinStudent({ id: s.student_id, student_name: s.student_name, avatar_url: s.avatar_url || "", roll_number: s.roll_number, email: null, secret_pin: "" });
                              setPinValue("1234");
                              setPinSaveError(null);
                              setPinSaved(false);
                            }}
                            className="p-1.5 rounded text-gray-300 hover:text-indigo-500 transition-colors shrink-0"
                            title={`Manage PIN for ${s.student_name}`}
                          >
                            <Lock size={15} />
                          </button>
                          <button
                            onClick={() => removeStudent(s.student_id)}
                            disabled={deleting === s.student_id}
                            className="p-1.5 rounded text-gray-300 hover:text-red-500 transition-colors shrink-0 disabled:opacity-50"
                            title={`Remove ${s.student_name}`}
                          >
                            <Trash2 size={15} />
                          </button>
                        </>
                      ) : (
                        <Link
                          href={`/teacher/students/${s.student_id}/report?classroomId=${s.classroom_id}`}
                          className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                        >
                          <FileText size={13} />
                          Report
                          <ChevronRight size={12} />
                        </Link>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Modals */}
        {filterClassroom !== "all" && showBulkAdd && (
          <BulkAddStudentsModal
            classroomId={filterClassroom}
            onClose={() => setShowBulkAdd(false)}
            onAdded={() => {
              setShowBulkAdd(false);
              window.location.reload();
            }}
          />
        )}

        {editStudent && filterClassroom !== "all" && (
          <EditStudentModal
            student={editStudent}
            classroomId={filterClassroom}
            onClose={() => setEditStudent(null)}
            onSaved={() => {
              setEditStudent(null);
              window.location.reload();
            }}
          />
        )}

        {/* PIN Management Modal */}
        {pinStudent && filterClassroom !== "all" && (
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
      </main>
    </div>
  );
}
