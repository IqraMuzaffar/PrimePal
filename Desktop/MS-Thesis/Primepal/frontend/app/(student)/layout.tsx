"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

interface StudentProfile {
  student_id: string;
  student_name: string;
  avatar_url: string | null;
  points: number;
}

const NAV_LINKS = [
  { href: "/home",     label: "Home",     icon: "🏠" },
  { href: "/chat",     label: "Chat",     icon: "💬" },
  { href: "/missions", label: "Missions", icon: "🎯" },
];

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("primepal_student_token");
    if (!token) return;

    setLoading(true);
    apiFetch<StudentProfile>("/missions/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((data) => setProfile(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function handleLogout() {
    localStorage.removeItem("primepal_student_token");
    localStorage.removeItem("primepal_student_name");
    localStorage.removeItem("primepal_student_avatar");
    router.push("/play");
  }

  return (
    <div className="min-h-screen bg-yellow-50">
      {/* ── Top bar ── */}
      <header className="sticky top-0 z-20 bg-gradient-to-r from-yellow-400 to-orange-400 shadow-md">
        <div className="flex items-center justify-between px-4 py-2 gap-2">
          {/* Logo */}
          <Link href="/home" className="flex items-center gap-1.5 shrink-0">
            <span className="text-2xl leading-none">⭐</span>
            <span className="font-extrabold text-white text-lg tracking-tight drop-shadow-sm hidden sm:inline">
              PrimePal
            </span>
          </Link>

          {/* Nav links — center */}
          <nav className="flex items-center gap-1">
            {NAV_LINKS.map(({ href, label, icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={[
                    "flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-bold transition-all duration-150",
                    active
                      ? "bg-white text-orange-500 shadow-sm"
                      : "text-white hover:bg-white/20",
                  ].join(" ")}
                >
                  <span>{icon}</span>
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right: avatar + points + logout */}
          <div className="flex items-center gap-2 shrink-0">
            {loading && (
              <div className="flex items-center gap-2 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-white/40" />
                <div className="h-5 w-14 rounded-full bg-white/40" />
              </div>
            )}

            {!loading && profile && (
              <>
                {profile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatar_url}
                    alt={profile.student_name}
                    className="w-8 h-8 rounded-full border-2 border-white object-cover shadow-sm"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full border-2 border-white bg-white/30 flex items-center justify-center text-white font-bold text-sm">
                    {profile.student_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="bg-white/20 rounded-full px-2 py-0.5 text-white text-xs font-bold whitespace-nowrap">
                  ⭐ {profile.points}
                </span>
              </>
            )}

            <button
              onClick={handleLogout}
              className="bg-white/20 hover:bg-white/40 text-white text-xs font-bold px-3 py-1.5 rounded-full transition-all duration-150 border border-white/30"
              aria-label="Logout"
            >
              Out 👋
            </button>
          </div>
        </div>
      </header>

      <main className="p-4">{children}</main>
    </div>
  );
}
