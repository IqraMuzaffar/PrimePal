"use client";

import { useState, FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import PinEntry from "./pin-entry";

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
      <header className="bg-white border-b border-slate-100 h-14 z-10 relative flex items-center justify-between px-5 sm:px-7 shadow-[0_3px_16px_rgba(0,0,0,0.22)]">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl animate-floatUp">⭐</span>
          <span className="font-baloo font-extrabold text-xl text-slate-900">PrimePal</span>
        </div>
        <span className="font-nunito font-semibold text-sm text-amber-100/60 hidden sm:inline">
          English Learning Platform
        </span>
        <a href="/teacher/login" className="font-baloo font-bold text-sm text-amber-200 hover:text-amber-100 transition-colors">
          👩‍🏫 Teacher Login
        </a>
      </header>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-4 py-8 relative z-[1]">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="bg-white rounded-3xl p-8 shadow-[0_24px_48px_rgba(168,85,247,0.10)] animate-slideUp relative overflow-hidden">
            {/* Top shimmer */}
            <div className="absolute top-0 left-0 right-0 h-[5px] bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500" />

            {step === "enter-code" && (
              <div>
                <div className="text-center mb-7">
                  <div className="inline-block animate-floatUp mb-3">
                    <PrimePalMascot size={88} />
                  </div>
                  <h1 className="font-baloo font-extrabold text-2xl sm:text-[26px] text-amber-950 leading-tight mb-1.5">
                    Enter Your Class Code
                  </h1>
                  <p className="font-nunito font-semibold text-sm text-amber-700">
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
                               px-4 py-4 rounded-2xl border-[3px] border-amber-200 bg-amber-50/50
                               text-amber-950 placeholder-amber-300
                               focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-100
                               transition-all shadow-inner"
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

                <p className="text-center mt-5 font-nunito font-semibold text-sm text-amber-600/50">
                  Are you a teacher?{" "}
                  <a href="/teacher/login" className="text-amber-700 font-bold hover:underline">Sign in here →</a>
                </p>
              </div>
            )}

            {step === "select-student" && (
              <div>
                <div className="text-center mb-5">
                  <div className="inline-block animate-floatUp mb-3">
                    <PrimePalMascot size={72} />
                  </div>
                  <h2 className="font-baloo font-extrabold text-2xl text-amber-950 mb-1">Who are you?</h2>
                  <p className="font-nunito font-semibold text-sm text-amber-700">Select your name from the list</p>
                </div>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {avatars.map((avatar) => (
                    <button
                      key={avatar.id}
                      onClick={() => handleAvatarSelect(avatar)}
                      className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-amber-200 bg-white
                                 hover:border-amber-500 hover:bg-amber-50 transition-all group"
                    >
                      <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-800 font-baloo font-extrabold shrink-0 border-2 border-amber-200 group-hover:border-amber-400 transition-colors">
                        {avatar.student_name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-lg font-baloo font-bold text-amber-950">{avatar.student_name}</span>
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleBackToCode}
                  className="mt-5 w-full py-3 bg-slate-100 text-slate-700 rounded-2xl shadow-[0_3px_0_#94a3b8] font-baloo font-bold transition-colors"
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
          <p className="text-center mt-5 font-nunito font-semibold text-sm text-amber-700/50">
            🔒 Safe, ad-free learning for every student
          </p>
        </div>
      </div>
    </div>
  );
}
