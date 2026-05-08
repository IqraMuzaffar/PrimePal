'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { motion } from 'framer-motion';

interface AudioPlayButtonProps {
  text: string;
  rate?: number;
  autoPlay?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function AudioPlayButton({ text, rate = 0.85, autoPlay = false, size = 'md' }: AudioPlayButtonProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [voicesReady, setVoicesReady] = useState(false);
  const [error, setError] = useState(false);
  const hasAutoPlayed = useRef(false);
  const hasInteracted = useRef(false);

  // Wait for browser voices to load (Chrome loads them async)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setError(true);
      return;
    }
    const check = () => {
      if (window.speechSynthesis.getVoices().length > 0) setVoicesReady(true);
    };
    check();
    window.speechSynthesis.onvoiceschanged = check;
    const fallback = setTimeout(() => setVoicesReady(true), 1000);
    return () => { clearTimeout(fallback); };
  }, []);

  const speak = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) { setError(true); return; }
    if (!text || !text.trim()) { setError(true); return; }
    setError(false);
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = rate;
    u.lang = 'en-US';
    const voices = window.speechSynthesis.getVoices();
    const eng = voices.find(v => v.lang.startsWith('en'));
    if (eng) u.voice = eng;
    u.onstart = () => setIsPlaying(true);
    u.onend = () => setIsPlaying(false);
    u.onerror = (e) => {
      setIsPlaying(false);
      if (e.error !== 'interrupted') { setError(true); }
    };
    window.speechSynthesis.speak(u);
  }, [text, rate]);

  // Auto-play only after voices ready AND user has interacted with page
  useEffect(() => {
    if (!autoPlay || !voicesReady || hasAutoPlayed.current) return;
    if (hasInteracted.current) {
      hasAutoPlayed.current = true;
      const t = setTimeout(speak, 300);
      return () => clearTimeout(t);
    }
  }, [autoPlay, voicesReady, speak]);

  // Reset auto-play when text changes (next question)
  useEffect(() => { hasAutoPlayed.current = false; }, [text]);

  const handleClick = () => {
    hasInteracted.current = true;
    speak();
  };

  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-20 h-20',
  };

  const iconSizes = { sm: 18, md: 24, lg: 32 };

  return (
    <div className="flex flex-col items-center gap-2">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleClick}
        disabled={isPlaying}
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
        {error ? '🔇 Tap to retry' : isPlaying ? '🔊 Playing...' : '🎧 Tap to Listen'}
      </p>
    </div>
  );
}
