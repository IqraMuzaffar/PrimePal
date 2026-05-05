"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

const QUOTES = [
  "Every word you learn is a superpower! 💪",
  "Keep going — you're amazing! 🌟",
  "Learning is your greatest adventure! 🚀",
];

const ACTIVITY_CARDS = [
  {
    href: "/student/missions",
    icon: "🎯",
    title: "Daily Missions",
    sub: "Earn stars — let's go!",
    gradient: "from-violet-700 to-purple-500",
    shadow: "shadow-[0_6px_0_#6d28d9,0_8px_24px_rgba(109,40,217,0.35)]",
    badge: "NEW",
  },
  {
    href: "/student/chat",
    icon: "💬",
    title: "Chat with PrimePal",
    sub: "Ask anything you want!",
    gradient: "from-pink-700 to-pink-500",
    shadow: "shadow-[0_6px_0_#9d174d,0_8px_24px_rgba(157,23,77,0.35)]",
  },
  {
    href: "/student/spelling-bee",
    icon: "🐝",
    title: "Spelling Bee",
    sub: "Can you spell it in 30 seconds?",
    gradient: "from-amber-700 to-amber-500",
    shadow: "shadow-[0_6px_0_#92400e,0_8px_24px_rgba(146,64,14,0.35)]",
  },
  {
    href: "/student/scores",
    icon: "📊",
    title: "My Scores",
    sub: "See how you're doing!",
    gradient: "from-cyan-700 to-cyan-500",
    shadow: "shadow-[0_6px_0_#0c4a6e,0_8px_24px_rgba(12,74,110,0.35)]",
  },
  {
    href: "/student/story-time",
    icon: "📖",
    title: "Story Time",
    sub: "Read & answer questions",
    gradient: "from-emerald-700 to-emerald-500",
    shadow: "shadow-[0_6px_0_#064e3b,0_8px_24px_rgba(6,78,59,0.35)]",
    wide: true,
  },
  {
    href: "/student/speaking",
    icon: "🎤",
    title: "Speaking Practice",
    sub: "Talk to PrimePal — it listens!",
    gradient: "from-rose-700 to-rose-500",
    shadow: "shadow-[0_6px_0_#881337,0_8px_24px_rgba(136,19,55,0.35)]",
    wide: true,
  },
];

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function HomePage() {
  const router = useRouter();

  const { data: profile, isLoading: loadingProfile } = useStudentProfile();
  const { data: streak } = useStreak();
  const { data: dailySummary } = useDailySummary();
  const { data: achievementsData } = useAchievements();
  const { data: pointsBreakdown } = usePointsBreakdown();

  const [quoteIndex, setQuoteIndex] = useState(0);
  const [quoteFading, setQuoteFading] = useState(false);
  const [achievementPopup, setAchievementPopup] = useState<{ name: string; icon: string; tier: "bronze" | "silver" | "gold" } | null>(null);
  const [streakResetBanner, setStreakResetBanner] = useState(false);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("primepal_student_token") : null;
    if (!token) router.push("/student/play");
  }, [router]);

  useEffect(() => {
    if (streak && streak.current_streak === 0 && streak.longest_streak > 0) {
      setStreakResetBanner(true);
      setTimeout(() => setStreakResetBanner(false), 6000);
    }
  }, [streak]);

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

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-10">

      {/* Streak reset banner */}
      {streakResetBanner && (
        <div className="w-full rounded-2xl bg-gradient-to-r from-orange-100 to-amber-100 border-2 border-orange-200 p-3 text-center animate-slideUp">
          <p className="text-sm font-baloo font-bold text-orange-700">
            Your streak reset — let&apos;s start a new one! {"💪"}
          </p>
        </div>
      )}

      {/* ① Hero banner */}
      {loadingProfile ? (
        <div className="w-full rounded-3xl bg-gradient-to-r from-amber-200 to-amber-300 p-6 animate-pulse flex justify-between items-center min-h-[148px]">
          <div className="space-y-2">
            <div className="h-7 w-40 bg-white/40 rounded-full" />
            <div className="h-5 w-28 bg-white/30 rounded-full" />
          </div>
          <div className="h-14 w-20 bg-white/40 rounded-2xl" />
        </div>
      ) : (
        <div className="w-full rounded-3xl bg-gradient-to-r from-amber-100 via-amber-200 to-amber-300 border-2 border-amber-400 p-5 sm:p-6 flex items-center justify-between shadow-[0_6px_24px_rgba(245,158,11,0.2)] relative overflow-hidden min-h-[148px]">
          {/* Decorative sun rings */}
          <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full border-2 border-amber-400/25 pointer-events-none" />
          <div className="absolute -right-5 top-2 w-28 h-28 rounded-full border-2 border-amber-400/20 pointer-events-none" />
          <div className="absolute right-16 top-10 w-14 h-14 rounded-full bg-amber-400/18 pointer-events-none" />

          <div className="relative z-10">
            <p className="font-nunito font-semibold text-sm text-amber-800/75 mb-0.5">Welcome back!</p>
            <h1 className="font-baloo text-2xl sm:text-3xl font-extrabold text-amber-950 leading-tight">
              Hi {name.split(" ")[0]}! 🌟
            </h1>
            {profile?.roll_number && (
              <p className="text-amber-800/60 text-xs mt-0.5 font-nunito">Roll No: {profile.roll_number}</p>
            )}
            <div className="flex gap-2 mt-3 flex-wrap">
              <div className="bg-white rounded-xl px-3 py-1.5 flex items-center gap-1.5 shadow-sm border border-amber-200">
                <span className="text-sm">⭐</span>
                <span className="font-baloo font-extrabold text-sm text-amber-950">{points} Stars</span>
              </div>
              {dailySummary && dailySummary.today_points > 0 && (
                <div className="bg-orange-50 rounded-xl px-3 py-1.5 flex items-center gap-1.5 border border-orange-200">
                  <span className="font-baloo font-bold text-sm text-orange-700">+{dailySummary.today_points} today</span>
                </div>
              )}
            </div>
          </div>

          <div className="relative z-10 text-6xl animate-floatUp shrink-0">
            🌟
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
          Missions: "🎯", "Spelling Bee": "🐝", "Story Time": "📖", Speaking: "🎤",
        };

        return (
          <section>
            <div className="flex items-center gap-2.5 mb-3">
              <span className="font-baloo font-extrabold text-xs text-amber-700 uppercase tracking-widest">{label}</span>
              <div className="flex-1 h-[1.5px] bg-gradient-to-r from-amber-300 to-transparent" />
            </div>
            <div className="flex flex-wrap gap-2">
              {items.map((item) => (
                <span
                  key={item.activity}
                  className="inline-flex items-center gap-1.5 bg-white border border-amber-200 rounded-full px-3 py-1.5 text-sm font-baloo font-bold text-amber-900 shadow-sm"
                >
                  <span>{ACTIVITY_ICONS[item.activity] ?? "⭐"}</span>
                  {item.activity}
                  <span className="text-amber-600">+{item.points}</span>
                </span>
              ))}
            </div>
          </section>
        );
      })()}

      {/* ③ Activity cards */}
      <section>
        <div className="flex items-center gap-2.5 mb-3">
          <span className="font-baloo font-extrabold text-xs text-amber-700 uppercase tracking-widest">Play Now</span>
          <div className="flex-1 h-[1.5px] bg-gradient-to-r from-amber-300 to-transparent" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {ACTIVITY_CARDS.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className={[
                "group relative rounded-[20px] p-4 sm:p-5 flex overflow-hidden border border-white/30",
                `bg-gradient-to-br ${card.gradient} ${card.shadow}`,
                card.wide ? "col-span-2 flex-row items-center gap-4" : "flex-col gap-2.5",
                "transition-transform duration-150 hover:-translate-y-[3px] active:translate-y-0",
              ].join(" ")}
            >
              {/* Shine overlay */}
              <div className="absolute top-0 left-0 right-0 h-2/5 bg-gradient-to-b from-white/[0.18] to-transparent rounded-t-[20px] pointer-events-none" />

              {card.badge && (
                <div className="absolute top-2.5 right-2.5 bg-red-500 rounded-lg px-2 py-0.5 font-baloo font-bold text-[10px] text-white animate-pulse2">
                  {card.badge}
                </div>
              )}

              <span className={`${card.wide ? "text-4xl" : "text-3xl"} drop-shadow-md`}>{card.icon}</span>
              <div>
                <span className="font-baloo font-extrabold text-white text-[15px] sm:text-base drop-shadow-sm block">{card.title}</span>
                <span className="font-nunito font-semibold text-white/75 text-xs mt-0.5 block">{card.sub}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ④ Achievements shelf */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <span className="font-baloo font-extrabold text-xs text-amber-700 uppercase tracking-widest">Your Badges</span>
            <div className="flex-1 h-[1.5px] bg-gradient-to-r from-amber-300 to-transparent" />
          </div>
          <Link href="/student/achievements" className="text-xs font-baloo font-bold text-amber-600 hover:text-amber-800 transition-colors">
            See All &rarr;
          </Link>
        </div>
        <div className="flex gap-2.5 overflow-x-auto pb-1 no-scrollbar">
          {(!achievementsData || achievementsData.achievements.length === 0) && !loadingProfile && (
            <div className="flex flex-col items-center gap-1 px-4 py-3 rounded-2xl border-2 border-amber-200 bg-white w-full text-center">
              <span className="text-2xl">🏅</span>
              <span className="text-xs font-baloo font-bold text-amber-700/60">No badges yet — keep learning!</span>
            </div>
          )}
          {achievementsData?.achievements.filter((b: AchievementProgress) => b.unlocked).slice(0, 5).map((badge: AchievementProgress) => (
            <div
              key={badge.id}
              className="flex flex-col items-center gap-1 px-4 py-3 rounded-2xl border-2 shrink-0 w-24 text-center shadow-sm border-amber-300 bg-white transition-transform hover:-translate-y-0.5"
              title={badge.name}
            >
              <span className="text-2xl">{badge.icon}</span>
              <span className="text-xs font-baloo font-bold leading-tight text-amber-900">{badge.name}</span>
              <span className="text-[10px] font-baloo font-extrabold bg-amber-400 text-amber-950 rounded-full px-1.5">UNLOCKED</span>
            </div>
          ))}
          {achievementsData?.achievements.filter((b: AchievementProgress) => !b.unlocked).slice(0, Math.max(0, 5 - (achievementsData?.achievements.filter((b: AchievementProgress) => b.unlocked).length ?? 0))).map((badge: AchievementProgress) => (
            <div
              key={badge.id}
              className="flex flex-col items-center gap-1 px-4 py-3 rounded-2xl border-2 shrink-0 w-24 text-center bg-cream border-amber-200/50 opacity-50"
              title={badge.name}
            >
              <span className="text-2xl grayscale">{badge.icon}</span>
              <span className="text-xs font-baloo font-bold leading-tight text-amber-800/50">{badge.name}</span>
              <span className="text-[10px] text-amber-700/50 font-nunito font-semibold">{badge.current_progress}/{badge.threshold_value}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ⑤ Motivational footer */}
      <div className={[
        "w-full rounded-2xl bg-gradient-to-r from-amber-100 to-amber-50 border border-amber-200 px-5 py-4",
        "flex items-center justify-center gap-2.5 transition-opacity duration-[400ms]",
        quoteFading ? "opacity-0" : "opacity-100",
      ].join(" ")}>
        <span className="text-xl">🚀</span>
        <p className="text-sm font-baloo font-bold text-amber-800">{QUOTES[quoteIndex]}</p>
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
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
