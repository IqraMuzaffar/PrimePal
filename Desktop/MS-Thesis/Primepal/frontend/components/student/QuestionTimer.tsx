'use client';

import { useEffect, useState } from 'react';

interface QuestionTimerProps {
  initialSeconds: number;
  onTimeUp: () => void;
}

export default function QuestionTimer({ initialSeconds, onTimeUp }: QuestionTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);

  useEffect(() => {
    if (secondsLeft === 0) {
      onTimeUp();
      return;
    }

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [secondsLeft, onTimeUp]);

  const percentage = (secondsLeft / initialSeconds) * 100;
  const isLowTime = secondsLeft <= 5;

  return (
    <div className="flex flex-col items-center gap-2 sm:gap-3 mb-3 sm:mb-6 flex-shrink-0">
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
    </div>
  );
}
