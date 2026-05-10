"use client";

import { useState, FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import PinEntry from "./pin-entry";
import { guessGender, getThemeTokens } from "@/lib/gender-theme";

interface Avatar {
  id: string;
  student_name: string;
  avatar_url: string;
  avatar_style?: string;
  theme_color?: string;
}

type Step = "enter-code" | "select-student" | "enter-pin";

/* ── Decorative background ─────────────────────────────────── */
function BgDecor() {
  const emojis = [
    { emoji: "📚", top: "8%", left: "6%", size: 36, delay: "0s", dur: 6 },
    { emoji: "⭐", top: "15%", left: "85%", size: 42, delay: "1.2s", dur: 5.5 },
    { emoji: "🎯", top: "70%", left: "8%", size: 32, delay: "2s", dur: 7 },
    { emoji: "💬", top: "75%", left: "88%", size: 30, delay: "0.6s", dur: 6.2 },
    { emoji: "✏️", top: "5%", left: "50%", size: 28, delay: "1.8s", dur: 5.8 },
    { emoji: "🌟", top: "50%", left: "93%", size: 34, delay: "2.8s", dur: 6.5 },
    { emoji: "🎮", top: "45%", left: "3%", size: 38, delay: "0.3s", dur: 7.2 },
    { emoji: "📖", top: "85%", left: "70%", size: 30, delay: "1.5s", dur: 6.8 },
    { emoji: "🇵🇰", top: "88%", left: "30%", size: 28, delay: "3.2s", dur: 5.2 },
    { emoji: "🐝", top: "30%", left: "90%", size: 26, delay: "0.9s", dur: 6 },
    { emoji: "🎧", top: "60%", left: "5%", size: 24, delay: "2.4s", dur: 5.5 },
    { emoji: "🏆", top: "20%", left: "15%", size: 26, delay: "1s", dur: 7 },
  ];

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Large vivid glow blobs */}
      <div className="hidden sm:block absolute -top-24 -left-24 w-[32rem] h-[32rem] rounded-full blur-[100px] animate-pulseSoft"
        style={{ background: "radial-gradient(circle, rgba(236,72,153,0.25) 0%, transparent 70%)" }} />
      <div className="hidden sm:block absolute -bottom-16 -right-16 w-[28rem] h-[28rem] rounded-full blur-[100px] animate-pulseSoftReverse"
        style={{ background: "radial-gradient(circle, rgba(96,165,250,0.25) 0%, transparent 70%)" }} />
      <div className="absolute top-[35%] left-[50%] -translate-x-1/2 w-[24rem] h-[24rem] rounded-full blur-[80px] animate-pulseSoft"
        style={{ background: "radial-gradient(circle, rgba(167,139,250,0.2) 0%, transparent 70%)", animationDelay: "2s" }} />
      <div className="absolute top-[10%] right-[20%] w-[18rem] h-[18rem] rounded-full blur-[60px] animate-pulseSoftReverse"
        style={{ background: "radial-gradient(circle, rgba(251,191,36,0.2) 0%, transparent 70%)", animationDelay: "1s" }} />

      {/* Floating emojis */}
      {emojis.map((e, i) => (
        <div
          key={i}
          className="absolute animate-floatUp select-none"
          style={{
            top: e.top,
            left: e.left,
            fontSize: e.size,
            animationDelay: e.delay,
            animationDuration: `${e.dur}s`,
            opacity: 0.15,
            filter: "blur(0.5px)",
          }}
        >
          {e.emoji}
        </div>
      ))}

      {/* Subtle dot grid */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(167,139,250,0.12) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
    </div>
  );
}

/* ── PrimePal mascot (star) ─────────────────────────────────── */
function PrimePalMascot({ size = 88 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 90 90" fill="none">
      <polygon
        points="45,6 54,32 82,32 60,50 68,76 45,58 22,76 30,50 8,32 36,32"
        fill="#fbbf24" stroke="#f59e0b" strokeWidth="2"
      />
      <circle cx="45" cy="42" r="16" fill="#fff9eb" />
      <ellipse cx="39" cy="40" rx="3" ry="3.5" fill="#1a0e08" />
      <ellipse cx="51" cy="40" rx="3" ry="3.5" fill="#1a0e08" />
      <ellipse cx="38.2" cy="39" rx="1.2" ry="1.2" fill="white" />
      <ellipse cx="50.2" cy="39" rx="1.2" ry="1.2" fill="white" />
      <path d="M38 46 Q45 52 52 46" stroke="#92400e" strokeWidth="2" fill="none" strokeLinecap="round" />
      <ellipse cx="34" cy="44" rx="4" ry="2.5" fill="#fca5a5" opacity="0.5" />
      <ellipse cx="56" cy="44" rx="4" ry="2.5" fill="#fca5a5" opacity="0.5" />
    </svg>
  );
}

export default function StudentPlayPage() {
  const [step, setStep] = useState<Step>("enter-code");
  const [classCode, setClassCode] = useState("");
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCodeSubmit(e: FormEvent) {
    e.preventDefault();
    const code = classCode.trim().toUpperCase();
    if (!code) return;
    setError(null);
    setLoading(true);
    try {
      const data = await apiFetch<Avatar[]>(`/auth/classroom/${code}/avatars`);
      if (data.length === 0) {
        setError("No students in this class yet. Ask your teacher to add you! 👋");
      } else {
        setAvatars(data);
        setStep("select-student");
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Something went wrong. Try again!";
      if (errorMsg.includes("No classroom found") || errorMsg.includes("classroom") || errorMsg.includes("API error 404")) {
        setError("Hmm, that class code doesn't exist. Check with your teacher! 🏫");
      } else if (errorMsg.includes("Failed to fetch") || errorMsg.includes("fetch") || errorMsg.includes("network")) {
        setError("Oh no! We can't connect right now. Check your internet! 🌐");
      } else {
        setError("Something went wrong. Try again or ask your teacher for help! 🤔");
      }
    } finally {
      setLoading(false);
    }
  }

  function handleAvatarSelect(avatar: Avatar) {
    setSelectedAvatar(avatar);
    setStep("enter-pin");
  }

  function handleBackToCode() {
    setStep("enter-code");
    setAvatars([]);
    setSelectedAvatar(null);
    setError(null);
  }

  function handleBackToStudents() {
    setSelectedAvatar(null);
    setStep("select-student");
  }

  return (
    <div
      className="min-h-screen flex flex-col relative"
      style={{ background: "linear-gradient(160deg, #fdf2f8 0%, #ede9fe 30%, #ddd6fe 55%, #cffafe 80%, #ecfeff 100%)" }}
    >
      <BgDecor />

      {/* Top bar */}
      <header className="backdrop-blur-md bg-white/50 border-b border-violet-200/30 h-16 z-10 relative flex items-center justify-between px-5 sm:px-8">
        <div className="flex items-center gap-3">
          <span className="text-3xl animate-spinSlow">⭐</span>
          <span className="font-baloo font-extrabold text-2xl text-slate-900">PrimePal</span>
        </div>
        <a href="/teacher/login" className="flex items-center gap-2 font-baloo font-extrabold text-base text-teal-700 bg-gradient-to-br from-teal-50 to-emerald-50 border-2 border-teal-200 backdrop-blur-sm px-5 py-2.5 rounded-2xl shadow-[0_4px_14px_rgba(13,148,136,0.15)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(13,148,136,0.2)] hover:border-teal-300">
          <span className="text-xl">👩‍🏫</span> Teacher Login
        </a>
      </header>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8 relative z-[1]">
        <div className="w-full max-w-lg">
          {/* Card */}
          <div className="bg-white/80 backdrop-blur-2xl rounded-[32px] p-8 sm:p-10 shadow-[0_32px_64px_rgba(168,85,247,0.18),0_8px_24px_rgba(0,0,0,0.06)] border-2 border-white/60 animate-slideUp relative overflow-hidden">
            {/* Top shimmer */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-violet-400 via-pink-400 to-cyan-400 bg-[length:200%_100%] animate-shimmer" />

            {step === "enter-code" && (
              <div>
                <div className="text-center mb-8">
                  <div className="inline-block animate-floatBig mb-4">
                    <PrimePalMascot size={80} />
                  </div>
                  <h1 className="font-baloo font-extrabold text-3xl sm:text-4xl text-slate-900 leading-tight mb-2">
                    Enter Your Class Code
                  </h1>
                  <p className="font-nunito font-semibold text-base text-slate-500">
                    Get the code from your teacher
                  </p>
                </div>

                <form onSubmit={handleCodeSubmit} className="space-y-5">
                  <input
                    type="text"
                    value={classCode}
                    onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                    maxLength={10}
                    required
                    placeholder="ABC123"
                    className="w-full text-center text-4xl sm:text-5xl font-baloo font-extrabold tracking-[0.3em] uppercase
                               px-5 py-5 rounded-3xl border-[3px] border-violet-200 bg-gradient-to-br from-violet-50/60 to-pink-50/40
                               text-slate-900 placeholder-violet-300
                               focus:outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100
                               transition-all shadow-[inset_0_2px_8px_rgba(167,139,250,0.08)]"
                    aria-label="Class code"
                  />

                  {error && (
                    <div className="text-center text-sm font-nunito font-bold text-red-800 bg-red-50 border-2 border-red-200 rounded-2xl px-4 py-3 animate-slideUp">
                      ❌ {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || classCode.trim().length < 3}
                    className="w-full py-5 rounded-2xl border-none cursor-pointer font-baloo font-extrabold text-2xl
                               bg-gradient-to-br from-violet-500 to-purple-600 text-white
                               shadow-[0_6px_0_#4c1d95,0_10px_24px_rgba(124,58,237,0.35)]
                               disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none disabled:from-gray-200 disabled:to-gray-200
                               transition-all duration-150
                               hover:-translate-y-0.5 active:translate-y-1 active:shadow-[0_2px_0_#4c1d95]
                               flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 size={24} className="animate-spin" /> : "Let's Go! 🚀"}
                  </button>
                </form>

                <a
                  href="/teacher/login"
                  className="mt-5 flex items-center justify-center gap-2 w-full py-3 rounded-xl font-baloo font-bold text-sm
                             text-teal-700 bg-teal-50 border border-teal-200
                             hover:bg-teal-100 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(13,148,136,0.15)]
                             transition-all duration-200"
                >
                  <span>👩‍🏫</span> Are you a teacher? Sign in here →
                </a>
                <a
                  href="/"
                  className="mt-4 flex items-center justify-center gap-2 w-full py-3 rounded-xl font-baloo font-bold text-sm
                             text-violet-600 bg-violet-50 border border-violet-200
                             hover:bg-violet-100 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(124,58,237,0.15)]
                             transition-all duration-200"
                >
                  <span>🏠</span> Back to Home
                </a>
              </div>
            )}

            {step === "select-student" && (
              <div>
                <div className="text-center mb-6">
                  <div className="inline-block animate-floatBig mb-4">
                    <PrimePalMascot size={96} />
                  </div>
                  <h2 className="font-baloo font-extrabold text-3xl sm:text-4xl text-slate-900 mb-1.5">Who are you?</h2>
                  <p className="font-nunito font-semibold text-base text-slate-500">Tap your name below</p>
                </div>
                <div className="space-y-3 max-h-[50vh] sm:max-h-80 overflow-y-auto">
                  {avatars.map((avatar) => {
                    const gender = guessGender(avatar.student_name);
                    const t = getThemeTokens(gender);
                    return (
                      <button
                        key={avatar.id}
                        onClick={() => handleAvatarSelect(avatar)}
                        className={[
                          "w-full flex items-center gap-3.5 p-4 rounded-[20px] border-2 transition-all duration-200 group relative overflow-hidden",
                          t.rowBorder,
                          t.rowBorderHover,
                          t.rowShadowHover,
                          "hover:translate-x-1.5",
                          gender === "girl" ? "bg-gradient-to-br from-pink-50/60 to-white/80 hover:from-pink-100 hover:to-pink-50" :
                          gender === "boy"  ? "bg-gradient-to-br from-sky-50/60 to-white/80 hover:from-sky-100 hover:to-sky-50" :
                                              "bg-gradient-to-br from-violet-50/60 to-white/80 hover:from-violet-100 hover:to-violet-50",
                        ].join(" ")}
                      >
                        <div className={`w-12 h-12 rounded-2xl ${t.rowAvatar} border-2 ${t.rowAvatarBorder} flex items-center justify-center text-2xl shrink-0 shadow-[0_4px_10px_rgba(0,0,0,0.06)] transition-transform duration-200 group-hover:scale-110 group-hover:rotate-[-5deg]`}>
                          {t.avatarEmoji}
                        </div>
                        <div className="text-left">
                          <span className={`text-lg font-baloo font-extrabold ${t.rowName} block`}>{avatar.student_name}</span>
                          <span className="text-xs font-nunito font-semibold text-slate-400">Tap to continue</span>
                        </div>
                        <span className={`ml-auto text-xl font-bold ${t.rowArrow} ${t.rowArrowHover} transition-all duration-200 group-hover:translate-x-1.5`}>→</span>
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={handleBackToCode}
                  className="mt-5 w-full py-3.5 bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600 rounded-2xl shadow-[0_4px_0_#94a3b8] font-baloo font-extrabold text-sm transition-all active:translate-y-1 active:shadow-none"
                >
                  ← Back to Class Code
                </button>
              </div>
            )}

            {step === "enter-pin" && selectedAvatar && (
              <PinEntry
                avatar={selectedAvatar}
                classCode={classCode.trim().toUpperCase()}
                onBack={handleBackToStudents}
              />
            )}
          </div>

          {/* Bottom tagline */}
          <p className="text-center mt-5 font-nunito font-semibold text-sm text-slate-400">
            🔒 Safe, ad-free learning for every student
          </p>
        </div>
      </div>
    </div>
  );
}
