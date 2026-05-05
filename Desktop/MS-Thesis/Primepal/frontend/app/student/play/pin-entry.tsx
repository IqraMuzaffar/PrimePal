"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep input focused so physical keyboard always works
  useEffect(() => {
    inputRef.current?.focus();
  }, [digits]);

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
      router.push("/student/home");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";

      // Check specific error types and show friendly messages
      let friendlyMsg: string;
      if (msg === "Incorrect PIN" || msg.toLowerCase().includes("pin")) {
        friendlyMsg = "Oops! That PIN isn't right. Try again! 🔐";
      } else if (msg.includes("Failed to fetch") || msg.includes("fetch") || msg.includes("network")) {
        friendlyMsg = "Oh no! We can't connect right now. Check your internet! 🌐";
      } else if (msg.includes("No classroom found") || msg.includes("classroom")) {
        friendlyMsg = "Hmm, that class code doesn't work. Ask your teacher! 🏫";
      } else if (msg.includes("does not belong")) {
        friendlyMsg = "Oops! You're not in this class. Check your class code! 📋";
      } else {
        friendlyMsg = "Something went wrong. Try again or ask your teacher for help! 🤔";
      }

      setError(friendlyMsg);
      setShake(true);
      setDigits([]);
      setInputValue("");
      setTimeout(() => setShake(false), 500);
    } finally {
      setLoading(false);
    }
  }

  function pressDigit(d: string) {
    if (digits.length < 4 && !loading) {
      const newDigits = [...digits, d];
      setDigits(newDigits);
      setInputValue(newDigits.join(""));
      setError(null);
    }
  }

  function backspace() {
    if (!loading) {
      const newDigits = digits.slice(0, -1);
      setDigits(newDigits);
      setInputValue(newDigits.join(""));
      setError(null);
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value.replace(/\D/g, ""); // Only digits
    if (value.length <= 4) {
      setInputValue(value);
      setDigits(value.split(""));
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
      {/* Student name */}
      <div className="flex flex-col items-center gap-2">
        <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center border-4 border-indigo-200">
          <span className="text-4xl">🎓</span>
        </div>
        <p className="text-base font-bold text-slate-800">{avatar.student_name}</p>
        <p className="text-sm text-slate-500">Enter your Secret PIN</p>
      </div>

      {/* PIN input — works with both physical keyboard and on-screen keypad */}
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
        <div
          className={`flex gap-3 ${shake ? "pin-shake" : ""}`}
          onClick={() => inputRef.current?.focus()}
        >
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-12 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-extrabold transition-all duration-150 ${
                i < digits.length
                  ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                  : "border-slate-300 bg-white text-transparent"
              }`}
            >
              {digits[i] ? "●" : ""}
            </div>
          ))}
          <input
            ref={inputRef}
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === "Enter" && digits.length === 4 && !loading) {
                submitPin(digits.join(""));
              }
            }}
            disabled={loading}
            className="absolute opacity-0 w-0 h-0"
            autoFocus
            aria-label="Enter PIN using keyboard"
          />
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
