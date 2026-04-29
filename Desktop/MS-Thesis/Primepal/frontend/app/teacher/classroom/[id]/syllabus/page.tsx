"use client";

import { useEffect, useState } from "react";
import { Lock, CheckCircle2, ChevronRight } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { getTeacherHeaders } from "@/lib/teacherAuth";

interface SyllabusWeek {
  id: string;
  week_number: number;
  topic_title: string;
  status: "locked" | "active" | "completed";
}

interface Props {
  params: { id: string };
}

export default function SyllabusPage({ params }: Props) {
  const [weeks, setWeeks] = useState<SyllabusWeek[]>([]);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSyllabus();
  }, []);

  async function fetchSyllabus() {
    try {
      setLoading(true);
      const headers = await getTeacherHeaders();
      const data = await apiFetch<{ weeks: SyllabusWeek[] }>(
        `/classroom/${params.id}/syllabus`,
        { headers }
      );
      setWeeks(data.weeks);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch syllabus:", err);
      setError("Failed to load syllabus");
    } finally {
      setLoading(false);
    }
  }

  async function unlockNextWeek() {
    const activeWeek = weeks.find((w) => w.status === "active");
    if (!activeWeek) {
      setError("No active week found");
      return;
    }

    const nextWeek = weeks.find((w) => w.week_number === activeWeek.week_number + 1);
    if (!nextWeek) {
      setError("No next week available");
      return;
    }

    try {
      setUnlocking(true);
      const headers = await getTeacherHeaders();

      // Mark current week as completed
      await apiFetch(
        `/classroom/${params.id}/syllabus/${activeWeek.week_number}`,
        {
          method: "PATCH",
          headers,
          body: JSON.stringify({ status: "completed" }),
        }
      );

      // Mark next week as active
      await apiFetch(
        `/classroom/${params.id}/syllabus/${nextWeek.week_number}`,
        {
          method: "PATCH",
          headers,
          body: JSON.stringify({ status: "active" }),
        }
      );

      await fetchSyllabus();
      setError(null);
    } catch (err) {
      console.error("Failed to unlock next week:", err);
      setError("Failed to unlock next week");
    } finally {
      setUnlocking(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Loading syllabus...</p>
        </div>
      </div>
    );
  }

  const activeWeek = weeks.find((w) => w.status === "active");
  const hasNextWeek = activeWeek && weeks.some((w) => w.week_number === activeWeek.week_number + 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">30-Week SNC Pacing Calendar</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage your curriculum pacing and unlock weeks as students progress
          </p>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* 30-Week Grid (5 rows × 6 cols) */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="grid grid-cols-6 gap-3">
          {weeks.map((week) => {
            const isLocked = week.status === "locked";
            const isActive = week.status === "active";
            const isCompleted = week.status === "completed";

            return (
              <div
                key={week.id}
                className={`rounded-lg border-2 p-4 transition-all ${
                  isLocked
                    ? "bg-gray-50 border-gray-200 text-gray-400"
                    : isActive
                    ? "bg-white border-indigo-500 animate-pulse shadow-md"
                    : isCompleted
                    ? "bg-green-50 border-green-300"
                    : ""
                }`}
              >
                {/* Week number or icon */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold">
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : isLocked ? (
                      <Lock className="w-4 h-4" />
                    ) : (
                      <span className="text-indigo-600">W{week.week_number}</span>
                    )}
                  </span>
                </div>

                {/* Topic title */}
                <p
                  className={`text-xs line-clamp-2 ${
                    isActive
                      ? "font-semibold text-gray-900"
                      : isCompleted
                      ? "font-medium text-gray-700"
                      : "text-gray-500"
                  }`}
                >
                  {week.topic_title}
                </p>

                {/* Status badge */}
                {isActive && (
                  <span className="inline-block mt-2 text-xs font-medium bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">
                    Active
                  </span>
                )}
                {isCompleted && (
                  <span className="inline-block mt-2 text-xs font-medium bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                    Done
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Unlock Next Week Button */}
      {hasNextWeek && (
        <div className="flex justify-end">
          <button
            onClick={unlockNextWeek}
            disabled={unlocking}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {unlocking ? "Unlocking…" : "Unlock Next Week"}
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {!hasNextWeek && activeWeek && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <p className="text-sm font-medium text-green-700">
            🎉 All weeks completed! Congratulations!
          </p>
        </div>
      )}
    </div>
  );
}
