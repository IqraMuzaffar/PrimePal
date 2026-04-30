"use client";

import { useState, useEffect, useCallback } from "react";
import { getAdminHeaders } from "@/lib/adminAuth";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

// ── Types ────────────────────────────────────────────────────────────────────

interface StudentResult {
  student_id: string;
  student_name: string | null;
  evaluation_type: string;
  total: number;
  correct: number;
  psychometric_avg: number | null;
}

interface Classroom {
  id: string;
  name: string;
  grade_level: number;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  // Trigger post-test state
  const [scope, setScope] = useState<"global" | "grade" | "classroom">("global");
  const [gradeTarget, setGradeTarget] = useState("1");
  const [classroomTarget, setClassroomTarget] = useState("");
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [triggering, setTriggering] = useState(false);
  const [triggerResult, setTriggerResult] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Results state
  const [results, setResults] = useState<StudentResult[]>([]);
  const [loadingResults, setLoadingResults] = useState(true);
  const [resultsError, setResultsError] = useState("");

  // Fetch classrooms for dropdown
  useEffect(() => {
    (async () => {
      try {
        const headers = await getAdminHeaders();
        const res = await fetch(`${API_BASE}/admin/classrooms`, { headers });
        if (res.ok) {
          const data = await res.json();
          setClassrooms(data);
          if (data.length > 0) setClassroomTarget(data[0].id);
        }
      } catch {
        // best-effort
      }
    })();
  }, []);

  // Fetch evaluation results
  const fetchResults = useCallback(async () => {
    setLoadingResults(true);
    setResultsError("");
    try {
      const headers = await getAdminHeaders();
      const res = await fetch(`${API_BASE}/evaluations/results`, { headers });
      if (!res.ok) throw new Error("Failed to fetch results");
      const data = await res.json();
      setResults(data.results || []);
    } catch (err: any) {
      setResultsError(err.message || "Error loading results");
    } finally {
      setLoadingResults(false);
    }
  }, []);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  // Trigger handler
  const handleTrigger = async () => {
    setTriggering(true);
    setTriggerResult(null);
    try {
      const headers = await getAdminHeaders();
      const body: Record<string, string> = { scope };
      if (scope === "grade") body.target_id = gradeTarget;
      if (scope === "classroom") body.target_id = classroomTarget;

      const res = await fetch(`${API_BASE}/evaluations/trigger-post-test`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Trigger failed");
      }
      const data = await res.json();
      setTriggerResult(`Post-test unlocked for ${data.students_unlocked} student(s).`);
      setConfirmOpen(false);
      fetchResults();
    } catch (err: any) {
      setTriggerResult(`Error: ${err.message}`);
    } finally {
      setTriggering(false);
    }
  };

  // Aggregate stats
  const preResults = results.filter((r) => r.evaluation_type === "pre");
  const postResults = results.filter((r) => r.evaluation_type === "post");

  const avgScore = (items: StudentResult[]) => {
    if (items.length === 0) return "N/A";
    const totalCorrect = items.reduce((s, r) => s + r.correct, 0);
    const totalQ = items.reduce((s, r) => s + r.total, 0);
    if (totalQ === 0) return "N/A";
    return `${Math.round((totalCorrect / totalQ) * 100)}%`;
  };

  // Group by grade for results table
  const gradeGroups: Record<string, StudentResult[]> = {};
  for (const r of results) {
    // We don't have grade in result directly, but we have it in the data
    // Group by evaluation_type for summary
    const key = r.evaluation_type;
    if (!gradeGroups[key]) gradeGroups[key] = [];
    gradeGroups[key].push(r);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Evaluation Dashboard</h1>

      {/* ── Trigger Post-Test Card ─────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-slate-700 mb-4">
          Trigger Post-Test
        </h2>

        <div className="flex flex-wrap items-end gap-4">
          {/* Scope selector */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Scope
            </label>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as any)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="global">Global (all students)</option>
              <option value="grade">By Grade</option>
              <option value="classroom">By Classroom</option>
            </select>
          </div>

          {/* Grade dropdown */}
          {scope === "grade" && (
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                Grade
              </label>
              <select
                value={gradeTarget}
                onChange={(e) => setGradeTarget(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
              <label className="block text-sm font-medium text-slate-600 mb-1">
                Classroom
              </label>
              <select
                value={classroomTarget}
                onChange={(e) => setClassroomTarget(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {classrooms.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (Grade {c.grade_level})
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
              <span className="text-sm text-amber-700 font-medium">
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
                className="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-300 transition-colors"
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
                ? "text-red-600"
                : "text-green-600"
            }`}
          >
            {triggerResult}
          </p>
        )}
      </div>

      {/* ── Results Summary Card ───────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-slate-700 mb-4">
          Evaluation Results Summary
        </h2>

        {loadingResults && (
          <p className="text-sm text-slate-500">Loading results...</p>
        )}
        {resultsError && (
          <p className="text-sm text-red-600">{resultsError}</p>
        )}

        {!loadingResults && !resultsError && (
          <>
            {/* Quick stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="bg-indigo-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-indigo-700">
                  {preResults.length}
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  Pre-test submissions
                </p>
              </div>
              <div className="bg-emerald-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-emerald-700">
                  {postResults.length}
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  Post-test submissions
                </p>
              </div>
              <div className="bg-amber-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-amber-700">
                  {avgScore(preResults)}
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  Avg pre-test score
                </p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-purple-700">
                  {avgScore(postResults)}
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  Avg post-test score
                </p>
              </div>
            </div>

            {/* Per-student table */}
            {results.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-3 py-2 font-medium">Student</th>
                      <th className="px-3 py-2 font-medium">Type</th>
                      <th className="px-3 py-2 font-medium">Score</th>
                      <th className="px-3 py-2 font-medium">
                        Psychometric Avg
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {results.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-3 py-2">
                          {r.student_name || r.student_id.slice(0, 8)}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                              r.evaluation_type === "pre"
                                ? "bg-indigo-100 text-indigo-700"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {r.evaluation_type}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          {r.correct}/{r.total}
                          {r.total > 0 && (
                            <span className="text-slate-400 ml-1">
                              ({Math.round((r.correct / r.total) * 100)}%)
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2">
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
              <p className="text-sm text-slate-500">
                No evaluation results yet.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
