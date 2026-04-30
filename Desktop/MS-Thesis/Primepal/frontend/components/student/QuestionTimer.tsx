'use client';

import { useEffect, useState, useRef } from 'react';
import { useNetworkStatus } from '@/lib/use-network-status';

interface QuestionTimerProps {
  initialSeconds: number;
  onTimeUp: () => void;
  paused?: boolean;
}

export default function QuestionTimer({ initialSeconds, onTimeUp, paused = false }: QuestionTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const { isOnline } = useNetworkStatus();
  const onTimeUpRef = useRef(onTimeUp);
  onTimeUpRef.current = onTimeUp;

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
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [secondsLeft, isPaused]);

  const percentage = (secondsLeft / initialSeconds) * 100;
  const isLowTime = secondsLeft <= 5;

  return (
    <div className="relative flex flex-col items-center gap-2 sm:gap-3 mb-3 sm:mb-6 flex-shrink-0">
      <div className="w-full bg-gray-300 rounded-full h-3 sm:h-4 overflow-hidden">
        <div
          className={`h-full transition-all duration-200 ${
            isLowTime ? 'bg-red-500' : 'bg-green-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className={`text-2xl sm:text-3xl font-bold font-mono ${isLowTime ? 'text-red-600' : 'text-green-600'}`}>
        {secondsLeft}s
      </div>

      {/* Offline overlay */}
      {!isOnline && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-xl backdrop-blur-sm">
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
