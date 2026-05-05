"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Delete } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface Avatar {
  id: string;
  student_name: string;
  avatar_url: string;
  avatar_style?: string;
  theme_color?: string;
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
    const value = e.target.value.replace(/\D/g, "");
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
    <div className="w-full flex flex-col items-center gap-5">
      {/* Student info */}
      <div className="flex flex-col items-center gap-2">
        <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center border-4 border-amber-300">
          <span className="text-4xl">🎓</span>
        </div>
        <p className="text-base font-baloo font-bold text-amber-950">{avatar.student_name}</p>
        <p className="text-sm font-nunito font-semibold text-amber-700">Enter your Secret PIN</p>
      </div>

      {/* PIN display */}
      {loading ? (
        <Loader2 size={28} className="animate-spin text-amber-500" />
      ) : (
        <div
          className={`flex gap-3 ${shake ? "animate-shake" : ""}`}
          onClick={() => inputRef.current?.focus()}
        >
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-14 h-16 rounded-2xl border-[3px] flex items-center justify-center text-2xl font-baloo font-extrabold transition-all duration-150 ${
                i < digits.length
                  ? "border-amber-500 bg-amber-50 text-amber-800 shadow-[0_3px_0_#fde68a]"
                  : "border-amber-200 bg-white text-transparent shadow-[0_3px_0_#e5e7eb]"
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

      {/* Error */}
      {error && (
        <div className="text-center text-sm font-nunito font-bold text-red-800 bg-red-50 border-2 border-red-200 rounded-2xl px-4 py-2 w-full animate-slideUp">
          {error}
        </div>
      )}

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-2.5 w-full">
        {keypadKeys.flat().map((key) => {
          if (key === "back") {
            return (
              <button
                key="back"
                onClick={onBack}
                disabled={loading}
                className="h-14 rounded-2xl bg-amber-100 text-amber-700 font-baloo font-bold text-sm
                           shadow-[0_4px_0_#fde68a] hover:brightness-95
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
                className="h-14 rounded-2xl bg-amber-100 text-amber-700 font-semibold
                           shadow-[0_4px_0_#fde68a] hover:brightness-95
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
              className="h-14 rounded-2xl bg-gradient-to-b from-amber-800 to-amber-950 text-white font-baloo font-extrabold text-xl
                         shadow-[0_4px_0_#78350f] hover:brightness-110
                         active:translate-y-[4px] active:shadow-none
                         disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0
                         transition-all duration-75"
            >
              {key}
            </button>
          );
        })}
      </div>

      {/* Submit */}
      <button
        onClick={() => submitPin(digits.join(""))}
        disabled={digits.length !== 4 || loading}
        className="w-full h-14 rounded-2xl bg-gradient-to-r from-emerald-700 to-emerald-500 text-white font-baloo font-extrabold text-lg
                   shadow-[0_6px_0_#064e3b,0_10px_24px_rgba(5,150,105,0.3)]
                   hover:brightness-110
                   active:translate-y-[4px] active:shadow-[0_2px_0_#064e3b]
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
