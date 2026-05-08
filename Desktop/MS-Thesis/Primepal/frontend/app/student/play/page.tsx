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
  const dots = [
    { top: "12%", left: "8%", size: 14, color: "bg-amber-400", delay: "0s" },
    { top: "22%", right: "12%", size: 10, color: "bg-blue-400", delay: "0.5s" },
    { top: "65%", left: "5%", size: 12, color: "bg-emerald-400", delay: "1s" },
    { top: "75%", right: "8%", size: 16, color: "bg-rose-400", delay: "0.3s" },
    { top: "45%", left: "92%", size: 8, color: "bg-purple-400", delay: "0.8s" },
    { top: "88%", left: "20%", size: 11, color: "bg-amber-400", delay: "1.2s" },
    { top: "8%", left: "55%", size: 9, color: "bg-rose-400", delay: "0.2s" },
  ];

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Soft radial circles */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-amber-400/15 blur-3xl" />
      <div className="absolute -bottom-20 -right-24 w-80 h-80 rounded-full bg-blue-400/10 blur-3xl" />
      <div className="absolute top-[40%] -right-16 w-60 h-60 rounded-full bg-emerald-400/10 blur-3xl" />
      {/* Floating dots */}
      {dots.map((d, i) => (
        <div
          key={i}
          className={`absolute rounded-full ${d.color} opacity-30 animate-floatUp`}
          style={{
            top: d.top,
            left: d.left,
            right: (d as { right?: string }).right,
            width: d.size,
            height: d.size,
            animationDelay: d.delay,
            animationDuration: `${2.5 + i * 0.4}s`,
          }}
        />
      ))}
      {/* Subtle dot grid */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(120,53,15,0.06) 1px, transparent 1px)",
          backgroundSize: "36px 36px",
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
    <div className="min-h-screen bg-student-bg flex flex-col relative">
      <BgDecor />

      {/* Top bar */}
      <header className="bg-gradient-to-r from-pink-100/80 via-violet-100/80 to-cyan-100/80 backdrop-blur-sm border-b border-violet-100/30 h-14 z-10 relative flex items-center justify-between px-5 sm:px-7">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl animate-spinSlow">⭐</span>
          <span className="font-baloo font-extrabold text-xl text-slate-900">PrimePal</span>
        </div>
        <a href="/teacher/login" className="font-baloo font-bold text-sm text-violet-600 hover:text-violet-800 bg-white/60 backdrop-blur-sm px-3 py-1.5 rounded-full transition-colors">
          👩‍🏫 Teacher
        </a>
      </header>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-4 py-8 relative z-[1]">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="bg-white/85 backdrop-blur-xl rounded-3xl p-8 shadow-[0_24px_48px_rgba(168,85,247,0.12)] border-2 border-violet-100/30 animate-slideUp relative overflow-hidden">
            {/* Top shimmer */}
            <div className="absolute top-0 left-0 right-0 h-[5px] bg-gradient-to-r from-violet-400 via-pink-400 to-cyan-400 bg-[length:200%_100%] animate-shimmer" />

            {step === "enter-code" && (
              <div>
                <div className="text-center mb-7">
                  <div className="inline-block animate-floatUp mb-3">
                    <PrimePalMascot size={88} />
                  </div>
                  <h1 className="font-baloo font-extrabold text-2xl sm:text-[26px] text-slate-900 leading-tight mb-1.5">
                    Enter Your Class Code
                  </h1>
                  <p className="font-nunito font-semibold text-sm text-slate-500">
                    Get the code from your teacher.
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
                    className="w-full text-center text-3xl sm:text-4xl font-baloo font-extrabold tracking-[0.25em] uppercase
                               px-4 py-4 rounded-2xl border-[3px] border-violet-200 bg-gradient-to-br from-violet-50/50 to-pink-50/30
                               text-slate-900 placeholder-violet-300
                               focus:outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100
                               transition-all"
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
                    className="w-full py-4 rounded-2xl border-none cursor-pointer font-baloo font-extrabold text-xl
                               bg-gradient-to-br from-violet-400 to-violet-500 text-white
                               shadow-[0_6px_0_#5b21b6,0_8px_18px_rgba(124,58,237,0.3)]
                               disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none disabled:from-gray-200 disabled:to-gray-200
                               transition-all duration-150
                               hover:-translate-y-0.5 active:translate-y-1 active:shadow-[0_2px_0_#5b21b6]
                               flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 size={24} className="animate-spin" /> : "Let's Go! 🚀"}
                  </button>
                </form>

                <p className="text-center mt-5 font-nunito font-semibold text-sm text-slate-400">
                  Are you a teacher?{" "}
                  <a href="/teacher/login" className="text-violet-600 font-bold hover:underline">Sign in here →</a>
                </p>
                <p className="text-center mt-2 font-nunito font-semibold text-xs text-slate-400">
                  <a href="/" className="hover:underline hover:text-violet-500 transition-colors">← Back to Home</a>
                </p>
              </div>
            )}

            {step === "select-student" && (
              <div>
                <div className="text-center mb-5">
                  <div className="inline-block animate-floatUp mb-3">
                    <PrimePalMascot size={72} />
                  </div>
                  <h2 className="font-baloo font-extrabold text-2xl text-slate-900 mb-1">Who are you?</h2>
                  <p className="font-nunito font-semibold text-sm text-slate-500">Tap your name below</p>
                </div>
                <div className="space-y-3 max-h-80 overflow-y-auto">
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
