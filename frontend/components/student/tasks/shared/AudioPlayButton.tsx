'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { motion } from 'framer-motion';
import { useVoice } from '@/lib/voice-context';

interface AudioPlayButtonProps {
  text: string;
  rate?: number;
  autoPlay?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function AudioPlayButton({ text, rate = 0.75, autoPlay = false, size = 'md' }: AudioPlayButtonProps) {
  const { voicesReady, speak } = useVoice();
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState(false);
  const hasAutoPlayed = useRef(false);
  const hasInteracted = useRef(false);

  const doSpeak = useCallback(() => {
    if (!text?.trim()) { setError(true); return; }
    setError(false);
    const u = speak(text, rate);
    if (!u) { setError(true); return; }
    u.onstart = () => setIsPlaying(true);
    u.onend = () => setIsPlaying(false);
    u.onerror = (e) => {
      setIsPlaying(false);
      if (e.error !== 'interrupted') setError(true);
    };
  }, [text, rate, speak]);

  // Auto-play once voices are ready and user has interacted
  useEffect(() => {
    if (!autoPlay || !voicesReady || hasAutoPlayed.current) return;
    if (hasInteracted.current) {
      hasAutoPlayed.current = true;
      const t = setTimeout(doSpeak, 150);
      return () => clearTimeout(t);
    }
  }, [autoPlay, voicesReady, doSpeak]);

  // Reset auto-play when text changes (next question)
  useEffect(() => { hasAutoPlayed.current = false; }, [text]);

  const handleClick = () => {
    hasInteracted.current = true;
    if (isPlaying) {
      window.speechSynthesis?.cancel();
      setIsPlaying(false);
      setTimeout(doSpeak, 100);
    } else {
      doSpeak();
    }
  };

  const sizeClasses = { sm: 'w-10 h-10', md: 'w-14 h-14', lg: 'w-20 h-20' };
  const iconSizes = { sm: 18, md: 24, lg: 32 };

  return (
    <div className="flex flex-col items-center gap-2">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleClick}
        aria-label={isPlaying ? 'Playing audio' : 'Click to listen'}
        className={`${sizeClasses[size]} rounded-full flex items-center justify-center transition-all shadow-lg ${
          error
            ? 'bg-red-500 text-white shadow-red-200'
            : isPlaying
            ? 'bg-green-500 text-white shadow-green-200 animate-pulse'
            : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'
        }`}
      >
        {error ? (
          <VolumeX size={iconSizes[size]} />
        ) : (
          <Volume2 size={iconSizes[size]} className={isPlaying ? 'animate-pulse' : ''} />
        )}
      </motion.button>
      <p className="text-sm font-semibold text-gray-700">
        {error ? '🔇 Tap to retry' : isPlaying ? '🔊 Tap to Replay' : '🎧 Tap to Listen'}
      </p>
    </div>
  );
}
