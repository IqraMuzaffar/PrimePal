"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useStudentProfile,
  useStreak,
  useDailySummary,
  useAchievements,
  usePointsBreakdown,
  usePuzzlePalaceDailyStatus,
  useStoryTimeDailyStatus,
  useSpellingBeeDailyStatus,
  type AchievementProgress,
} from "@/lib/hooks/queries";
import AchievementPopup from "@/components/student/AchievementPopup";
import PageHero from "@/components/student/PageHero";
import SectionHeading from "@/components/student/SectionHeading";
import ActivityCard from "@/components/student/ActivityCard";
import { useGenderTheme } from "@/lib/gender-theme-context";

const BASE_ACTIVITY_CARDS = [
  { href: "/student/missions",     icon: "🎯", title: "Daily Missions",  subtitle: "Earn stars across 4 pillars — let's go!", tone: "purple" as const, badge: "NEW" },
  { href: "/student/chat",         icon: "💬", title: "Chat",            subtitle: "Ask PrimePal anything",                   tone: "pink"   as const },
  { href: "/student/spelling-bee", icon: "🐝", title: "Spelling Bee",    subtitle: "Spell it right for 30 pts!",              tone: "rose"   as const },
  { href: "/student/puzzle-palace", icon: "🏰", title: "Puzzle Palace",   subtitle: "5 rooms of word puzzles",                 tone: "amber"  as const },
  { href: "/student/scores",       icon: "📊", title: "My Scores",       subtitle: "See your progress",                       tone: "cyan"   as const },
  { href: "/student/story-time",   icon: "📖", title: "Story Time",      subtitle: "Read & answer",                           tone: "emerald"as const },
];

const STAGGER = ["", "[animation-delay:50ms]", "[animation-delay:100ms]", "[animation-delay:150ms]", "[animation-delay:200ms]", "[animation-delay:250ms]"];

export default function HomePage() {
  const router = useRouter();

  const { data: profile, isLoading: loadingProfile } = useStudentProfile();
  const { data: streak } = useStreak();
  const { data: dailySummary } = useDailySummary();
  const { data: achievementsData } = useAchievements();
  const { data: pointsBreakdown } = usePointsBreakdown();
  const { data: puzzleStatus } = usePuzzlePalaceDailyStatus();
  const { data: storyStatus } = useStoryTimeDailyStatus();
  const { data: spellingBeeStatus } = useSpellingBeeDailyStatus();

  const theme = useGenderTheme();
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

  const points = profile?.points ?? 0;
  const name = profile?.student_name
    ?? (typeof window !== "undefined" ? localStorage.getItem("primepal_student_name") : null)
    ?? "Champion";
  const firstName = name.split(" ")[0];

  // Build activity cards with daily status indicators
  const ACTIVITY_CARDS = BASE_ACTIVITY_CARDS.map((card) => {
    if (card.href === "/student/puzzle-palace" && puzzleStatus) {
      const remaining = puzzleStatus.attempts_limit - puzzleStatus.attempts_used;
      return {
        ...card,
        subtitle: remaining > 0
          ? `5 rooms of word puzzles (${remaining} plays left)`
          : "Done for today!",
        badge: remaining === 0 ? "DONE" : undefined,
      };
    }
    if (card.href === "/student/story-time" && storyStatus) {
      const remaining = storyStatus.attempts_limit - storyStatus.attempts_used;
      return {
        ...card,
        subtitle: remaining > 0
          ? `Read & answer (${remaining} plays left)`
          : "Done for today!",
        badge: remaining === 0 ? "DONE" : undefined,
      };
    }
    if (card.href === "/student/spelling-bee" && spellingBeeStatus) {
      return {
        ...card,
        subtitle: spellingBeeStatus.can_play
          ? "Spell it right for 30 pts!"
          : "Done for today!",
        badge: !spellingBeeStatus.can_play ? "DONE" : undefined,
      };
    }
    return card;
  });

  const todayPoints = dailySummary?.today_points ?? 0;
  const heroPills = [
    { icon: "⭐", label: `${points} Stars`, variant: "white" as const },
    ...(todayPoints > 0 ? [{ label: `+${todayPoints} today`, variant: "amber" as const }] : []),
  ];

  const todayActivityCount = pointsBreakdown?.today?.length ?? 0;
  const dailyGoal = 3;
  const progressPct = Math.min(100, Math.round((todayActivityCount / dailyGoal) * 100));

  const unlocked = achievementsData?.achievements.filter((b: AchievementProgress) => b.unlocked) ?? [];
  const locked = achievementsData?.achievements.filter((b: AchievementProgress) => !b.unlocked) ?? [];
  const visibleAchievements: AchievementProgress[] = [
    ...unlocked.slice(0, 5),
    ...locked.slice(0, Math.max(0, 5 - unlocked.length)),
  ];

  return (
    <div className="space-y-6 sm:space-y-8 pb-10">
      {/* Streak reset banner */}
      {streakResetBanner && (
        <div className="w-full rounded-2xl bg-gradient-to-r from-pink-100 to-violet-100 border-2 border-pink-200 p-3 text-center animate-slideUp">
          <p className="text-sm font-baloo font-extrabold text-pink-700">
            Your streak reset — let&apos;s start a new one! {"💪"}
          </p>
        </div>
      )}

      {/* ① Hero */}
      {loadingProfile ? (
        <div className="w-full rounded-3xl bg-student-hero p-8 animate-pulse min-h-[180px] sm:min-h-[220px] flex justify-between items-center">
          <div className="space-y-3">
            <div className="h-4 w-28 bg-white/50 rounded-full" />
            <div className="h-12 w-56 bg-white/60 rounded-full" />
            <div className="h-4 w-40 bg-white/40 rounded-full" />
            <div className="h-9 w-44 bg-white/50 rounded-full" />
          </div>
          <div className="h-24 w-24 bg-white/50 rounded-full" />
        </div>
      ) : (
        <PageHero
          label="WELCOME BACK!"
          name={`Hi ${firstName}!`}
          waveEmoji="👋"
          subtitle={profile?.roll_number ? `Roll No: ${profile.roll_number}` : undefined}
          pills={heroPills}
          mascot={theme.mascotEmoji}
          className={theme.heroBg}
        />
      )}

      {/* ② Activity cards */}
      <section>
        <SectionHeading icon="🎮" title="Play Now" tone="pink" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {ACTIVITY_CARDS.map((card, i) => (
            <ActivityCard
              key={card.href}
              href={card.href}
              icon={card.icon}
              title={card.title}
              subtitle={card.subtitle}
              tone={card.tone}
              badge={card.badge}
              delayClass={STAGGER[i]}
            />
          ))}
        </div>
      </section>

      {/* ③ Today's Adventure progress */}
      <section className={`bg-white rounded-3xl border-2 p-6 flex items-center gap-5 ${todayActivityCount >= dailyGoal ? 'border-emerald-200 shadow-[0_8px_24px_rgba(16,185,129,0.12)]' : 'border-amber-100 shadow-[0_8px_24px_rgba(251,191,36,0.10)]'}`}>
        <span className="text-4xl sm:text-5xl animate-bounceSoft">{todayActivityCount >= dailyGoal ? '🎉' : '🚀'}</span>
        <div className="flex-1 min-w-0">
          <p className="font-baloo font-extrabold text-lg sm:text-xl text-slate-900">Today&apos;s Adventure</p>
          <p className="font-nunito font-semibold text-xs sm:text-sm text-slate-500 mt-0.5">
            {todayActivityCount >= dailyGoal
              ? 'Goal complete! Great job today!'
              : `Complete ${dailyGoal} activities to keep your streak alive!`}
          </p>
        </div>
        <div className={`w-32 sm:w-48 lg:w-60 h-3 sm:h-3.5 rounded-full overflow-hidden ${todayActivityCount >= dailyGoal ? 'bg-emerald-100' : 'bg-amber-100'}`}>
          <div
            className={`h-full rounded-full animate-shimmer ${todayActivityCount >= dailyGoal ? 'bg-gradient-to-r from-emerald-400 via-green-400 to-teal-400' : 'bg-gradient-to-r from-amber-400 via-orange-400 to-pink-400'}`}
            style={{ width: `${progressPct}%`, backgroundSize: "200% 100%" }}
          />
        </div>
        <span className={`font-baloo font-extrabold text-base sm:text-lg shrink-0 ${todayActivityCount >= dailyGoal ? 'text-emerald-600' : 'text-amber-700'}`}>
          {Math.min(todayActivityCount, dailyGoal)} / {dailyGoal}
        </span>
      </section>

      {/* ④ Badges */}
      <section>
        <SectionHeading
          icon="🏅"
          title="Your Badges"
          tone="amber"
          rightHref="/student/achievements"
          rightLabel="See all →"
        />
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 sm:gap-4">
          {visibleAchievements.length === 0 && !loadingProfile && (
            <div className="col-span-3 sm:col-span-5 flex flex-col items-center gap-2 py-6 rounded-2xl border-2 border-amber-100 bg-white text-center">
              <span className="text-3xl">🏅</span>
              <span className="text-sm font-baloo font-extrabold text-amber-700/70">
                No badges yet — keep learning!
              </span>
            </div>
          )}
          {visibleAchievements.map((badge) => (
            <div
              key={badge.id}
              className={[
                "flex flex-col items-center gap-1.5 py-5 px-2 rounded-2xl border-2 bg-white",
                "transition-all duration-200 hover:-translate-y-1 hover:border-violet-300 hover:shadow-[0_10px_24px_rgba(167,139,250,0.18)]",
                "group cursor-pointer",
                badge.unlocked ? "border-amber-200" : "border-slate-200 opacity-60",
              ].join(" ")}
              title={badge.name}
            >
              <span
                className={[
                  "text-3xl sm:text-4xl transition-transform duration-300",
                  "group-hover:scale-110 group-hover:rotate-[8deg]",
                  badge.unlocked ? "" : "grayscale",
                ].join(" ")}
              >
                {badge.icon}
              </span>
              <span className="text-[11px] sm:text-xs font-baloo font-extrabold text-slate-900 text-center leading-tight">
                {badge.name}
              </span>
              {badge.unlocked ? (
                <span className="text-[10px] font-baloo font-extrabold bg-amber-300 text-amber-950 rounded-full px-2 py-0.5">
                  UNLOCKED
                </span>
              ) : (
                <span className="text-[10px] font-nunito font-semibold text-slate-400">
                  {badge.current_progress}/{badge.threshold_value}
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Achievement popup */}
      {achievementPopup && (
        <AchievementPopup
          name={achievementPopup.name}
          icon={achievementPopup.icon}
          tier={achievementPopup.tier}
          onDismiss={() => setAchievementPopup(null)}
        />
      )}
    </div>
  );
}
