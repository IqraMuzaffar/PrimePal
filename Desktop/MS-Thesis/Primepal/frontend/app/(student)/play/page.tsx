"use client";

import { useState, FormEvent } from "react";
import { Loader2, Gamepad2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import AvatarSelect from "./avatar-select";

interface Avatar {
  id: string;
  student_name: string;
  avatar_url: string;
  avatar_style: string;
  theme_color: string;
}

type Step = "enter-code" | "pick-avatar";

export default function StudentPlayPage() {
  const [step, setStep] = useState<Step>("enter-code");
  const [classCode, setClassCode] = useState("");
  const [avatars, setAvatars] = useState<Avatar[]>([]);
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
        setError("No students found in this class. Ask your teacher!");
      } else {
        setAvatars(data);
        setStep("pick-avatar");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again!");
    } finally {
      setLoading(false);
    }
  }

  function handleBack() {
    setStep("enter-code");
    setAvatars([]);
    setError(null);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-violet-600 flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl ring-1 ring-white/20 p-8">
        {step === "enter-code" && (
          <div>
            {/* Icon + heading */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-100 rounded-2xl mb-4">
                <Gamepad2 size={44} className="text-indigo-600" />
              </div>
              <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">
                Enter Your Class Code
              </h2>
              <p className="text-slate-500 text-base mt-2 font-medium">
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
                className="w-full text-center text-4xl font-black tracking-[0.3em] uppercase
                           px-4 py-5 rounded-2xl border-4 border-slate-200 bg-white
                           text-slate-800 placeholder-slate-300
                           focus:outline-none focus:border-indigo-500
                           focus:ring-4 focus:ring-indigo-100
                           transition-all shadow-inner"
                aria-label="Class code"
              />

              {error && (
                <p className="text-center text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
                  😬 {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || classCode.trim().length === 0}
                className="w-full bg-indigo-600 text-white font-extrabold text-2xl py-5 rounded-2xl
                           shadow-[0_5px_0_#3730a3] hover:brightness-110
                           active:translate-y-[5px] active:shadow-none
                           disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0
                           transition-all duration-100 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={28} className="animate-spin" /> : "Let's Go! 🚀"}
              </button>
            </form>

            <p className="text-center text-xs text-slate-400 mt-6">
              Are you a teacher?{" "}
              <a href="/login" className="text-indigo-500 hover:underline font-medium">
                Sign in here
              </a>
            </p>
          </div>
        )}

        {step === "pick-avatar" && (
          <AvatarSelect
            classCode={classCode.trim().toUpperCase()}
            avatars={avatars}
            onBack={handleBack}
          />
        )}
      </div>
    </div>
  );
}
