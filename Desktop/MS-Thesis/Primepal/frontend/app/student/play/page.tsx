"use client";

import { useState, FormEvent } from "react";
import { Loader2, Gamepad2 } from "lucide-react";
import { motion } from "framer-motion";
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-violet-600 flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl ring-1 ring-white/20 p-8">

        {step === "enter-code" && (
          <div>
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

              <motion.button
                type="submit"
                disabled={loading || classCode.trim().length !== 6}
                whileHover={{ scale: classCode.trim().length === 6 ? 1.02 : 1 }}
                whileTap={{ scale: classCode.trim().length === 6 ? 0.98 : 1 }}
                className="w-full bg-indigo-600 text-white font-extrabold text-2xl py-5 rounded-2xl
                           shadow-[0_5px_0_#3730a3]
                           disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:brightness-100
                           transition-all duration-100 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={28} className="animate-spin" /> : "Let's Go! 🚀"}
              </motion.button>
            </form>

            <p className="text-center text-xs text-slate-400 mt-6">
              Are you a teacher?{" "}
              <a href="/teacher/login" className="text-indigo-500 hover:underline font-medium">
                Sign in here
              </a>
            </p>
          </div>
        )}

        {step === "select-student" && (
          <div>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-extrabold text-slate-800 mb-2">
                Who are you?
              </h2>
              <p className="text-slate-500 text-sm">
                Select your name from the list
              </p>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {avatars.map((avatar) => (
                <button
                  key={avatar.id}
                  onClick={() => handleAvatarSelect(avatar)}
                  className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-slate-200 bg-white hover:border-indigo-500 hover:bg-indigo-50 transition-all"
                >
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold shrink-0">
                    {avatar.student_name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-lg font-bold text-slate-800">{avatar.student_name}</span>
                </button>
              ))}
            </div>
            <button
              onClick={handleBackToCode}
              className="mt-6 w-full py-3 text-slate-600 hover:text-slate-800 font-semibold transition-colors"
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
    </div>
  );
}
