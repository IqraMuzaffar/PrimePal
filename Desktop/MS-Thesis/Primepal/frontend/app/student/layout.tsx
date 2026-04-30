"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useContext } from "react";
import Image from "next/image";
import { Volume2, VolumeX } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { usePrimeSounds } from "@/lib/use-sound";
import AnimatedBackground from "@/components/student/AnimatedBackground";
import DynamicBackground from "@/components/student/DynamicBackground";
import { AudioProvider, AudioContext } from "@/components/student/AudioProvider";
import OfflineBanner from "@/components/student/OfflineBanner";
import StreakCounter from "@/components/student/StreakCounter";

interface StudentProfile {
  student_id: string;
  student_name: string;
  avatar_url: string | null;
  avatar_style: string;
  theme_color: string;
  points: number;
  missions_completed: number;
}

const NAV_LINKS = [
  { href: "/student/home",         label: "Home",        icon: "🏠" },
  { href: "/student/chat",         label: "Chat",        icon: "💬" },
  { href: "/student/missions",     label: "Missions",    icon: "🎯" },
  { href: "/student/quests",       label: "Quests",      icon: "📋" },
  { href: "/student/achievements", label: "Badges",      icon: "🏅" },
  { href: "/student/leaderboard",  label: "Leaderboard", icon: "🏆" },
];

function StudentLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const audioContext = useContext(AudioContext);
  const isMuted = audioContext?.isMuted ?? false;
  const toggleMute = audioContext?.toggleMute ?? (() => {});
  const { play: playClick } = usePrimeSounds("pop");
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState<{ current_streak: number; longest_streak: number }>({ current_streak: 0, longest_streak: 0 });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("primepal_student_token");
    if (!token) { setLoading(false); return; }

    apiFetch<StudentProfile>("/missions/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((data) => setProfile(data))
      .catch(() => {})
      .finally(() => setLoading(false));

    // Fetch streak data (best-effort, non-blocking)
    apiFetch<{ current_streak: number; longest_streak: number; last_activity_date: string | null }>("/rewards/streak", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((data) => setStreak({ current_streak: data.current_streak, longest_streak: data.longest_streak }))
      .catch(() => {});
  }, []);

  function handleLogout() {
    playClick();
    localStorage.removeItem("primepal_student_token");
    localStorage.removeItem("primepal_student_name");
    localStorage.removeItem("primepal_student_avatar");
    router.push("/student/play");
  }

  function handleNavClick() {
    playClick();
  }

  function handleMuteToggle() {
    playClick();
    toggleMute();
  }

  return (
    <>
      <DynamicBackground missionsCompleted={profile?.missions_completed ?? 0} />
      <AnimatedBackground>
        {/* ── Offline banner ── */}
        <OfflineBanner />

        {/* ── Top bar ── */}
        <header className="sticky top-0 z-20 bg-white border-b border-slate-100 shadow-sm">
        <div className="flex items-center justify-between px-4 py-2 gap-2 max-w-2xl mx-auto">
          {/* Logo */}
          <Link href="/student/home" className="flex items-center gap-1.5 shrink-0">
            <span className="text-2xl leading-none">⭐</span>
            <span className="font-extrabold text-indigo-600 text-lg tracking-tight hidden sm:inline">
              PrimePal
            </span>
          </Link>

          {/* Nav links */}
          <nav className="flex items-center gap-1">
            {NAV_LINKS.map(({ href, label, icon }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={handleNavClick}
                  className={[
                    "flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-bold transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                    active
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 hover:text-indigo-600",
                  ].join(" ")}
                >
                  <span>{icon}</span>
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right: avatar + points + audio toggle + logout */}
          <div className="flex items-center gap-2 shrink-0">
            {loading && (
              <div className="flex items-center gap-2 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-slate-200" />
                <div className="h-5 w-14 rounded-full bg-slate-200" />
              </div>
            )}

            {!loading && profile && (
              <>
                {profile.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt={profile.student_name}
                    width={32}
                    height={32}
                    className="rounded-full border-2 border-indigo-200 shadow-sm"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full border-2 border-indigo-200 bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
                    {profile.student_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <StreakCounter currentStreak={streak.current_streak} longestStreak={streak.longest_streak} />
                <span className="bg-indigo-100 text-indigo-700 rounded-full px-2 py-0.5 text-xs font-bold whitespace-nowrap">
                  ⭐ {profile.points}
                </span>
              </>
            )}

            {/* Audio Toggle Button */}
            <button
              onClick={handleMuteToggle}
              className="text-slate-600 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-slate-100 transition-all duration-150"
              title={isMuted ? "Unmute sounds" : "Mute sounds"}
              aria-label={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? (
                <VolumeX size={18} className="text-red-500" />
              ) : (
                <Volume2 size={18} className="text-indigo-600" />
              )}
            </button>

            <button
              onClick={handleLogout}
              className="bg-indigo-600 text-white text-xs font-bold px-3 py-1.5 rounded-full
                         shadow-[0_3px_0_#3730a3] hover:brightness-110
                         active:translate-y-[3px] active:shadow-none
                         transition-all duration-100 border-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              aria-label="Logout"
            >
              Out 👋
            </button>
          </div>
        </div>
      </header>

      <main className="p-4 max-w-2xl mx-auto">{children}</main>
      </AnimatedBackground>
    </>
  );
}

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <AudioProvider>
      <StudentLayoutContent>{children}</StudentLayoutContent>
    </AudioProvider>
  );
}
