'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';

interface VoiceContextValue {
  /** The best available en-US (or fallback en-*) voice, null until loaded */
  voice: SpeechSynthesisVoice | null;
  /** True once browser voices are available */
  voicesReady: boolean;
  /** Speak text with the preloaded voice. Returns the utterance for caller control. */
  speak: (text: string, rate?: number) => SpeechSynthesisUtterance | null;
  /** Pre-warm the TTS engine for a text (silent, near-instant cancel). */
  prewarm: (text: string, rate?: number) => void;
}

const VoiceContext = createContext<VoiceContextValue>({
  voice: null,
  voicesReady: false,
  speak: () => null,
  prewarm: () => {},
});

export function useVoice() {
  return useContext(VoiceContext);
}

/**
 * Score a voice for kid-friendly clarity.
 * Higher = better. Returns -1 to skip entirely.
 */
function scoreVoice(v: SpeechSynthesisVoice): number {
  const name = v.name.toLowerCase();
  const lang = v.lang;

  // Blocklist — robotic / hard-to-understand accents for ESL kids
  if (lang === 'en-GB' || lang === 'en-IN' || lang === 'en-AU') return 0;

  // Must be English
  if (!lang.startsWith('en')) return -1;

  // en-US preferred voices (clear, natural, child-friendly)
  if (lang === 'en-US') {
    if (name.includes('aria'))   return 100; // Microsoft Aria — natural, warm
    if (name.includes('jenny'))  return 99;  // Microsoft Jenny
    if (name.includes('guy'))    return 98;  // Microsoft Guy
    if (name.includes('ana'))    return 97;  // Microsoft Ana (child voice on some systems)
    if (name.includes('google us english')) return 96; // Google US English
    if (name.includes('zira'))   return 90;  // Microsoft Zira (older but clear)
    if (name.includes('david'))  return 85;  // Microsoft David
    if (name.includes('mark'))   return 84;  // Microsoft Mark
    return 70; // any other en-US
  }

  // en-AU is acceptable but not ideal
  if (lang === 'en-AU') return 30;
  // en-IN last resort — better than British
  if (lang === 'en-IN') return 20;

  return 10; // other en-*
}

export function VoiceProvider({ children }: { children: ReactNode }) {
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [voicesReady, setVoicesReady] = useState(false);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) return;

      // Pick highest-scoring voice
      let best: SpeechSynthesisVoice | null = null;
      let bestScore = -1;
      for (const v of voices) {
        const s = scoreVoice(v);
        if (s > bestScore) { bestScore = s; best = v; }
      }

      voiceRef.current = best;
      setVoice(best);
      setVoicesReady(true);
    };

    pickVoice();
    window.speechSynthesis.onvoiceschanged = pickVoice;

    // Chrome sometimes doesn't fire onvoiceschanged — fallback
    const fallback = setTimeout(() => {
      if (!voiceRef.current) {
        pickVoice();
        setVoicesReady(true);
      }
    }, 500);

    return () => clearTimeout(fallback);
  }, []);

  const speak = useCallback((text: string, rate = 0.65): SpeechSynthesisUtterance | null => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return null;
    if (!text?.trim()) return null;

    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate  = rate;
    u.pitch = 1.0; // natural pitch — clearer for ESL listeners
    u.lang  = 'en-US';
    if (voiceRef.current) u.voice = voiceRef.current;
    window.speechSynthesis.speak(u);
    return u;
  }, []);

  const prewarm = useCallback((text: string, rate = 0.65) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    if (!text?.trim()) return;

    const u = new SpeechSynthesisUtterance(text);
    u.rate   = rate;
    u.pitch  = 1.0;
    u.lang   = 'en-US';
    u.volume = 0;
    if (voiceRef.current) u.voice = voiceRef.current;
    window.speechSynthesis.speak(u);
    setTimeout(() => window.speechSynthesis.cancel(), 50);
  }, []);

  return (
    <VoiceContext.Provider value={{ voice, voicesReady, speak, prewarm }}>
      {children}
    </VoiceContext.Provider>
  );
}
