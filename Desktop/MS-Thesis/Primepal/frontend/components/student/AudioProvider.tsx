"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import useSound from "use-sound";

export interface AudioContextType {
  isMuted: boolean;
  toggleMute: () => void;
}

export const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children }: { children: ReactNode }) {
  const [isMuted, setIsMuted] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Initialize from localStorage
  useEffect(() => {
    setIsClient(true);
    const savedMuteState = localStorage.getItem("primepal_audio_muted");
    if (savedMuteState !== null) {
      setIsMuted(JSON.parse(savedMuteState));
    }
  }, []);

  // Play background music (loops continuously)
  const [playBGM, { stop: stopBGM, pause: pauseBGM }] =
    useSound("/sounds/bgm.wav", {
      loop: true,
      volume: 0.4, // 40% volume for background
      interrupt: true,
    });

  // Handle mute state and BGM playback
  useEffect(() => {
    if (!isClient) return;

    if (isMuted) {
      pauseBGM();
    } else {
      // Play BGM when unmuted
      playBGM();
    }
  }, [isMuted, isClient, pauseBGM, playBGM]);

  const toggleMute = () => {
    const newMuteState = !isMuted;
    setIsMuted(newMuteState);
    localStorage.setItem("primepal_audio_muted", JSON.stringify(newMuteState));
  };

  if (!isClient) {
    return <>{children}</>;
  }

  return (
    <AudioContext.Provider value={{ isMuted, toggleMute }}>
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error("useAudio must be used within an AudioProvider");
  }
  return context;
}
