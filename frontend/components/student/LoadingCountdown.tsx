'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LoadingCountdownProps {
  /** What to show after countdown finishes (e.g. "Loading questions...") */
  loadingText?: string;
  /** Emoji or icon shown during loading phase */
  emoji?: string;
  /** Background gradient class */
  bgClass?: string;
}

/**
 * Fun 3-2-1-GO countdown that plays once, then shows a loading spinner.
 * Used for first-time loads of missions, puzzle palace, story time.
 */
export default function LoadingCountdown({
  loadingText = 'Loading...',
  emoji = '🚀',
  bgClass = 'bg-student-bg',
}: LoadingCountdownProps) {
  const [step, setStep] = useState(3);

  useEffect(() => {
    if (step <= 0) return;
    const timer = setTimeout(() => setStep((s) => s - 1), 700);
    return () => clearTimeout(timer);
  }, [step]);

  const countdownItems = [
    { num: 3, color: 'text-pink-500',    bg: 'bg-pink-100',    ring: 'ring-pink-300' },
    { num: 2, color: 'text-amber-500',   bg: 'bg-amber-100',   ring: 'ring-amber-300' },
    { num: 1, color: 'text-emerald-500', bg: 'bg-emerald-100', ring: 'ring-emerald-300' },
  ];

  return (
    <div className={`min-h-screen flex items-center justify-center ${bgClass}`}>
      <AnimatePresence mode="wait">
        {step > 0 ? (
          <motion.div
            key={step}
            initial={{ scale: 0.3, opacity: 0, rotate: -20 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 2, opacity: 0 }}
            transition={{ duration: 0.4, ease: 'backOut' }}
            className="text-center"
          >
            <div
              className={`w-32 h-32 rounded-full ${countdownItems[3 - step].bg} ${countdownItems[3 - step].ring} ring-4 flex items-center justify-center mx-auto mb-4 shadow-lg`}
            >
              <span className={`font-baloo font-extrabold text-7xl ${countdownItems[3 - step].color}`}>
                {step}
              </span>
            </div>
            <p className="font-baloo font-extrabold text-xl text-slate-500">
              {step === 3 ? 'Ready...' : step === 2 ? 'Set...' : 'Go!'}
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="loading"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="text-center"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="text-5xl mb-4 inline-block"
            >
              {emoji}
            </motion.div>
            <p className="font-nunito font-semibold text-slate-500">{loadingText}</p>
            <div className="mt-4 flex justify-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                  className="w-2.5 h-2.5 rounded-full bg-violet-400"
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
