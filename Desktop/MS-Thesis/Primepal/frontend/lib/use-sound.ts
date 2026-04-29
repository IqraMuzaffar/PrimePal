import { useEffect, useState, useContext } from "react";
import useSound from "use-sound";
import { AudioContext } from "@/components/student/AudioProvider";

/**
 * usePrimeSounds — wraps use-sound and respects the global mute state
 *
 * Supported sound names:
 * - "thud": Heavy chest tap sound (80ms duration, 200Hz bass tone)
 * - "fanfare": Magical reward fanfare (500ms duration, ascending bells)
 * - "correct": Correct answer ding
 * - "incorrect": Wrong answer buzz
 * - "collect": Item collection sound
 * - "level-up": Level up jingle
 * - "chime": Soft bell chime
 */

export function usePrimeSounds(soundName: string) {
  const [isClient, setIsClient] = useState(false);

  // Safely get audio context if available
  const audioContext = useContext(AudioContext);
  const isMuted = audioContext?.isMuted ?? false;

  // Map sound names to file paths
  // Using existing sound files in /sounds directory
  const soundMap: Record<string, string> = {
    thud: "/sounds/pop.wav",           // Heavy pop for chest tap
    fanfare: "/sounds/chime.wav",      // Magical chime for reward
    correct: "/sounds/chime.wav",      // Success chime
    incorrect: "/sounds/error.wav",    // Error buzz for wrong answers
    collect: "/sounds/pop.wav",        // Pop for item collection
    "level-up": "/sounds/whoosh.wav",  // Whoosh for level up
    chime: "/sounds/chime.wav",        // Soft bell chime
  };

  const soundPath = soundMap[soundName] || "/sounds/pop.wav";

  const [play, { stop, pause }] = useSound(soundPath, {
    volume: 0.7,
    interrupt: true,
  });

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Wrapper that respects mute state
  const playWithMute = () => {
    if (!isClient || isMuted) {
      return;
    }
    play();
  };

  return {
    play: playWithMute,
    stop,
    pause,
  };
}
