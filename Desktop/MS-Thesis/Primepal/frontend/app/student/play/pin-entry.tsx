"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2, Delete } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface Avatar {
  id: string;
  student_name: string;
  avatar_url: string;
  theme_color: string;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
}

interface Props {
  avatar: Avatar;
  classCode: string;
  onBack: () => void;
}

export default function PinEntry({ avatar, classCode, onBack }: Props) {
  const router = useRouter();
  const [digits, setDigits] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  // Remove auto-submit — user must click "Let's Go" button
  // (Keeping digits state and effect structure for clarity)

  async function submitPin(pin: string) {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<TokenResponse>("/auth/student/login", {
        method: "POST",
        body: JSON.stringify({
          student_id: avatar.id,
          class_code: classCode,
          secret_pin: pin,
        }),
      });
      localStorage.setItem("primepal_student_token", data.access_token);
      localStorage.setItem("primepal_student_name", avatar.student_name);
      localStorage.setItem("primepal_student_avatar", avatar.avatar_url);
      router.push("/student/home");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      const isWrongPin = msg === "Incorrect PIN";
      setError(isWrongPin ? "Oops! Wrong PIN. Try again 🔐" : msg);
      setShake(true);
      setDigits([]);
      setTimeout(() => setShake(false), 500);
    } finally {
      setLoading(false);
    }
  }

  function pressDigit(d: string) {
    if (digits.length < 4 && !loading) {
      setDigits((prev) => [...prev, d]);
      setError(null);
    }
  }

  function backspace() {
    if (!loading) {
      setDigits((prev) => prev.slice(0, -1));
      setError(null);
    }
  }

  const keypadKeys = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    ["back", "0", "⌫"],
  ];

  return (
    <div className="w-full flex flex-col items-center gap-6">
      {/* Avatar + name */}
      <div className="flex flex-col items-center gap-2">
        <div
          className="w-20 h-20 rounded-full ring-4 ring-offset-2 overflow-hidden bg-slate-50"
          style={{ "--tw-ring-color": avatar.theme_color } as React.CSSProperties}
        >
          <Image
            src={avatar.avatar_url}
            alt={avatar.student_name}
            width={80}
            height={80}
            className="w-full h-full object-cover"
          />
        </div>
        <p className="text-base font-bold text-slate-800">{avatar.student_name}</p>
        <p className="text-sm text-slate-500">Enter your Secret PIN</p>
      </div>

      {/* 4 dot indicators */}
      <style>{`
        @keyframes pin-shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
        .pin-shake { animation: pin-shake 0.4s ease-in-out; }
      `}</style>

      {loading ? (
        <Loader2 size={28} className="animate-spin text-indigo-500" />
      ) : (
        <div className={`flex gap-4 ${shake ? "pin-shake" : ""}`}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-5 h-5 rounded-full border-2 transition-all duration-150 ${
                i < digits.length
                  ? "bg-indigo-600 border-indigo-600"
                  : "bg-white border-slate-300"
              }`}
            />
          ))}
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="text-center text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-2xl px-4 py-2 w-full">
          {error}
        </p>
      )}

      {/* Numeric keypad */}
      <div className="grid grid-cols-3 gap-3 w-full">
        {keypadKeys.flat().map((key) => {
          if (key === "back") {
            return (
              <button
                key="back"
                onClick={onBack}
                disabled={loading}
                className="h-14 rounded-2xl bg-slate-100 text-slate-500 font-semibold text-sm
                           shadow-[0_4px_0_#cbd5e1] hover:brightness-95
                           active:translate-y-[4px] active:shadow-none
                           disabled:opacity-50 disabled:cursor-not-allowed
                           transition-all duration-75"
                aria-label="Go back"
              >
                ←
              </button>
            );
          }
          if (key === "⌫") {
            return (
              <button
                key="backspace"
                onClick={backspace}
                disabled={loading}
                className="h-14 rounded-2xl bg-slate-100 text-slate-600 font-semibold
                           shadow-[0_4px_0_#cbd5e1] hover:brightness-95
                           active:translate-y-[4px] active:shadow-none
                           disabled:opacity-50 disabled:cursor-not-allowed
                           transition-all duration-75 flex items-center justify-center"
                aria-label="Delete digit"
              >
                <Delete size={20} />
              </button>
            );
          }
          return (
            <button
              key={key}
              onClick={() => pressDigit(key)}
              disabled={loading || digits.length >= 4}
              className="h-14 rounded-2xl bg-indigo-600 text-white font-extrabold text-xl
                         shadow-[0_4px_0_#3730a3] hover:brightness-110
                         active:translate-y-[4px] active:shadow-none
                         disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0
                         transition-all duration-75"
            >
              {key}
            </button>
          );
        })}
      </div>

      {/* Let's Go Button — Enabled only when 4 digits entered */}
      <button
        onClick={() => submitPin(digits.join(""))}
        disabled={digits.length !== 4 || loading}
        className="w-full h-14 rounded-2xl bg-green-500 text-white font-extrabold text-lg
                   shadow-[0_4px_0_#15803d] hover:brightness-110
                   active:translate-y-[4px] active:shadow-none
                   disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0 disabled:brightness-100
                   transition-all duration-75"
        aria-label="Enter classroom"
      >
        {loading ? (
          <Loader2 size={20} className="animate-spin mx-auto" />
        ) : (
          "Let's Go! 🚀"
        )}
      </button>
    </div>
  );
}
