"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useStudentLeaderboard } from "@/lib/hooks/queries";

export default function LeaderboardPage() {
  const router = useRouter();
  const { data, isLoading: loading, error } = useStudentLeaderboard();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-yellow-50 to-amber-50">
        <div className="text-center">
          <div className="text-5xl mb-4">🏆</div>
          <p className="text-gray-600 font-semibold">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-yellow-50 to-amber-50 px-4">
        <div className="bg-white rounded-2xl border border-red-200 p-8 max-w-sm text-center">
          <p className="text-red-600 font-semibold mb-4">
            {error instanceof Error ? error.message : "Failed to load leaderboard"}
          </p>
          <button
            onClick={() => router.push("/student/home")}
            className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Back Home
          </button>
        </div>
      </div>
    );
  }

  const topThree = data.entries.slice(0, 3);
  const restOfList = data.entries.slice(3);

  // Order for podium display: 2nd, 1st (center), 3rd
  const podiumOrder = [topThree[1], topThree[0], topThree[2]];
  const medals = ["🥈", "🥇", "🥉"];
  const podiumHeights = ["h-28", "h-40", "h-24"];

  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-50 to-amber-50 pb-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-yellow-400 to-amber-400 text-white p-4">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => router.push("/student/home")}
            className="flex items-center gap-2 text-sm font-semibold mb-4 hover:opacity-80 transition-opacity"
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <h1 className="text-2xl font-bold">🏆 Class Leaderboard</h1>
          <p className="text-sm text-white/80">
            {data.total_students} student{data.total_students !== 1 ? "s" : ""} in your class
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Podium (Top 3) */}
        {topThree.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <div className="flex items-end justify-center gap-2 h-56">
              {podiumOrder.map((entry, idx) => (
                entry ? (
                  <div
                    key={entry.student_id}
                    className={`flex flex-col items-center gap-3 ${
                      idx === 1 ? "z-10" : ""
                    }`}
                  >
                    {/* Medal */}
                    <span className="text-4xl">{medals[idx]}</span>

                    {/* Podium block */}
                    <div
                      className={`${podiumHeights[idx]} w-20 bg-gradient-to-b rounded-lg shadow-lg flex flex-col items-center justify-end pb-3 ${
                        idx === 0
                          ? "from-slate-300 to-slate-400"
                          : idx === 1
                          ? "from-yellow-300 to-yellow-400"
                          : "from-orange-200 to-orange-300"
                      }`}
                    >
                      {/* Initial */}
                      <div className="mb-2">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm border-2 border-white">
                          {entry.student_name.charAt(0).toUpperCase()}
                        </div>
                      </div>

                      {/* Rank */}
                      <span className="text-sm font-bold text-white">
                        #{entry.rank}
                      </span>
                    </div>

                    {/* Name and points */}
                    <div className="text-center">
                      <p className="text-xs font-bold text-gray-900 leading-tight">
                        {entry.student_name}
                      </p>
                      <p className="text-sm font-extrabold text-yellow-600">
                        {entry.points}⭐
                      </p>
                    </div>
                  </div>
                ) : null
              ))}
            </div>
          </motion.div>
        )}

        {/* Ranked List (#4 onwards) */}
        {restOfList.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="divide-y divide-gray-100">
              <AnimatePresence mode="popLayout">
                {restOfList.map((entry) => (
                  <motion.div
                    key={entry.student_id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className={`flex items-center gap-4 px-4 py-4 transition-colors ${
                      entry.is_current_student
                        ? "bg-indigo-50 border-l-4 border-indigo-600"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    {/* Rank */}
                    <div className="w-10 text-center">
                      <span className="text-lg font-bold text-gray-900">
                        #{entry.rank}
                      </span>
                    </div>

                    {/* Initial */}
                    <div>
                      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm border-2 border-gray-200">
                        {entry.student_name.charAt(0).toUpperCase()}
                      </div>
                    </div>

                    {/* Name */}
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">
                        {entry.student_name}
                      </p>
                    </div>

                    {/* Points */}
                    <div className="text-right">
                      <p className="text-lg font-bold text-yellow-600">
                        {entry.points}
                      </p>
                      <p className="text-xs text-gray-500">⭐</p>
                    </div>

                    {/* Current student badge */}
                    {entry.is_current_student && (
                      <div className="px-2 py-1 bg-indigo-600 text-white text-xs font-bold rounded">
                        YOU
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Empty state */}
        {data.entries.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <p className="text-gray-500 font-semibold">No students yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Classmates will appear here as they earn points
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
