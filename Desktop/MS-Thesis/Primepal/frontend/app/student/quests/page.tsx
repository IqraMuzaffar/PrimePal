"use client";

import { motion } from "framer-motion";
import { useWeeklyProgress } from "@/lib/hooks/queries";

const PILLAR_CONFIG: Record<string, { icon: string; color: string; bg: string; track: string }> = {
  reading: {
    icon: "📖",
    color: "bg-indigo-500",
    bg: "bg-indigo-50 border-indigo-200",
    track: "bg-indigo-100",
  },
  writing: {
    icon: "✏️",
    color: "bg-amber-500",
    bg: "bg-amber-50 border-amber-200",
    track: "bg-amber-100",
  },
  listening: {
    icon: "👂",
    color: "bg-emerald-500",
    bg: "bg-emerald-50 border-emerald-200",
    track: "bg-emerald-100",
  },
  speaking: {
    icon: "🎤",
    color: "bg-rose-500",
    bg: "bg-rose-50 border-rose-200",
    track: "bg-rose-100",
  },
};

function QuestsSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="rounded-2xl border-2 border-slate-200 bg-slate-50 p-4 animate-pulse">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-slate-200" />
            <div className="h-5 w-24 bg-slate-200 rounded-full" />
          </div>
          <div className="h-3 w-full bg-slate-200 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export default function QuestsPage() {
  const { data, isLoading, error } = useWeeklyProgress();

  if (isLoading) {
    return (
      <div className="max-w-md mx-auto space-y-6 pb-10">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800">Weekly Quests</h1>
          <p className="text-sm text-slate-500 mt-1">Loading...</p>
        </div>
        <QuestsSkeleton />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-md mx-auto space-y-6 pb-10">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800">Weekly Quests</h1>
        </div>
        <div className="rounded-2xl border-2 border-slate-200 bg-slate-50 p-6 text-center">
          <span className="text-3xl mb-2 block">📋</span>
          <p className="text-sm font-bold text-slate-400">
            Could not load quests. Try again later.
          </p>
        </div>
      </div>
    );
  }

  const allComplete = data.pillars.every((p) => p.done >= p.target);

  return (
    <div className="max-w-md mx-auto space-y-6 pb-10">
      <div>
        <h1 className="text-xl font-extrabold text-slate-800">Weekly Quests</h1>
        {data.week_topic && (
          <p className="text-sm text-slate-500 mt-1">
            Topic: <span className="font-semibold text-indigo-600">{data.week_topic}</span>
          </p>
        )}
      </div>

      {allComplete && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl bg-gradient-to-r from-emerald-500 to-green-500 p-4 text-center text-white shadow-lg"
        >
          <span className="text-3xl block mb-1">🎉</span>
          <p className="font-extrabold text-lg">All Quests Complete!</p>
          <p className="text-sm text-emerald-100">Amazing work this week!</p>
        </motion.div>
      )}

      <div className="space-y-4">
        {data.pillars.map((pillar, i) => {
          const config = PILLAR_CONFIG[pillar.pillar] ?? {
            icon: "📝",
            color: "bg-slate-500",
            bg: "bg-slate-50 border-slate-200",
            track: "bg-slate-100",
          };
          const isComplete = pillar.done >= pillar.target;

          return (
            <motion.div
              key={pillar.pillar}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className={`rounded-2xl border-2 p-4 ${config.bg} ${isComplete ? "ring-2 ring-emerald-400 ring-offset-1" : ""}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">{config.icon}</span>
                  <span className="font-extrabold text-slate-700 capitalize text-base">
                    {pillar.pillar}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-500">
                    {pillar.done}/{pillar.target}
                  </span>
                  {isComplete && <span className="text-lg">✅</span>}
                </div>
              </div>

              <div className={`w-full h-3 rounded-full ${config.track} overflow-hidden`}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(pillar.pct, 100)}%` }}
                  transition={{ duration: 0.6, delay: i * 0.08 + 0.2, ease: "easeOut" }}
                  className={`h-full rounded-full ${config.color}`}
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      {data.pillars.length === 0 && (
        <div className="rounded-2xl border-2 border-slate-200 bg-slate-50 p-6 text-center">
          <span className="text-3xl mb-2 block">📋</span>
          <p className="text-sm font-bold text-slate-400">
            No quests available yet. Complete some missions first!
          </p>
        </div>
      )}
    </div>
  );
}
