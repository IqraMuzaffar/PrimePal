"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, LayoutDashboard, School, LogOut, Settings, X, Menu, GraduationCap, Zap, BookMarked, Sparkles, FileBarChart } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

const NAV_LINKS = [
  { href: "/teacher/dashboard",  label: "Dashboard",       icon: LayoutDashboard },
  { href: "/teacher/classroom",  label: "Classrooms",      icon: School },
  { href: "/teacher/students",   label: "Students",        icon: GraduationCap },
  { href: "/teacher/missions",   label: "Missions",        icon: Zap },
  { href: "/teacher/curriculum", label: "Curriculum Hub",  icon: BookOpen },
  { href: "/teacher/topics",     label: "Topics",          icon: BookMarked },
  { href: "/teacher/reports",   label: "Reports",         icon: FileBarChart },
  { href: "/teacher/assistant", label: "AI Assistant",    icon: Sparkles },
];

export default function TeacherShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setEmail(session?.user?.email ?? null);
    });
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/teacher/login");
  }

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const initial = email ? email[0].toUpperCase() : "T";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* ── Top Navbar ─────────────────────────────────────────────────────── */}
      <header className="h-14 flex items-center px-4 lg:px-6 gap-4 lg:gap-8 shrink-0"
        style={{ background: "linear-gradient(90deg, #1e1b4b 0%, #312e81 100%)" }}>

        {/* Hamburger Menu (mobile only) */}
        <button
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          className="lg:hidden text-white hover:bg-white/10 p-2 rounded-lg transition-colors"
        >
          {showMobileMenu ? <X size={20} /> : <Menu size={20} />}
        </button>

        {/* Brand */}
        <Link href="/teacher/dashboard" className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
            <BookOpen size={16} className="text-white" />
          </div>
          <span className="text-white font-bold text-base tracking-tight">PrimePal</span>
        </Link>

        {/* Nav links (desktop only) */}
        <nav className="hidden lg:flex items-center gap-1">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={[
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive(href)
                  ? "bg-indigo-600/40 text-white"
                  : "text-white/60 hover:text-white hover:bg-white/10",
              ].join(" ")}
            >
              <Icon size={15} />
              {label}
            </Link>
          ))}
        </nav>

        {/* Right actions */}
        <div className="ml-auto flex items-center gap-1">
          {/* Settings (desktop only) */}
          <button
            onClick={() => setShowSettings(true)}
            className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Settings size={15} />
            <span className="text-sm">Settings</span>
          </button>

          {/* Settings icon (mobile only) */}
          <button
            onClick={() => setShowSettings(true)}
            className="sm:hidden flex items-center px-2 py-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Settings size={15} />
          </button>

          {/* Divider (hidden on mobile) */}
          <div className="hidden sm:block w-px h-5 bg-white/15 mx-1" />

          {/* Logout (desktop only) */}
          <button
            onClick={handleLogout}
            className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-300 hover:text-red-200 hover:bg-white/10 transition-colors"
          >
            <LogOut size={15} />
            <span className="text-sm">Logout</span>
          </button>

          {/* Logout icon (mobile only) */}
          <button
            onClick={handleLogout}
            className="sm:hidden flex items-center px-2 py-2 rounded-lg text-red-300 hover:text-red-200 hover:bg-white/10 transition-colors"
          >
            <LogOut size={15} />
          </button>

          {/* Divider (hidden on mobile) */}
          <div className="hidden sm:block w-px h-5 bg-white/15 mx-1" />

          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold border-2 border-white/20">
            {initial}
          </div>
        </div>
      </header>

      {/* ── Mobile Navigation Drawer ──────────────────────────────────────── */}
      {showMobileMenu && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 z-40 lg:hidden"
            onClick={() => setShowMobileMenu(false)}
          />

          {/* Drawer */}
          <nav className="fixed top-14 left-0 right-0 bg-slate-800 border-b border-slate-700 z-50 lg:hidden">
            <div className="flex flex-col p-2 space-y-1">
              {NAV_LINKS.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setShowMobileMenu(false)}
                  className={[
                    "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                    isActive(href)
                      ? "bg-indigo-600 text-white"
                      : "text-gray-300 hover:text-white hover:bg-slate-700",
                  ].join(" ")}
                >
                  <Icon size={18} />
                  {label}
                </Link>
              ))}

              {/* Mobile settings and logout in drawer */}
              <button
                onClick={() => {
                  setShowSettings(true);
                  setShowMobileMenu(false);
                }}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-slate-700 transition-colors"
              >
                <Settings size={18} />
                Settings
              </button>

              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-400 hover:text-red-300 hover:bg-slate-700 transition-colors"
              >
                <LogOut size={18} />
                Logout
              </button>
            </div>
          </nav>
        </>
      )}

      {/* ── Page content ───────────────────────────────────────────────────── */}
      <main className="flex-1">
        {children}
      </main>

      {/* ── Settings modal ─────────────────────────────────────────────────── */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-gray-900">Settings</h2>
              <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Account info */}
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Account</p>
                <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold">
                    {initial}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Teacher</p>
                    <p className="text-xs text-gray-500">{email ?? "—"}</p>
                  </div>
                </div>
              </div>

              {/* App info */}
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">About</p>
                <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">App</span>
                    <span className="font-medium text-gray-900">PrimePal</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Role</span>
                    <span className="font-medium text-gray-900">Teacher</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-sm font-medium transition-colors"
              >
                <LogOut size={15} />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
