"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useStudentProfile, useStreak, queryKeys } from "@/lib/hooks/queries";
import { studentFetch } from "@/lib/api-helpers";
import OfflineBanner from "@/components/student/OfflineBanner";
import StreakCounter from "@/components/student/StreakCounter";

const PREFETCH_MAP: Record<string, { queryKey: readonly string[]; url: string; staleTime: number }[]> = {
  "/student/missions": [
    { queryKey: queryKeys.missionPillar("reading"), url: "/missions/pillar?pillar=reading", staleTime: 5 * 60 * 1000 },
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
  const queryClient = useQueryClient();
  const [mobileOpen, setMobileOpen] = useState(false);

  const { data: profile, isLoading: loading } = useStudentProfile();
  const { data: streak } = useStreak();

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
    <div className="min-h-screen bg-cream font-nunito">
      <OfflineBanner />

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 bg-amber-950 shadow-[0_3px_16px_rgba(0,0,0,0.25)]">
        <div className="flex items-center justify-between px-4 lg:px-6 h-14 max-w-5xl mx-auto">
          {/* Logo */}
          <Link href="/student/home" className="flex items-center gap-2 shrink-0">
            <span className="text-2xl animate-floatUp">⭐</span>
            <span className="font-baloo font-extrabold text-xl text-amber-50 tracking-tight hidden sm:inline">
              PrimePal
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(({ href, label, icon }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  onMouseEnter={() => handlePrefetch(href)}
                  onFocus={() => handlePrefetch(href)}
                  className={[
                    "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-baloo font-bold transition-all duration-150",
                    active
                      ? "bg-amber-400 text-amber-950 shadow-[0_3px_10px_rgba(251,191,36,0.4)]"
                      : "text-amber-100/90 hover:bg-white/10",
                  ].join(" ")}
                >
                  <span className="text-base">{icon}</span>
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>

          {/* Right side: streak + points + logout */}
          <div className="flex items-center gap-2 shrink-0">
            {loading && (
              <div className="flex items-center gap-2 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-white/20" />
                <div className="h-5 w-14 rounded-full bg-white/20" />
              </div>
            )}

            {!loading && profile && (
              <>
                <StreakCounter
                  currentStreak={streak?.current_streak ?? 0}
                  longestStreak={streak?.longest_streak ?? 0}
                />
                <div className="flex items-center gap-1.5 bg-white/12 border border-amber-400/40 rounded-full px-3 py-1">
                  <span className="text-sm">⭐</span>
                  <span className="font-baloo font-bold text-sm text-amber-50">{profile.points}</span>
                </div>
              </>
            )}

            <button
              onClick={handleLogout}
              className="bg-amber-400/20 border border-amber-400/30 text-amber-50 text-xs font-baloo font-bold px-3 py-1.5 rounded-full
                         hover:bg-amber-400/30 transition-all duration-150"
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
              <span className="w-5 h-0.5 bg-amber-100 rounded-full" />
              <span className="w-5 h-0.5 bg-amber-100 rounded-full" />
              <span className="w-5 h-0.5 bg-amber-100 rounded-full" />
            </button>
          </div>
        </div>

        {/* Mobile nav dropdown */}
        {mobileOpen && (
          <div className="md:hidden bg-amber-900/95 border-t border-amber-800 px-4 pb-3 pt-2">
            <div className="flex flex-wrap gap-2">
              {NAV_LINKS.map(({ href, label, icon }) => {
                const active = pathname === href || pathname.startsWith(href + "/");
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className={[
                      "flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-baloo font-bold transition-all",
                      active
                        ? "bg-amber-400 text-amber-950"
                        : "text-amber-100 hover:bg-white/10",
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
      <main className="px-4 lg:px-6 py-6 max-w-5xl mx-auto">{children}</main>
    </div>
  );
}

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return <StudentLayoutContent>{children}</StudentLayoutContent>;
}
