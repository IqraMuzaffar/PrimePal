"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAchievements, type AchievementProgress } from "@/lib/hooks/queries";
import PageHero from "@/components/student/PageHero";
import SectionHeading from "@/components/student/SectionHeading";

// ── Types ──────────────────────────────────────────────────────────────────

type Achievement = AchievementProgress;

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
        className="bg-white rounded-3xl p-5 border-2 border-amber-200 shadow-[0_8px_24px_rgba(251,191,36,0.12)] flex flex-col items-center gap-2 transition-transform duration-200 hover:-translate-y-1"
      >
        <span className="text-5xl sm:text-6xl">{achievement.icon}</span>
        <p className="font-baloo font-extrabold text-base text-center">
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
      className="bg-slate-50 rounded-3xl p-5 border-2 border-slate-200 opacity-70 flex flex-col items-center gap-2"
    >
      <span className="text-5xl sm:text-6xl grayscale">{achievement.icon}</span>
      <p className="font-baloo font-extrabold text-base text-center text-slate-400">
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
        <p className="bg-slate-200 text-slate-600 px-2.5 py-0.5 rounded-full text-xs font-baloo font-extrabold text-center mt-1 inline-block">
          {achievement.current_progress} / {achievement.threshold_value}
        </p>
      </div>
    </motion.div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function AchievementsPage() {
  const router = useRouter();
  const { data, isLoading: loading, error, refetch } = useAchievements();

  const achievements: Achievement[] = data?.achievements ?? [];
  const unlocked = achievements.filter((a) => a.unlocked);
  const locked = achievements.filter((a) => !a.unlocked);

  if (error) {
    return (
      <div className="space-y-6 pb-10">
        <PageHero label="YOUR BADGES" name="Trophy Cabinet" subtitle="Collect them all!" mascot="🏆" />
        <div className="flex items-center justify-center py-16">
          <div className="bg-white rounded-2xl border border-red-200 p-8 max-w-sm text-center shadow-sm">
            <div className="text-4xl mb-3">🏆</div>
            <p className="text-gray-700 font-semibold mb-2">Could not load badges</p>
            <p className="text-sm text-gray-500 mb-5">Something went wrong. Please try again.</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => refetch()}
                className="px-4 py-2 bg-emerald-500 text-white font-semibold rounded-lg hover:bg-emerald-600 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => router.push("/student/home")}
                className="px-4 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
              >
                Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <PageHero label="YOUR BADGES" name="Trophy Cabinet" subtitle="Collect them all!" mascot="🏆" />

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <AchievementSkeleton key={i} />
          ))}
        </div>
      ) : (
        <>
          {/* Unlocked achievements */}
          {unlocked.length > 0 && (
            <section>
              <SectionHeading icon="✨" title="Earned" tone="amber" />
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {unlocked.map((a) => (
                  <AchievementCard key={a.id} achievement={a} />
                ))}
              </div>
            </section>
          )}

          {/* Locked achievements */}
          {locked.length > 0 && (
            <section>
              <SectionHeading icon="🔒" title="Coming Up" tone="violet" />
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
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
