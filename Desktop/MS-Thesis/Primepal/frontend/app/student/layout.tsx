"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useStudentProfile, useStreak, queryKeys } from "@/lib/hooks/queries";
import { studentFetch } from "@/lib/api-helpers";
import OfflineBanner from "@/components/student/OfflineBanner";
import StreakCounter from "@/components/student/StreakCounter";
import { GenderThemeProvider, useGenderTheme } from "@/lib/gender-theme-context";

const PREFETCH_MAP: Record<string, { queryKey: readonly string[]; url: string; staleTime: number }[]> = {
  "/student/missions": [
    { queryKey: queryKeys.missionPillar("reading"), url: "/missions/pillar?pillar=reading", staleTime: 5 * 60 * 1000 },
    { queryKey: queryKeys.missionPillar("writing"), url: "/missions/pillar?pillar=writing", staleTime: 5 * 60 * 1000 },
    { queryKey: queryKeys.missionPillar("listening"), url: "/missions/pillar?pillar=listening", staleTime: 5 * 60 * 1000 },
    { queryKey: queryKeys.missionPillar("speaking"), url: "/missions/pillar?pillar=speaking", staleTime: 5 * 60 * 1000 },
  ],
  "/student/achievements": [
    { queryKey: queryKeys.achievements, url: "/achievements/me", staleTime: 5 * 60 * 1000 },
  ],
  "/student/home": [
    { queryKey: queryKeys.dailySummary, url: "/rewards/daily-summary", staleTime: 5 * 60 * 1000 },
  ],
};

const NAV_LINKS = [
  { href: "/student/home",         label: "Home",     icon: "🏠" },
  { href: "/student/chat",         label: "Chat",     icon: "💬" },
  { href: "/student/missions",     label: "Missions", icon: "🎯" },
  { href: "/student/scores",       label: "Scores",   icon: "📊" },
  { href: "/student/achievements", label: "Badges",   icon: "🏅" },
];

function StudentLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  // Play page is a pre-auth entry screen with its own header — skip the app nav
  if (pathname === "/student/play") {
    return <>{children}</>;
  }
  const queryClient = useQueryClient();
  const [mobileOpen, setMobileOpen] = useState(false);

  const { data: profile, isLoading: loading } = useStudentProfile();
  const { data: streak } = useStreak();
  const theme = useGenderTheme();

  const handlePrefetch = useCallback(
    (href: string) => {
      const entries = PREFETCH_MAP[href];
      if (!entries) return;
      for (const { queryKey, url, staleTime } of entries) {
        queryClient.prefetchQuery({
          queryKey,
          queryFn: () => studentFetch(url),
          staleTime,
        });
      }
    },
    [queryClient]
  );

  function handleLogout() {
    localStorage.removeItem("primepal_student_token");
    localStorage.removeItem("primepal_student_name");
    localStorage.removeItem("primepal_student_avatar");
    sessionStorage.removeItem("primepal_chat_messages");
    sessionStorage.removeItem("primepal_chat_nextid");
    queryClient.clear();
    router.push("/student/play");
  }

  return (
    <div className="min-h-screen bg-student-bg font-nunito">
      <OfflineBanner />

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 bg-white border-b border-slate-100 shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
        <div className="flex items-center gap-6 px-4 lg:px-6 min-h-[72px] sm:min-h-[88px] max-w-6xl mx-auto">
          {/* Logo */}
          <Link href="/student/home" className="flex items-center gap-2.5 shrink-0">
            <span className="text-3xl sm:text-4xl animate-spinSlow">⭐</span>
            <span className="font-baloo font-extrabold text-xl sm:text-2xl text-slate-900 tracking-tight hidden sm:inline">
              PrimePal
            </span>
          </Link>

          {/* Desktop nav (centered) */}
          <div className="hidden md:flex items-center gap-1.5 flex-1 justify-center">
            {NAV_LINKS.map(({ href, label, icon }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  onMouseEnter={() => handlePrefetch(href)}
                  onFocus={() => handlePrefetch(href)}
                  className={[
                    "flex items-center gap-2 px-4 lg:px-5 py-3 rounded-2xl",
                    "font-baloo font-extrabold text-base lg:text-lg",
                    "transition-all duration-150",
                    active
                      ? `${theme.navPillActive} ${theme.navPillText} shadow-[0_4px_14px_rgba(0,0,0,0.10)]`
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 hover:-translate-y-0.5",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "text-xl lg:text-2xl",
                      active ? theme.navIconBounce : "",
                    ].join(" ")}
                  >
                    {icon}
                  </span>
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>

          {/* Right side: streak + points + logout */}
          <div className="flex items-center gap-2 shrink-0">
            {loading && (
              <div className="flex items-center gap-2 animate-pulse">
                <div className="w-9 h-9 rounded-2xl bg-slate-200" />
                <div className="h-9 w-16 rounded-2xl bg-slate-200" />
              </div>
            )}

            {!loading && profile && (
              <>
                <StreakCounter
                  currentStreak={streak?.current_streak ?? 0}
                  longestStreak={streak?.longest_streak ?? 0}
                />
                <div className={`flex items-center gap-1.5 bg-gradient-to-br ${theme.pointsChip} rounded-2xl px-3 lg:px-4 py-2.5 shadow-[0_4px_10px_rgba(0,0,0,0.08)]`}>
                  <span className="text-base lg:text-lg">⭐</span>
                  <span className="font-baloo font-extrabold text-sm lg:text-base text-amber-900">
                    {profile.points}
                  </span>
                </div>
              </>
            )}

            <button
              onClick={handleLogout}
              className="bg-gradient-to-br from-red-200 to-red-300 text-red-900 text-xs lg:text-sm font-baloo font-extrabold px-3 lg:px-4 py-2.5 rounded-2xl
                         hover:from-red-300 hover:to-red-400 transition-all duration-150 shadow-[0_4px_10px_rgba(239,68,68,0.15)]"
              aria-label="Logout"
            >
              Out 👋
            </button>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden flex flex-col gap-1 p-1.5 ml-1"
              aria-label="Toggle menu"
            >
              <span className="w-5 h-0.5 bg-slate-700 rounded-full" />
              <span className="w-5 h-0.5 bg-slate-700 rounded-full" />
              <span className="w-5 h-0.5 bg-slate-700 rounded-full" />
            </button>
          </div>
        </div>

        {/* Mobile nav dropdown */}
        {mobileOpen && (
          <div className="md:hidden bg-white border-t border-slate-100 px-4 pb-3 pt-2">
            <div className="flex flex-wrap gap-2">
              {NAV_LINKS.map(({ href, label, icon }) => {
                const active = pathname === href || pathname.startsWith(href + "/");
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className={[
                      "flex items-center gap-1.5 px-3 py-2 rounded-2xl text-sm font-baloo font-extrabold transition-all",
                      active
                        ? `${theme.navPillActive} ${theme.navPillText}`
                        : "text-slate-700 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    <span>{icon}</span>
                    <span>{label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* ── Main content ── */}
      <main className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 max-w-6xl mx-auto">
        {children}
      </main>
    </div>
  );
}

function StudentLayoutWithTheme({ children }: { children: React.ReactNode }) {
  const { data: profile } = useStudentProfile();
  const studentName = profile?.student_name
    ?? (typeof window !== "undefined" ? localStorage.getItem("primepal_student_name") : null);

  return (
    <GenderThemeProvider studentName={studentName ?? null}>
      <StudentLayoutContent>{children}</StudentLayoutContent>
    </GenderThemeProvider>
  );
}

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return <StudentLayoutWithTheme>{children}</StudentLayoutWithTheme>;
}
