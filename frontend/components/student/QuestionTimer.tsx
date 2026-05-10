'use client';

import { useEffect, useState, useRef } from 'react';
import { useNetworkStatus } from '@/lib/use-network-status';

interface QuestionTimerProps {
  initialSeconds: number;
  onTimeUp: () => void;
  paused?: boolean;
  onTick?: (secondsLeft: number) => void;
}

export default function QuestionTimer({ initialSeconds, onTimeUp, paused = false, onTick }: QuestionTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const { isOnline } = useNetworkStatus();
  const onTimeUpRef = useRef(onTimeUp);
  onTimeUpRef.current = onTimeUp;
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;

  // Timer is paused when offline OR when parent says paused
  const isPaused = !isOnline || paused;

  useEffect(() => {
    if (secondsLeft === 0) {
      onTimeUpRef.current();
      return;
    }

    if (isPaused) return;

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        const next = prev <= 1 ? 0 : prev - 1;
        onTickRef.current?.(next);
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [secondsLeft, isPaused]);

  const percentage = (secondsLeft / initialSeconds) * 100;
  const isLowTime = secondsLeft <= 5;

  return (
    <div className="relative flex items-center justify-center gap-3 sm:gap-4 mb-4 sm:mb-6 flex-shrink-0 bg-white rounded-2xl p-4 shadow-md">
      {/* Timer Icon */}
      <div className={`flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center ${
        isLowTime ? 'bg-red-100' : 'bg-green-100'
      }`}>
        <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            className={isLowTime ? 'stroke-red-600' : 'stroke-green-600'}
          />
        </svg>
      </div>

      {/* Progress Ring */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs sm:text-sm font-medium text-gray-600">Time Remaining</span>
          <span className={`text-xl sm:text-2xl font-bold font-mono ${
            isLowTime ? 'text-red-600 animate-pulse' : 'text-green-600'
          }`}>
            {secondsLeft}s
          </span>
        </div>
        <div className="relative w-full bg-gray-200 rounded-full h-3 sm:h-4 overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ease-linear ${
              isLowTime
                ? 'bg-gradient-to-r from-red-500 to-red-600'
                : 'bg-gradient-to-r from-green-400 to-green-600'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Offline overlay */}
      {!isOnline && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/90 rounded-2xl backdrop-blur-sm">
          <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
            <svg
              className="animate-spin h-4 w-4 text-slate-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Waiting for connection...
          </div>
        </div>
      )}
    </div>
  );
}
