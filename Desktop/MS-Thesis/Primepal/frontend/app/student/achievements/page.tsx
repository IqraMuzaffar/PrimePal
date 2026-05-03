"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAchievements } from "@/lib/hooks/queries";

// ── Types ──────────────────────────────────────────────────────────────────

interface Achievement {
  id: string;
  name: string;
  description: string;
  description_ur: string;
  icon: string;
  tier: string;
  threshold_type: string;
  threshold_value: number;
  unlocked: boolean;
  unlocked_at: string | null;
  current_progress: number;
}

// ── Constants ──────────────────────────────────────────────────────────────

const TIER_STYLES: Record<string, { border: string; bg: string; badge: string; badgeText: string }> = {
  bronze: {
    border: "border-[#CD7F32]",
    bg: "bg-gradient-to-br from-amber-50 to-orange-50",
    badge: "bg-[#CD7F32]",
    badgeText: "text-white",
  },
  silver: {
    border: "border-[#C0C0C0]",
    bg: "bg-gradient-to-br from-slate-50 to-gray-100",
    badge: "bg-[#C0C0C0]",
    badgeText: "text-white",
  },
  gold: {
    border: "border-[#FFD700]",
    bg: "bg-gradient-to-br from-yellow-50 to-amber-100",
    badge: "bg-[#FFD700]",
    badgeText: "text-amber-900",
  },
};

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-PK", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

// ── Components ─────────────────────────────────────────────────────────────

function AchievementSkeleton() {
  return (
    <div className="rounded-2xl border-2 border-slate-200 bg-slate-50 p-4 animate-pulse">
      <div className="flex flex-col items-center gap-2">
        <div className="w-12 h-12 rounded-full bg-slate-200" />
        <div className="h-4 w-20 bg-slate-200 rounded-full" />
        <div className="h-3 w-24 bg-slate-200 rounded-full" />
      </div>
    </div>
  );
}

function AchievementCard({ achievement }: { achievement: Achievement }) {
  const style = TIER_STYLES[achievement.tier] || TIER_STYLES.bronze;
  const progress = Math.min(achievement.current_progress / achievement.threshold_value, 1);

  if (achievement.unlocked) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={[
          "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 shadow-md",
          style.border,
          style.bg,
        ].join(" ")}
      >
        <span className="text-4xl">{achievement.icon}</span>
        <p className="text-sm font-extrabold text-slate-800 text-center leading-tight">
          {achievement.name}
        </p>
        <p className="text-xs text-slate-500 text-center leading-tight">
          {achievement.description}
        </p>
        {achievement.description_ur && (
          <p className="text-xs text-slate-400 text-center leading-tight" dir="rtl">
            {achievement.description_ur}
          </p>
        )}
        <span
          className={[
            "text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full",
            style.badge,
            style.badgeText,
          ].join(" ")}
        >
          {achievement.tier}
        </span>
        {achievement.unlocked_at && (
          <span className="text-[10px] text-slate-400">
            Earned {formatDate(achievement.unlocked_at)}
          </span>
        )}
      </motion.div>
    );
  }

  // Locked card
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-slate-200 bg-slate-50 opacity-60"
    >
      <span className="text-4xl grayscale">{achievement.icon}</span>
      <p className="text-sm font-bold text-slate-400 text-center leading-tight">
        {achievement.name}
      </p>
      <p className="text-xs text-slate-400 text-center leading-tight">
        {achievement.description}
      </p>
      {/* Progress bar */}
      <div className="w-full mt-1">
        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-400 rounded-full transition-all duration-500"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <p className="text-[10px] text-slate-400 text-center mt-1 font-semibold">
          {achievement.current_progress} / {achievement.threshold_value}
        </p>
      </div>
    </motion.div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function AchievementsPage() {
  const router = useRouter();
  const { data, isLoading: loading, error } = useAchievements();

  const achievements = (data?.achievements ?? []) as unknown as Achievement[];
  const unlocked = achievements.filter((a) => a.unlocked);
  const locked = achievements.filter((a) => !a.unlocked);

  if (error) {
    router.push("/student/play");
    return null;
  }

  return (
    <div className="max-w-md mx-auto space-y-6 pb-10">
      <div className="text-center">
        <h1 className="text-2xl font-extrabold text-slate-800">Your Badges</h1>
        <p className="text-sm text-slate-500 mt-1">
          Complete missions and earn points to unlock badges!
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <AchievementSkeleton key={i} />
          ))}
        </div>
      ) : (
        <>
          {/* Unlocked achievements */}
          {unlocked.length > 0 && (
            <section>
              <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3">
                Earned ({unlocked.length})
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {unlocked.map((a) => (
                  <AchievementCard key={a.id} achievement={a} />
                ))}
              </div>
            </section>
          )}

          {/* Locked achievements */}
          {locked.length > 0 && (
            <section>
              <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3">
                Keep Going! ({locked.length} left)
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {locked.map((a) => (
                  <AchievementCard key={a.id} achievement={a} />
                ))}
              </div>
            </section>
          )}

          {achievements.length === 0 && (
            <div className="text-center py-12">
              <span className="text-5xl">🏅</span>
              <p className="text-slate-500 mt-3 font-semibold">
                No badges available yet. Start completing missions!
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
