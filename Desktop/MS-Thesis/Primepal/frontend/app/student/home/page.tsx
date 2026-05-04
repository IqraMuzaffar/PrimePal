"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  useStudentProfile,
  useStreak,
  useDailySummary,
  useAchievements,
  usePointsBreakdown,
  type AchievementProgress,
} from "@/lib/hooks/queries";
import AchievementPopup from "@/components/student/AchievementPopup";

// ── Constants ────────────────────────────────────────────────────────────────

const COMING_SOON: Array<{ id: string; icon: string; label: string; tagline: string }> = [];

const QUOTES = [
  "Every word you learn is a superpower! 💪",
  "Keep going — you're amazing! 🌟",
  "Learning is your greatest adventure! 🚀",
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function dicebearUrl(style: string, seed: string) {
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}`;
}

// ── Sub-components ───────────────────────────────────────────────────────────

function HeroSkeleton() {
  return (
    <div className="w-full rounded-3xl bg-gradient-to-r from-indigo-300 to-violet-300 p-6 animate-pulse flex justify-between items-center">
      <div className="space-y-2">
        <div className="h-7 w-40 bg-white/40 rounded-full" />
        <div className="h-5 w-28 bg-white/30 rounded-full" />
      </div>
      <div className="h-14 w-20 bg-white/40 rounded-2xl" />
    </div>
  );
}

function LockedCard({ icon, label, tagline }: { icon: string; label: string; tagline: string }) {
  const [shaking, setShaking] = useState(false);
  const [showTip, setShowTip] = useState(false);

  function handleClick() {
    if (shaking) return;
    setShaking(true);
    setShowTip(true);
    setTimeout(() => setShaking(false), 500);
    setTimeout(() => setShowTip(false), 2000);
  }

  return (
    <button
      onClick={handleClick}
      className={[
        "relative flex flex-col items-center justify-center gap-2 p-4 rounded-2xl w-full",
        "bg-slate-100 border-2 border-slate-200 text-slate-400",
        "transition-all duration-150 select-none",
        shaking ? "animate-[wiggle_0.4s_ease-in-out]" : "",
      ].join(" ")}
      aria-label={`${label} — coming soon`}
    >
      <span className="absolute top-2 right-2 text-xs opacity-50">🔒</span>
      <span className="text-3xl opacity-40">{icon}</span>
      <span className="text-xs font-bold text-slate-400 text-center leading-tight">{label}</span>
      <span className="text-[11px] text-slate-300 text-center leading-tight">{tagline}</span>
      {showTip && (
        <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap z-10 animate-[fadeInDown_0.2s_ease-out]">
          Coming Soon! 🔒
        </span>
      )}
    </button>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function HomePage() {
  const router = useRouter();

  // ── Data fetching via TanStack Query (all fire in parallel) ──
  const { data: profile, isLoading: loadingProfile } = useStudentProfile();
  const { data: streak } = useStreak();
  const { data: dailySummary } = useDailySummary();
  const { data: achievementsData } = useAchievements();
  const { data: pointsBreakdown } = usePointsBreakdown();

  // ── Local UI state ──
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [quoteFading, setQuoteFading] = useState(false);
  const [achievementPopup, setAchievementPopup] = useState<{ name: string; icon: string; tier: "bronze" | "silver" | "gold" } | null>(null);
  const [streakResetBanner, setStreakResetBanner] = useState(false);

  // Redirect if no token
  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("primepal_student_token") : null;
    if (!token) { router.push("/student/play"); }
  }, [router]);

  // Detect streak reset
  useEffect(() => {
    if (streak && streak.current_streak === 0 && streak.longest_streak > 0) {
      setStreakResetBanner(true);
      setTimeout(() => setStreakResetBanner(false), 6000);
    }
  }, [streak]);

  // Quote rotation timer
  useEffect(() => {
    const t = setInterval(() => {
      setQuoteFading(true);
      setTimeout(() => { setQuoteIndex((i) => (i + 1) % QUOTES.length); setQuoteFading(false); }, 400);
    }, 8000);
    return () => clearInterval(t);
  }, []);

  const points = profile?.points ?? 0;
  const name = profile?.student_name
    ?? (typeof window !== "undefined" ? localStorage.getItem("primepal_student_name") : null)
    ?? "Champion";

  // Resolve avatar URL: prefer profile value, fall back to generated dicebear
  const resolvedAvatarUrl = profile?.avatar_url || dicebearUrl("adventurer", name);

  return (
    <div className="max-w-md mx-auto space-y-6 pb-10">

      {/* Streak reset banner */}
      {streakResetBanner && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.4 }}
          className="w-full rounded-2xl bg-gradient-to-r from-orange-100 to-amber-100 border border-orange-200 p-3 text-center"
        >
          <p className="text-sm font-bold text-orange-700">
            Your streak reset — let&apos;s start a new one! {"💪"}
          </p>
        </motion.div>
      )}

      {/* ① Hero strip */}
      {loadingProfile ? <HeroSkeleton /> : (
        <div className="w-full rounded-3xl bg-gradient-to-r from-indigo-500 to-violet-600 p-5 flex items-center justify-between shadow-lg relative overflow-hidden">
          <div>
            <p className="text-white/80 text-sm font-semibold mb-0.5">Welcome back!</p>
            <h1 className="text-white text-2xl font-extrabold leading-tight drop-shadow">
              Hi {name}! 🌟
            </h1>
            <p className="text-white/80 text-sm mt-1">Ready to level up?</p>
          </div>
          <div className="flex items-center gap-2">
            {dailySummary && dailySummary.today_points > 0 && (
              <div className="flex flex-col items-center bg-white/20 rounded-2xl px-3 py-3 border-2 border-white/30">
                <span className="text-white font-extrabold text-xl leading-tight">+{dailySummary.today_points}</span>
                <span className="text-white/70 text-[10px] font-semibold">Today</span>
              </div>
            )}
            <div className="flex flex-col items-center bg-white/20 rounded-2xl px-4 py-3 border-2 border-white/30">
              {resolvedAvatarUrl ? (
                <Image src={resolvedAvatarUrl} alt={name} width={48} height={48} className="rounded-full border-2 border-white/60 mb-1" />
              ) : (
                <span className="text-3xl leading-none mb-1">⭐</span>
              )}
              <span className="text-white font-extrabold text-2xl leading-tight">{points}</span>
              <span className="text-white/70 text-xs font-semibold">Stars</span>
            </div>
          </div>
        </div>
      )}

      {/* ② Points breakdown */}
      {(() => {
        const items = pointsBreakdown?.today?.length
          ? pointsBreakdown.today
          : pointsBreakdown?.this_week ?? [];
        const label = pointsBreakdown?.today?.length ? "Today's Earnings" : "This Week";
        if (items.length === 0) return null;

        const ACTIVITY_ICONS: Record<string, string> = {
          Missions: "🎯",
          "Spelling Bee": "🐝",
          "Story Time": "📖",
          Speaking: "🎤",
        };

        return (
          <section>
            <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3">
              {label}
            </h2>
            <div className="flex flex-wrap gap-2">
              {items.map((item) => (
                <span
                  key={item.activity}
                  className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-3 py-1.5 text-sm font-bold text-slate-700 shadow-sm"
                >
                  <span>{ACTIVITY_ICONS[item.activity] ?? "⭐"}</span>
                  {item.activity}
                  <span className="text-indigo-600">+{item.points}</span>
                </span>
              ))}
            </div>
          </section>
        );
      })()}

      {/* ③ Quick-launch cards */}
      <section>
        <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3">Play Now</h2>
        <div className="grid grid-cols-2 gap-3">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <button
              onClick={() => {
                router.push("/student/missions");
              }}
              className="w-full flex flex-col items-center gap-2 p-5 rounded-2xl bg-indigo-600 border-b-4 border-indigo-800
                         shadow-[0_4px_0_#3730a3] hover:brightness-110
                         text-white font-extrabold text-center transition-all duration-100"
            >
              <span className="text-4xl">🎯</span>
              <span className="text-base">Daily Missions</span>
              <span className="text-xs text-indigo-200 font-semibold">Earn stars!</span>
            </button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <button
              onClick={() => {
                router.push("/student/chat");
              }}
              className="w-full flex flex-col items-center gap-2 p-5 rounded-2xl bg-violet-500 border-b-4 border-violet-700
                         shadow-[0_4px_0_#5b21b6] hover:brightness-110
                         text-white font-extrabold text-center transition-all duration-100"
            >
              <span className="text-4xl">💬</span>
              <span className="text-base">Chat with PrimePal</span>
              <span className="text-xs text-violet-200 font-semibold">Ask anything!</span>
            </button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <button
              onClick={() => {
                router.push("/student/spelling-bee");
              }}
              className="w-full flex flex-col items-center gap-2 p-5 rounded-2xl bg-amber-500 border-b-4 border-amber-700
                         shadow-[0_4px_0_#b45309] hover:brightness-110
                         text-white font-extrabold text-center transition-all duration-100"
            >
              <span className="text-4xl">🐝</span>
              <span className="text-base">Spelling Bee</span>
              <span className="text-xs text-amber-200 font-semibold">Can you spell it?</span>
            </button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <button
              onClick={() => {
                router.push("/student/leaderboard");
              }}
              className="w-full flex flex-col items-center gap-2 p-5 rounded-2xl bg-yellow-500 border-b-4 border-yellow-700
                         shadow-[0_4px_0_#a16207] hover:brightness-110
                         text-white font-extrabold text-center transition-all duration-100"
            >
              <span className="text-4xl">🏆</span>
              <span className="text-base">Leaderboard</span>
              <span className="text-xs text-yellow-100 font-semibold">See who&apos;s #1!</span>
            </button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="col-span-2">
            <Link
              href="/student/story-time"
              className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-500 border-b-4 border-green-700
                         shadow-[0_4px_0_#047857] hover:brightness-110
                         text-white font-extrabold transition-all duration-100"
            >
              <span className="text-4xl">📖</span>
              <div>
                <span className="text-base block">Story Time</span>
                <span className="text-xs text-emerald-100 font-semibold">Read & answer questions!</span>
              </div>
            </Link>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="col-span-2">
            <Link
              href="/student/speaking"
              className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-rose-500 to-red-500 border-b-4 border-red-700
                         shadow-[0_4px_0_#b91c1c] hover:brightness-110
                         text-white font-extrabold transition-all duration-100"
            >
              <span className="text-4xl">🎤</span>
              <div>
                <span className="text-base block">Speaking Practice</span>
                <span className="text-xs text-rose-100 font-semibold">Talk to PrimePal!</span>
              </div>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ④ Achievements shelf */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Your Badges</h2>
          <Link href="/student/achievements" className="text-xs font-bold text-indigo-500 hover:text-indigo-700 transition-colors">
            See All &rarr;
          </Link>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
          {(!achievementsData || achievementsData.achievements.length === 0) && !loadingProfile && (
            <div className="flex flex-col items-center gap-1 px-4 py-3 rounded-2xl border-2 border-slate-200 bg-slate-50 w-full text-center">
              <span className="text-2xl">🏅</span>
              <span className="text-xs font-bold text-slate-400">No badges yet — keep learning!</span>
            </div>
          )}
          {achievementsData?.achievements.filter((b: AchievementProgress) => b.unlocked).slice(0, 5).map((badge: AchievementProgress) => (
            <div
              key={badge.id}
              className="flex flex-col items-center gap-1 px-4 py-3 rounded-2xl border-2 shrink-0 w-24 text-center transition-all shadow-sm border-indigo-200 bg-amber-50"
              title={badge.name}
            >
              <span className="text-2xl">{badge.icon}</span>
              <span className="text-xs font-bold leading-tight text-slate-700">{badge.name}</span>
              <span className="text-[10px] text-indigo-600 font-extrabold bg-indigo-100 rounded-full px-1.5">Earned</span>
            </div>
          ))}
          {achievementsData?.achievements.filter((b: AchievementProgress) => !b.unlocked).slice(0, Math.max(0, 5 - (achievementsData?.achievements.filter((b: AchievementProgress) => b.unlocked).length ?? 0))).map((badge: AchievementProgress) => (
            <div
              key={badge.id}
              className="flex flex-col items-center gap-1 px-4 py-3 rounded-2xl border-2 shrink-0 w-24 text-center transition-all bg-slate-50 border-slate-200 opacity-40"
              title={badge.name}
            >
              <span className="text-2xl grayscale">{badge.icon}</span>
              <span className="text-xs font-bold leading-tight text-slate-400">{badge.name}</span>
              <span className="text-[10px] text-slate-400 font-semibold">{badge.current_progress}/{badge.threshold_value}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ⑤ Coming-soon card grid */}
      {COMING_SOON.length > 0 && (
        <section>
          <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3">Coming Soon 🔒</h2>
          <div className="grid grid-cols-2 gap-3">
            {COMING_SOON.map((card) => (
              <LockedCard key={card.id} icon={card.icon} label={card.label} tagline={card.tagline} />
            ))}
          </div>
        </section>
      )}

      {/* ⑥ Motivational footer */}
      <div className={["w-full rounded-2xl bg-indigo-50 border border-indigo-100 px-5 py-4 text-center transition-opacity duration-[400ms]", quoteFading ? "opacity-0" : "opacity-100"].join(" ")}>
        <p className="text-sm font-bold text-indigo-700">{QUOTES[quoteIndex]}</p>
      </div>

      {/* Achievement popup */}
      {achievementPopup && (
        <AchievementPopup
          name={achievementPopup.name}
          icon={achievementPopup.icon}
          tier={achievementPopup.tier}
          onDismiss={() => setAchievementPopup(null)}
        />
      )}

      <style>{`
        @keyframes wiggle {
          0%   { transform: translateX(0); }
          20%  { transform: translateX(-6px) rotate(-2deg); }
          40%  { transform: translateX(6px) rotate(2deg); }
          60%  { transform: translateX(-4px) rotate(-1deg); }
          80%  { transform: translateX(4px) rotate(1deg); }
          100% { transform: translateX(0); }
        }
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateX(-50%) translateY(-4px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
