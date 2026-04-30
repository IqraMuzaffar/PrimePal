"use client";

import { useState, useRef, useEffect } from "react";

interface StreakCounterProps {
  currentStreak: number;
  longestStreak: number;
}

export default function StreakCounter({ currentStreak, longestStreak }: StreakCounterProps) {
  const [showPopover, setShowPopover] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close popover on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setShowPopover(false);
      }
    }
    if (showPopover) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showPopover]);

  const isHot = currentStreak >= 3;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setShowPopover((v) => !v)}
        className={[
          "flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-bold whitespace-nowrap transition-all duration-150",
          currentStreak > 0
            ? "bg-orange-100 text-orange-700"
            : "bg-slate-100 text-slate-500",
        ].join(" ")}
        aria-label={`Streak: ${currentStreak} days`}
      >
        <span className={isHot ? "streak-flame-pulse" : ""}>
          {currentStreak > 0 ? "🔥" : "🔥"}
        </span>
        <span>{currentStreak}</span>
      </button>

      {showPopover && (
        <div
          ref={popoverRef}
          className="absolute top-full right-0 mt-1.5 w-52 bg-white rounded-xl shadow-lg border border-slate-200 p-3 z-50 animate-[fadeIn_0.15s_ease-out]"
        >
          {currentStreak > 0 ? (
            <>
              <p className="text-sm font-bold text-slate-800">
                {"🔥"} Current streak: {currentStreak} {currentStreak === 1 ? "day" : "days"}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {"🏆"} Longest streak: {longestStreak} {longestStreak === 1 ? "day" : "days"}
              </p>
              <p className="text-xs text-indigo-600 font-semibold mt-2">
                Come back tomorrow to keep it going!
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-bold text-slate-800">No active streak</p>
              <p className="text-xs text-indigo-600 font-semibold mt-1">
                Start a new streak today! {"💪"}
              </p>
              {longestStreak > 0 && (
                <p className="text-xs text-slate-500 mt-1">
                  {"🏆"} Your best: {longestStreak} {longestStreak === 1 ? "day" : "days"}
                </p>
              )}
            </>
          )}
        </div>
      )}

      <style>{`
        .streak-flame-pulse {
          display: inline-block;
          animation: flamePulse 1.5s ease-in-out infinite;
        }
        @keyframes flamePulse {
          0%, 100% { transform: scale(1); filter: brightness(1); }
          50% { transform: scale(1.2); filter: brightness(1.3) drop-shadow(0 0 4px rgba(249, 115, 22, 0.6)); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
