"use client";

import { useState, useEffect } from "react";
import {
  useAdminClassrooms,
  useAdminEvalResults,
  useTriggerPostTest,
} from "@/lib/hooks/admin-queries";
import { getAdminHeaders } from "@/lib/adminAuth";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

// ── Component ────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  // Trigger post-test state
  const [scope, setScope] = useState<"global" | "grade" | "classroom">("global");
  const [gradeTarget, setGradeTarget] = useState("1");
  const [classroomTarget, setClassroomTarget] = useState("");
  const [triggerResult, setTriggerResult] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: classrooms = [] } = useAdminClassrooms();
  const { data: evalData, isLoading: loadingResults, error: resultsError } = useAdminEvalResults();
  const triggerPostTest = useTriggerPostTest();

  // Set default classroom target when classrooms load
  useEffect(() => {
    if (classrooms.length > 0 && !classroomTarget) {
      setClassroomTarget(classrooms[0].id);
    }
  }, [classrooms, classroomTarget]);

  const results = evalData?.results ?? [];
  const triggering = triggerPostTest.isPending;

  // Trigger handler
  const handleTrigger = async () => {
    setTriggerResult(null);
    try {
      const body: Record<string, string> = { scope };
      if (scope === "grade") body.target_id = gradeTarget;
      if (scope === "classroom") body.target_id = classroomTarget;
      const data = await triggerPostTest.mutateAsync(body);
      setTriggerResult(`Post-test unlocked for ${data.students_unlocked} student(s).`);
      setConfirmOpen(false);
    } catch (err: any) {
      setTriggerResult(`Error: ${err.message}`);
    }
  };

  // Aggregate stats
  const preResults = results.filter((r) => r.evaluation_type === "pre");
  const postResults = results.filter((r) => r.evaluation_type === "post");

  const avgScore = (items: typeof results) => {
    if (items.length === 0) return "N/A";
    const totalCorrect = items.reduce((s, r) => s + r.correct, 0);
    const totalQ = items.reduce((s, r) => s + r.total, 0);
    if (totalQ === 0) return "N/A";
    return `${Math.round((totalCorrect / totalQ) * 100)}%`;
  };

  // (grouped by evaluation_type for summary — kept for future use)
  const _gradeGroups: Record<string, typeof results> = {};
  for (const r of results) {
    const key = r.evaluation_type;
    if (!_gradeGroups[key]) _gradeGroups[key] = [];
    _gradeGroups[key].push(r);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Evaluation Dashboard</h1>

      {/* ── Trigger Post-Test Card ─────────────────────────────────── */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-slate-200 mb-4">
          Trigger Post-Test
        </h2>

        <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-end gap-3 sm:gap-4">
          {/* Scope selector */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">
              Scope
            </label>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as any)}
              className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="global">Global (all students)</option>
              <option value="grade">By Grade</option>
              <option value="classroom">By Classroom</option>
            </select>
          </div>

          {/* Grade dropdown */}
          {scope === "grade" && (
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">
                Grade
              </label>
              <select
                value={gradeTarget}
                onChange={(e) => setGradeTarget(e.target.value)}
                className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {[1, 2, 3, 4, 5].map((g) => (
                  <option key={g} value={String(g)}>
                    Grade {g}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Classroom dropdown */}
          {scope === "classroom" && (
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">
                Classroom
              </label>
              <select
                value={classroomTarget}
                onChange={(e) => setClassroomTarget(e.target.value)}
                className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {classrooms.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.class_name} (Grade {c.grade_level})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Trigger button */}
          {!confirmOpen ? (
            <button
              onClick={() => setConfirmOpen(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              Unlock Post-Test
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm text-amber-400 font-medium">
                Are you sure?
              </span>
              <button
                onClick={handleTrigger}
                disabled={triggering}
                className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {triggering ? "Unlocking..." : "Confirm"}
              </button>
              <button
                onClick={() => setConfirmOpen(false)}
                className="bg-slate-600 text-slate-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-500 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {triggerResult && (
          <p
            className={`mt-3 text-sm font-medium ${
              triggerResult.startsWith("Error")
                ? "text-red-400"
                : "text-green-400"
            }`}
          >
            {triggerResult}
          </p>
        )}
      </div>

      {/* ── Results Summary Card ───────────────────────────────────── */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-200">
            Evaluation Results Summary
          </h2>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                try {
                  const headers = await getAdminHeaders();
                  const res = await fetch(`${API}/admin/export/evaluations-pivoted`, { headers });
                  if (!res.ok) throw new Error("Export failed");
                  const blob = await res.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a"); a.href = url; a.download = "student_evaluations.csv"; a.click(); URL.revokeObjectURL(url);
                } catch (e) { alert((e as Error).message); }
              }}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-medium rounded-lg transition-colors"
            >
              📥 Student Evals CSV
            </button>
            <button
              onClick={async () => {
                try {
                  const headers = await getAdminHeaders();
                  const res = await fetch(`${API}/teacher-evaluations/export`, { headers });
                  if (!res.ok) throw new Error("Export failed");
                  const blob = await res.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a"); a.href = url; a.download = "teacher_evaluations.csv"; a.click(); URL.revokeObjectURL(url);
                } catch (e) { alert((e as Error).message); }
              }}
              className="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-600 text-white text-xs font-medium rounded-lg transition-colors"
            >
              📥 Teacher Evals CSV
            </button>
          </div>
        </div>

        {loadingResults && (
          <p className="text-sm text-slate-400">Loading results...</p>
        )}
        {resultsError && (
          <p className="text-sm text-red-400">
            {resultsError instanceof Error ? resultsError.message : "Error loading results"}
          </p>
        )}

        {!loadingResults && !resultsError && (
          <>
            {/* Quick stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="bg-indigo-900/40 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-indigo-400">
                  {preResults.length}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Pre-test submissions
                </p>
              </div>
              <div className="bg-emerald-900/40 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-emerald-400">
                  {postResults.length}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Post-test submissions
                </p>
              </div>
              <div className="bg-amber-900/40 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-amber-400">
                  {avgScore(preResults)}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Avg pre-test score
                </p>
              </div>
              <div className="bg-purple-900/40 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-purple-400">
                  {avgScore(postResults)}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Avg post-test score
                </p>
              </div>
            </div>

            {/* Per-student table */}
            {results.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-700/50 text-slate-300">
                    <tr>
                      <th className="px-3 py-2 font-medium">Student</th>
                      <th className="px-3 py-2 font-medium">Type</th>
                      <th className="px-3 py-2 font-medium">Score</th>
                      <th className="px-3 py-2 font-medium">
                        Psychometric Avg
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {results.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-700/30">
                        <td className="px-3 py-2 text-slate-200">
                          {r.student_name || r.student_id.slice(0, 8)}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                              r.evaluation_type === "pre"
                                ? "bg-indigo-900/50 text-indigo-300"
                                : "bg-emerald-900/50 text-emerald-300"
                            }`}
                          >
                            {r.evaluation_type}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-200">
                          {r.correct}/{r.total}
                          {r.total > 0 && (
                            <span className="text-slate-500 ml-1">
                              ({Math.round((r.correct / r.total) * 100)}%)
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-slate-200">
                          {r.psychometric_avg !== null
                            ? `${r.psychometric_avg}/3`
                            : "---"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-slate-400">
                No evaluation results yet.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
