'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';

interface VoiceContextValue {
  /** The preferred en-IN (or fallback en-*) voice, null until loaded */
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

export function VoiceProvider({ children }: { children: ReactNode }) {
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [voicesReady, setVoicesReady] = useState(false);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  // Load voices once at app level
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) return;

      // Prefer en-IN, then any en-*
      const indian = voices.find(v => v.lang === 'en-IN');
      const english = indian || voices.find(v => v.lang.startsWith('en'));
      const picked = english || null;

      voiceRef.current = picked;
      setVoice(picked);
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

  const speak = useCallback((text: string, rate = 0.75): SpeechSynthesisUtterance | null => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return null;
    if (!text?.trim()) return null;

    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = rate;
    u.lang = 'en-IN';
    if (voiceRef.current) u.voice = voiceRef.current;
    window.speechSynthesis.speak(u);
    return u;
  }, []);

  const prewarm = useCallback((text: string, rate = 0.75) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    if (!text?.trim()) return;

    // Create utterance and immediately cancel after queueing — warms the engine
    const u = new SpeechSynthesisUtterance(text);
    u.rate = rate;
    u.lang = 'en-IN';
    u.volume = 0;
    if (voiceRef.current) u.voice = voiceRef.current;
    window.speechSynthesis.speak(u);
    // Cancel after a tiny tick — browser has started processing the text
    setTimeout(() => window.speechSynthesis.cancel(), 50);
  }, []);

  return (
    <VoiceContext.Provider value={{ voice, voicesReady, speak, prewarm }}>
      {children}
    </VoiceContext.Provider>
  );
}
