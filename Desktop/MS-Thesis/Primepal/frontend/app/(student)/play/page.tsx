"use client";

import { useState, FormEvent } from "react";
import { Loader2, Star } from "lucide-react";
import { apiFetch } from "@/lib/api";
import AvatarSelect from "./avatar-select";

interface Avatar {
  id: string;
  student_name: string;
  avatar_url: string;
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
    <div className="min-h-screen bg-gradient-to-b from-yellow-300 to-orange-300 flex flex-col items-center px-4 py-10">
      {/* Brand header */}
      <div className="flex items-center gap-2 mb-10">
        <Star className="text-white fill-white" size={28} />
        <h1 className="text-3xl font-extrabold text-white tracking-wide drop-shadow">
          PrimePal
        </h1>
        <Star className="text-white fill-white" size={28} />
      </div>

      <div className="w-full max-w-sm bg-yellow-50 rounded-3xl shadow-xl p-8">
        {step === "enter-code" && (
          <div>
            {/* Step 1: Enter class code */}
            <div className="text-center mb-8">
              <p className="text-5xl mb-3">🏫</p>
              <h2 className="text-2xl font-bold text-gray-800">Enter your class code!</h2>
              <p className="text-gray-500 text-sm mt-2">Ask your teacher for the code.</p>
            </div>

            <form onSubmit={handleCodeSubmit} className="space-y-4">
              <input
                type="text"
                value={classCode}
                onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                maxLength={10}
                required
                placeholder="e.g. ABC123"
                className="w-full text-center text-3xl font-bold tracking-widest uppercase
                           px-4 py-4 rounded-2xl border-4 border-yellow-400 bg-white
                           text-gray-800 placeholder-gray-300 focus:outline-none
                           focus:border-orange-400 transition-colors"
                aria-label="Class code"
              />

              {error && (
                <p className="text-center text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || classCode.trim().length === 0}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50
                           text-white font-bold text-xl py-4 rounded-2xl
                           transition-colors flex items-center justify-center gap-2
                           shadow-md active:scale-95"
              >
                {loading ? (
                  <Loader2 size={24} className="animate-spin" />
                ) : (
                  "Let's Go! 🚀"
                )}
              </button>
            </form>

            <p className="text-center text-xs text-gray-400 mt-6">
              Are you a teacher?{" "}
              <a href="/login" className="text-indigo-500 hover:underline">
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
