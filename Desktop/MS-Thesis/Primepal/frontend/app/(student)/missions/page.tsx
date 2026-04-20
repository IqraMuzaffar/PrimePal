"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { apiFetch } from "@/lib/api";

// ─── Types ───────────────────────────────────────────────────────────────────

interface MissionQuestion {
  id: number;
  type: "multiple_choice" | "fill_blank";
  question: string;
  options?: { id: string; text: string }[] | null;
  emoji_hint: string;
}

interface DailyMissionsResponse {
  grade_level: number;
  topic: string;
  questions: MissionQuestion[];
}

interface CompleteResponse {
  points_awarded: number;
  new_total: number;
}

type PageState = "loading" | "question" | "answered" | "results" | "error";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("primepal_student_token");
}

// ─── Sub-components ──────────────────────────────────────────────────────────

// Loading message rotation
const LOADING_MSGS = [
  "Preparing your quest… 🗺️",
  "Gathering your stars… ⭐",
  "Your missions await… 🎯",
];

function LoadingScreen() {
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setMsgIdx((i) => (i + 1) % LOADING_MSGS.length), 1200);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="w-full max-w-sm mx-auto flex flex-col items-center gap-6 py-12">
      {/* Bouncing stars */}
      <div className="flex gap-4 text-5xl">
        <span className="animate-bounce [animation-delay:0ms]">⭐</span>
        <span className="animate-bounce [animation-delay:200ms]">🌟</span>
        <span className="animate-bounce [animation-delay:400ms]">⭐</span>
      </div>

      {/* Rotating message */}
      <p className="text-xl font-extrabold text-white drop-shadow-md text-center min-h-[2rem] transition-all duration-300">
        {LOADING_MSGS[msgIdx]}
      </p>

      {/* Shimmer progress bar */}
      <div className="w-full h-3 bg-white/30 rounded-full overflow-hidden">
        <div className="h-full w-1/2 bg-white/70 rounded-full animate-[shimmer_1.5s_ease-in-out_infinite]" />
      </div>

      <style>{`
        @keyframes shimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(250%); }
        }
      `}</style>
    </div>
  );
}

function ErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="w-full max-w-md mx-auto bg-white/90 backdrop-blur-sm rounded-[2rem] shadow-2xl p-8 border-4 border-red-200 text-center">
      <p className="text-6xl mb-4">😕</p>
      <h2 className="text-2xl font-extrabold text-gray-800 mb-2">Oops!</h2>
      <p className="text-gray-500 text-base mb-6">{message}</p>
      <motion.button
        onClick={onRetry}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xl py-4 rounded-2xl transition-all duration-150 shadow-lg hover:shadow-xl"
      >
        Try Again 🔄
      </motion.button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MissionsPage() {
  const [pageState, setPageState] = useState<PageState>("loading");
  const [missions, setMissions] = useState<DailyMissionsResponse | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [fillValue, setFillValue] = useState("");
  const [points, setPoints] = useState(0);
  const [sessionPoints, setSessionPoints] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPointsBadge, setShowPointsBadge] = useState(false);
  const [lastAwarded, setLastAwarded] = useState(0);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fetch missions ──────────────────────────────────────────────────────────
  const fetchMissions = useCallback(async () => {
    setPageState("loading");
    setCurrentIndex(0);
    setSelectedOptionId(null);
    setFillValue("");
    setSessionPoints(0);
    setMissions(null);
    setErrorMsg(null);

    const token = getToken();
    if (!token) {
      setErrorMsg("You need to be logged in. Please go back and pick your avatar.");
      setPageState("error");
      return;
    }

    try {
      const data = await apiFetch<DailyMissionsResponse>("/missions/daily", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMissions(data);
      setPageState("question");
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "Could not load missions. Please try again!"
      );
      setPageState("error");
    }
  }, []);

  useEffect(() => {
    fetchMissions();
    return () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    };
  }, [fetchMissions]);

  // ── Confetti on correct answer ──────────────────────────────────────────────
  useEffect(() => {
    if (showPointsBadge && lastAwarded > 0) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.4 },
        colors: ["#fbbf24", "#f59e0b", "#d97706", "#b45309"],
      });
    }
  }, [showPointsBadge, lastAwarded]);

  // ── Submit answer ───────────────────────────────────────────────────────────
  async function submitAnswer() {
    if (pageState !== "question") return;
    setPageState("answered");

    const token = getToken();
    try {
      const result = await apiFetch<CompleteResponse>("/missions/complete", {
        method: "POST",
        headers: { Authorization: `Bearer ${token ?? ""}` },
        body: JSON.stringify({ question_correct: true }),
      });

      const awarded = result.points_awarded;
      setLastAwarded(awarded);
      setSessionPoints((prev) => prev + awarded);
      setPoints(result.new_total);
      setShowPointsBadge(true);

      // Hide badge after 1.2s
      setTimeout(() => setShowPointsBadge(false), 1200);
    } catch {
      // Points fetch failed silently — still advance
    }

    // Auto-advance after 1.5s
    advanceTimer.current = setTimeout(() => {
      advance();
    }, 1500);
  }

  function advance() {
    if (!missions) return;
    const nextIndex = currentIndex + 1;
    if (nextIndex >= missions.questions.length) {
      setPageState("results");
    } else {
      setCurrentIndex(nextIndex);
      setSelectedOptionId(null);
      setFillValue("");
      setPageState("question");
    }
  }

  // ── Handlers ────────────────────────────────────────────────────────────────
  function handleOptionTap(optionId: string) {
    if (pageState !== "question") return;
    setSelectedOptionId(optionId);
    submitAnswer();
  }

  function handleFillSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fillValue.trim() || pageState !== "question") return;
    submitAnswer();
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  const currentQuestion = missions?.questions[currentIndex] ?? null;
  const totalQuestions = missions?.questions.length ?? 3;

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-500 via-violet-500 to-purple-600 flex flex-col items-center px-4 py-8">
      {/* Brand header */}
      <div className="flex items-center gap-3 mb-8">
        <Star className="text-white fill-white drop-shadow" size={28} />
        <h1 className="text-3xl font-extrabold text-white tracking-wide drop-shadow-md">
          PrimePal
        </h1>
        <Star className="text-white fill-white drop-shadow" size={28} />
      </div>

      {/* ── Loading ── */}
      {pageState === "loading" && <LoadingScreen />}

      {/* ── Error ── */}
      {pageState === "error" && (
        <ErrorScreen message={errorMsg ?? "Something went wrong."} onRetry={fetchMissions} />
      )}

      {/* ── Question / Answered ── */}
      {(pageState === "question" || pageState === "answered") && currentQuestion && missions && (
        <div className="w-full max-w-md relative">
          {/* Points counter — top right */}
          <div className="absolute -top-2 right-0 flex items-center gap-1 bg-white/80 rounded-full px-3 py-1 shadow text-sm font-bold text-yellow-700">
            <span>⭐</span>
            <span>{points}</span>
          </div>

          {/* Points badge (fly-up animation) */}
          {showPointsBadge && (
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 z-10 text-green-700 font-extrabold text-lg bg-green-100 border-2 border-green-400 px-4 py-1 rounded-full shadow-lg"
              style={{
                animation: "badgeFlyUp 1.2s ease-out forwards",
              }}
            >
              +{lastAwarded} ⭐
            </div>
          )}

          <div className="bg-white/90 backdrop-blur-sm rounded-[2rem] shadow-2xl border-4 border-yellow-200 overflow-hidden">
            {/* Progress bar */}
            <div className="w-full bg-gray-100 h-2">
              <div
                className="h-2 bg-gradient-to-r from-yellow-400 to-orange-400 transition-all duration-500"
                style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
              />
            </div>

            <div className="p-6">
              {/* Progress text + topic badge */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Question {currentIndex + 1} of {totalQuestions}
                </span>
                <span className="bg-yellow-100 text-yellow-800 rounded-full px-3 py-1 text-sm font-semibold">
                  {missions.topic}
                </span>
              </div>

              {/* Emoji hint + question */}
              <div className="text-center mb-6">
                <p className="text-5xl mb-3">{currentQuestion.emoji_hint}</p>
                <p className="text-xl font-bold text-gray-800 leading-snug">
                  {currentQuestion.question}
                </p>
              </div>

              {/* Multiple choice */}
              {currentQuestion.type === "multiple_choice" &&
                currentQuestion.options &&
                currentQuestion.options.length > 0 && (
                  <div className="grid grid-cols-2 gap-3">
                    {currentQuestion.options.map((opt) => {
                      const isSelected = selectedOptionId === opt.id;
                      const answered = pageState === "answered";
                      const highlight = answered && isSelected;

                      return (
                        <motion.button
                          key={opt.id}
                          onClick={() => handleOptionTap(opt.id)}
                          disabled={answered}
                          whileHover={!answered ? { scale: 1.05 } : undefined}
                          whileTap={!answered ? { scale: 0.95 } : undefined}
                          className={[
                            "w-full py-4 px-3 rounded-2xl border-[3px] font-semibold text-lg text-left transition-all duration-150",
                            "disabled:cursor-not-allowed",
                            highlight
                              ? "bg-green-100 border-green-400 text-green-800"
                              : answered
                              ? "bg-gray-50 border-gray-200 text-gray-500 opacity-60"
                              : "bg-white border-gray-200 hover:border-yellow-400 hover:bg-yellow-50 text-gray-800",
                          ].join(" ")}
                        >
                          <span className="block text-xs font-bold text-gray-400 mb-1 uppercase">
                            {opt.id}
                          </span>
                          {opt.text}
                        </motion.button>
                      );
                    })}
                  </div>
                )}

              {/* Fill in the blank */}
              {currentQuestion.type === "fill_blank" && (
                <form onSubmit={handleFillSubmit} className="space-y-4">
                  <input
                    type="text"
                    value={fillValue}
                    onChange={(e) => setFillValue(e.target.value)}
                    disabled={pageState === "answered"}
                    placeholder="Type your answer..."
                    className={[
                      "w-full text-center text-2xl font-bold py-4 rounded-2xl border-[3px] transition-all",
                      "focus:outline-none",
                      pageState === "answered"
                        ? "bg-green-100 border-green-400 text-green-800"
                        : "border-yellow-300 bg-yellow-50 text-gray-800 focus:border-orange-400 focus:bg-white",
                    ].join(" ")}
                    autoFocus
                  />
                  {pageState === "question" && (
                    <motion.button
                      type="submit"
                      disabled={!fillValue.trim()}
                      whileHover={fillValue.trim() ? { scale: 1.05 } : undefined}
                      whileTap={fillValue.trim() ? { scale: 0.95 } : undefined}
                      className="w-full bg-indigo-600 text-white font-extrabold text-xl py-4 rounded-2xl shadow-[0_4px_0_#3730a3] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all duration-100"
                    >
                      Check! ✓
                    </motion.button>
                  )}
                  {pageState === "answered" && (
                    <div className="text-center text-green-700 font-bold text-lg bg-green-50 rounded-2xl py-3 border-2 border-green-200">
                      Great job! 🌟
                    </div>
                  )}
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Results ── */}
      {pageState === "results" && (
        <div className="w-full max-w-md bg-white/90 backdrop-blur-sm rounded-[2rem] shadow-2xl p-8 border-4 border-yellow-200 text-center">
          <p className="text-7xl mb-2 animate-bounce">🎉</p>
          <h2 className="text-4xl font-extrabold text-gray-800 tracking-tight mb-3">
            Amazing!
          </h2>
          <p className="text-xl font-bold text-orange-500 mb-1">
            You earned{" "}
            <span className="text-yellow-500">{sessionPoints} ⭐</span> today!
          </p>
          <p className="text-base text-gray-500 font-semibold mb-8">
            Total stars: <span className="text-yellow-600 font-extrabold">{points} ⭐</span>
          </p>

          <div className="space-y-4">
            <motion.button
              onClick={fetchMissions}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full bg-indigo-600 text-white font-extrabold text-xl py-5 rounded-2xl shadow-[0_5px_0_#3730a3] hover:brightness-110 transition-all duration-100"
            >
              Play Again 🔄
            </motion.button>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link
                href="/chat"
                className="block w-full bg-violet-500 text-white font-extrabold text-xl py-5 rounded-2xl shadow-[0_5px_0_#5b21b6] hover:brightness-110 transition-all duration-100 text-center"
              >
                Chat with PrimePal 💬
              </Link>
            </motion.div>
          </div>
        </div>
      )}

      {/* Keyframe injection */}
      <style>{`
        @keyframes badgeFlyUp {
          0%   { opacity: 1; transform: translateX(-50%) translateY(0); }
          80%  { opacity: 1; transform: translateX(-50%) translateY(-40px); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-60px); }
        }
      `}</style>
    </div>
  );
}
