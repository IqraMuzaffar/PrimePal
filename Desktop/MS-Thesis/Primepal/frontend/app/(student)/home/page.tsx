"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import Image from "next/image";
import { apiFetch } from "@/lib/api";
import AvatarCustomizeModal from "@/components/student/AvatarCustomizeModal";

// ── Types ────────────────────────────────────────────────────────────────────

interface StudentProfile {
  student_id: string;
  student_name: string;
  avatar_url: string | null;
  avatar_style: string;
  theme_color: string;
  points: number;
}

// ── Constants ────────────────────────────────────────────────────────────────

const BADGES = [
  { id: "first_star",   label: "First Star",   icon: "⭐", threshold: 1,   desc: "Earn your first point!" },
  { id: "on_fire",      label: "On Fire",       icon: "🔥", threshold: 50,  desc: "50 stars earned!" },
  { id: "star_learner", label: "Star Learner",  icon: "💎", threshold: 100, desc: "100 stars — amazing!" },
  { id: "champion",     label: "Champion",      icon: "🏆", threshold: 200, desc: "200 stars — champion!" },
];

const COMING_SOON = [
  { id: "leaderboard",  icon: "🏆", label: "Class Leaderboard",  tagline: "See who's on top!" },
  { id: "spelling_bee", icon: "🐝", label: "Spelling Bee",        tagline: "Can you spell it?" },
  { id: "story_time",   icon: "📖", label: "Story Time",          tagline: "Read & discover!" },
  { id: "speaking",     icon: "🎤", label: "Speaking Practice",   tagline: "Talk to PrimePal!" },
];

const QUOTES = [
  "Every word you learn is a superpower! 💪",
  "Keep going — you're amazing! 🌟",
  "Learning is your greatest adventure! 🚀",
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("primepal_student_token");
}

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
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [quoteFading, setQuoteFading] = useState(false);
  const quoteTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) { router.push("/play"); return; }

    apiFetch<StudentProfile>("/missions/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(setProfile)
      .catch(() => {})
      .finally(() => setLoadingProfile(false));
  }, [router]);

  useEffect(() => {
    const t = setInterval(() => {
      setQuoteFading(true);
      setTimeout(() => { setQuoteIndex((i) => (i + 1) % QUOTES.length); setQuoteFading(false); }, 400);
    }, 8000);
    return () => clearInterval(t);
  }, []);

  function handleCustomizeSave(style: string, color: string) {
    if (!profile) return;
    const newUrl = dicebearUrl(style, profile.student_name);
    setProfile({ ...profile, avatar_style: style, theme_color: color, avatar_url: newUrl });
    setShowModal(false);
  }

  const points = profile?.points ?? 0;
  const name = profile?.student_name
    ?? (typeof window !== "undefined" ? localStorage.getItem("primepal_student_name") : null)
    ?? "Champion";

  return (
    <div className="max-w-md mx-auto space-y-6 pb-10">

      {/* ① Hero strip */}
      {loadingProfile ? <HeroSkeleton /> : (
        <div className="w-full rounded-3xl bg-gradient-to-r from-indigo-500 to-violet-600 p-5 flex items-center justify-between shadow-lg relative overflow-hidden">
          <div>
            <p className="text-white/80 text-sm font-semibold mb-0.5">Welcome back!</p>
            <h1 className="text-white text-2xl font-extrabold leading-tight drop-shadow">
              Hi {name}! 🌟
            </h1>
            <p className="text-white/80 text-sm mt-1">Ready to level up?</p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-2 flex items-center gap-1 bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3 py-1 rounded-full transition-all duration-150"
            >
              <Pencil size={11} />
              Edit Character
            </button>
          </div>
          <div className="flex flex-col items-center bg-white/20 rounded-2xl px-4 py-3 border-2 border-white/30">
            {profile?.avatar_url ? (
              <Image src={profile.avatar_url} alt={name} width={48} height={48} className="rounded-full border-2 border-white/60 mb-1" />
            ) : (
              <span className="text-3xl leading-none mb-1">⭐</span>
            )}
            <span className="text-white font-extrabold text-2xl leading-tight">{points}</span>
            <span className="text-white/70 text-xs font-semibold">Stars</span>
          </div>
        </div>
      )}

      {/* ② Quick-launch cards */}
      <section>
        <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3">Play Now</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/missions"
            className="flex flex-col items-center gap-2 p-5 rounded-2xl bg-indigo-600 border-b-4 border-indigo-800
                       shadow-[0_4px_0_#3730a3] hover:brightness-110
                       active:translate-y-1 active:shadow-none
                       text-white font-extrabold text-center transition-all duration-100"
          >
            <span className="text-4xl">🎯</span>
            <span className="text-base">Daily Missions</span>
            <span className="text-xs text-indigo-200 font-semibold">Earn stars!</span>
          </Link>
          <Link
            href="/chat"
            className="flex flex-col items-center gap-2 p-5 rounded-2xl bg-violet-500 border-b-4 border-violet-700
                       shadow-[0_4px_0_#5b21b6] hover:brightness-110
                       active:translate-y-1 active:shadow-none
                       text-white font-extrabold text-center transition-all duration-100"
          >
            <span className="text-4xl">💬</span>
            <span className="text-base">Chat with PrimePal</span>
            <span className="text-xs text-violet-200 font-semibold">Ask anything!</span>
          </Link>
        </div>
      </section>

      {/* ③ Achievements shelf */}
      <section>
        <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3">Your Badges</h2>
        <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
          {BADGES.map((badge) => {
            const earned = points >= badge.threshold;
            return (
              <div
                key={badge.id}
                className={[
                  "flex flex-col items-center gap-1 px-4 py-3 rounded-2xl border-2 shrink-0 w-24 text-center transition-all",
                  earned ? "bg-indigo-50 border-indigo-200 shadow-sm" : "bg-slate-50 border-slate-200 opacity-40",
                ].join(" ")}
                title={badge.desc}
              >
                <span className={["text-2xl", earned ? "" : "grayscale"].join(" ")}>{badge.icon}</span>
                <span className={["text-xs font-bold leading-tight", earned ? "text-slate-700" : "text-slate-400"].join(" ")}>{badge.label}</span>
                {earned
                  ? <span className="text-[10px] text-indigo-600 font-extrabold bg-indigo-100 rounded-full px-1.5">✓ Earned</span>
                  : <span className="text-[10px] text-slate-400 font-semibold">{badge.threshold} ⭐</span>
                }
              </div>
            );
          })}
        </div>
      </section>

      {/* ④ Coming-soon card grid */}
      <section>
        <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3">Coming Soon 🔒</h2>
        <div className="grid grid-cols-2 gap-3">
          {COMING_SOON.map((card) => (
            <LockedCard key={card.id} icon={card.icon} label={card.label} tagline={card.tagline} />
          ))}
        </div>
      </section>

      {/* ⑤ Motivational footer */}
      <div className={["w-full rounded-2xl bg-indigo-50 border border-indigo-100 px-5 py-4 text-center transition-opacity duration-[400ms]", quoteFading ? "opacity-0" : "opacity-100"].join(" ")}>
        <p className="text-sm font-bold text-indigo-700">{QUOTES[quoteIndex]}</p>
      </div>

      {/* Customization modal */}
      {showModal && profile && (
        <AvatarCustomizeModal
          studentName={profile.student_name}
          currentStyle={profile.avatar_style}
          currentColor={profile.theme_color}
          onSave={handleCustomizeSave}
          onClose={() => setShowModal(false)}
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
