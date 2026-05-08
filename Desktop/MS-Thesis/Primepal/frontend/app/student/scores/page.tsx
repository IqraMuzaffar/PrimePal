"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Target, Star, CheckCircle } from "lucide-react";
import { useMyScores } from "@/lib/hooks/queries";
import PageHero from "@/components/student/PageHero";
import SectionHeading from "@/components/student/SectionHeading";

// ── Pillar Config ────────────────────────────────────────────────────────────

const PILLAR_CONFIG: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  reading: { label: "Reading", icon: "📖", color: "text-indigo-700", bg: "bg-indigo-50 border-indigo-200" },
  writing: { label: "Writing", icon: "✍️", color: "text-violet-700", bg: "bg-violet-50 border-violet-200" },
  listening: { label: "Listening", icon: "👂", color: "text-sky-700", bg: "bg-sky-50 border-sky-200" },
  speaking: { label: "Speaking", icon: "🗣️", color: "text-rose-700", bg: "bg-rose-50 border-rose-200" },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatNumber(num: number): string {
  return num.toLocaleString();
}

function getAccuracyColor(pct: number): string {
  if (pct >= 70) return "text-emerald-600";
  if (pct >= 40) return "text-amber-600";
  return "text-rose-600";
}

function getAccuracyBg(pct: number): string {
  if (pct >= 70) return "from-emerald-400 to-emerald-600";
  if (pct >= 40) return "from-amber-400 to-amber-600";
  return "from-rose-400 to-rose-600";
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

function ScoresSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl border-2 border-slate-200 p-6 animate-pulse">
            <div className="h-12 w-12 bg-slate-200 rounded-full mb-3" />
            <div className="h-8 w-20 bg-slate-200 rounded mb-2" />
            <div className="h-4 w-24 bg-slate-200 rounded" />
          </div>
        ))}
      </div>

      {/* Pillar breakdown skeleton */}
      <div className="bg-white rounded-2xl border-2 border-slate-200 p-6 animate-pulse">
        <div className="h-6 w-32 bg-slate-200 rounded mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-slate-100 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function ScoresPage() {
  const [timeRange, setTimeRange] = useState<string>("everything");
  const { data, isLoading, error } = useMyScores(timeRange);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <PageHero label="MY SCORES" name="Your Progress" subtitle="See how far you've come!" mascot="📊" />

      {/* Time filter */}
      <div className="flex justify-end">
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="bg-white rounded-2xl border-2 border-slate-200 px-4 py-2 font-baloo font-extrabold text-sm
                     focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400
                     transition-all"
        >
          <option value="everything">Everything</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
        </select>
      </div>

      {/* Loading state */}
      {isLoading && <ScoresSkeleton />}

      {/* Error state */}
      {error && (
        <div className="bg-rose-50 border-2 border-rose-200 rounded-2xl p-8 text-center">
          <p className="text-lg font-bold text-rose-700">
            Can&apos;t load scores right now. Try again!
          </p>
        </div>
      )}

      {/* Data loaded */}
      {data && !isLoading && (
        <>
          {/* Empty state */}
          {data.total_questions === 0 ? (
            <div className="bg-indigo-50 border-2 border-indigo-200 rounded-2xl p-12 text-center">
              <p className="text-2xl font-extrabold text-indigo-700 mb-2">
                Start answering questions to see your scores!
              </p>
              <p className="text-slate-600">
                Complete missions to track your progress here!
              </p>
            </div>
          ) : (
            <>
              {/* At a Glance */}
              <SectionHeading icon="📈" title="At a Glance" tone="blue" />

              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Total Questions */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0 }}
                  className="bg-white rounded-3xl p-6 border-2 border-slate-100 shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition-transform duration-200 hover:-translate-y-1"
                >
                  <Target className="w-12 h-12 mb-3 text-indigo-500" />
                  <p className="text-4xl sm:text-5xl font-baloo font-extrabold text-slate-900 mb-1">{formatNumber(data.total_questions)}</p>
                  <p className="text-sm font-semibold text-slate-500">Total Questions</p>
                </motion.div>

                {/* Stars Earned */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white rounded-3xl p-6 border-2 border-slate-100 shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition-transform duration-200 hover:-translate-y-1"
                >
                  <Star className="w-12 h-12 mb-3 text-amber-400 fill-current" />
                  <p className="text-4xl sm:text-5xl font-baloo font-extrabold text-slate-900 mb-1">{formatNumber(data.total_points)}</p>
                  <p className="text-sm font-semibold text-slate-500">Stars Earned</p>
                </motion.div>

                {/* Accuracy */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white rounded-3xl p-6 border-2 border-slate-100 shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition-transform duration-200 hover:-translate-y-1"
                >
                  <CheckCircle className={`w-12 h-12 mb-3 ${getAccuracyColor(data.overall_accuracy_pct)}`} />
                  <p className={`text-4xl sm:text-5xl font-baloo font-extrabold text-slate-900 mb-1`}>{data.overall_accuracy_pct}%</p>
                  <p className="text-sm font-semibold text-slate-500">Accuracy</p>
                </motion.div>
              </div>

              {/* By Pillar */}
              <SectionHeading icon="🎯" title="By Pillar" tone="violet" />

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                {data.pillar_scores.map((pillar) => {
                  const config = PILLAR_CONFIG[pillar.pillar];
                  if (!config) return null;

                  const borderColor =
                    pillar.pillar === "reading"
                      ? "border-l-blue-400"
                      : pillar.pillar === "writing"
                      ? "border-l-violet-400"
                      : pillar.pillar === "listening"
                      ? "border-l-cyan-400"
                      : "border-l-rose-400";

                  return (
                    <div
                      key={pillar.pillar}
                      className={`bg-white border-l-4 ${borderColor} rounded-2xl px-5 py-4 mb-3 shadow-[0_4px_12px_rgba(15,23,42,0.04)] transition-all hover:shadow-md`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{config.icon}</span>
                          <div>
                            <p className={`font-extrabold text-lg ${config.color}`}>
                              {config.label}
                            </p>
                            <p className="text-sm text-slate-600 font-medium">
                              {pillar.correct} / {pillar.total} correct
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className={`text-2xl font-extrabold ${getAccuracyColor(pillar.accuracy_pct)}`}>
                            {pillar.accuracy_pct}%
                          </p>
                          <p className="text-xs text-slate-500 font-semibold">Accuracy</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            </>
          )}
        </>
      )}
    </div>
  );
}
