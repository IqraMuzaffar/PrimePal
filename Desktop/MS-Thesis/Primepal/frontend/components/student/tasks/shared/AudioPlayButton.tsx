'use client';

import { useState, useEffect } from 'react';
import { Volume2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface AudioPlayButtonProps {
  text: string;
  rate?: number;
  autoPlay?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function AudioPlayButton({ text, rate = 0.85, autoPlay = false, size = 'md' }: AudioPlayButtonProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  const speak = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.lang = 'en-US';
    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (autoPlay) {
      const timer = setTimeout(speak, 500);
      return () => clearTimeout(timer);
    }
  }, [text, autoPlay]);

  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-20 h-20',
  };

  const iconSizes = { sm: 18, md: 24, lg: 32 };

  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={speak}
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center transition-colors ${
        isPlaying
          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
          : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
      }`}
    >
      <Volume2 size={iconSizes[size]} />
    </motion.button>
  );
}
