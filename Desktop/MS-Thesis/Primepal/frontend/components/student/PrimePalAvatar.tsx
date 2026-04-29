"use client";

import { motion, AnimatePresence, easeInOut } from "framer-motion";

type Sentiment = "neutral" | "happy" | "encouraging" | "celebratory";

interface PrimePalAvatarProps {
  sentiment?: Sentiment;
  size?: "sm" | "md" | "lg";
  showSpeechBubble?: boolean;
  speechText?: string;
}

/**
 * PrimePal Avatar Component — Dynamic Sentiment & Avatar Empathy
 *
 * A character avatar that responds to the student's affective state with
 * different expressions and encouraging messages. Uses Framer Motion for
 * smooth transitions between emotional states.
 *
 * Sentiments:
 * - 'neutral': Default resting state, calm and attentive
 * - 'happy': Positive engagement, student is progressing well
 * - 'encouraging': Student is struggling, needs support and confidence boost
 * - 'celebratory': Student answered correctly, high energy celebration
 */

export default function PrimePalAvatar({
  sentiment = "neutral",
  size = "md",
  showSpeechBubble = false,
  speechText = "",
}: PrimePalAvatarProps) {
  // Size mapping for responsive scaling
  const sizeMap = {
    sm: { container: 80, head: 48, eyes: 16, mouth: 12 },
    md: { container: 120, head: 72, eyes: 24, mouth: 18 },
    lg: { container: 160, head: 96, eyes: 32, mouth: 24 },
  };

  const dims = sizeMap[size];

  // Sentiment-specific configurations
  const sentimentConfig: Record<Sentiment, {
    headRotation: number;
    eyePosition: { x: number; y: number };
    mouthShape: string;
    headBobAmount: number;
    glowColor: string;
    glowIntensity: string;
  }> = {
    neutral: {
      headRotation: 0,
      eyePosition: { x: 0, y: 0 },
      mouthShape: "M 0,-4 L 0,4", // Straight line
      headBobAmount: 0,
      glowColor: "rgba(99, 102, 241, 0.3)",
      glowIntensity: "0 0 15px rgba(99, 102, 241, 0.3)",
    },
    happy: {
      headRotation: 2,
      eyePosition: { x: 0, y: -2 },
      mouthShape: "M -8,-2 Q 0,6 8,-2", // Smile
      headBobAmount: 4,
      glowColor: "rgba(34, 197, 94, 0.3)",
      glowIntensity: "0 0 20px rgba(34, 197, 94, 0.4)",
    },
    encouraging: {
      headRotation: -3,
      eyePosition: { x: 0, y: 1 },
      mouthShape: "M -6,-3 Q 0,3 6,-3 Q 0,1 -6,-3", // Concerned smile
      headBobAmount: 2,
      glowColor: "rgba(251, 146, 60, 0.3)",
      glowIntensity: "0 0 25px rgba(251, 146, 60, 0.4)",
    },
    celebratory: {
      headRotation: 5,
      eyePosition: { x: 0, y: -4 },
      mouthShape: "M -10,-3 Q 0,12 10,-3", // Wide smile/laugh
      headBobAmount: 8,
      glowColor: "rgba(249, 115, 22, 0.4)",
      glowIntensity: "0 0 30px rgba(249, 115, 22, 0.6)",
    },
  };

  const config = sentimentConfig[sentiment];

  // Animation variants for smooth sentiment transitions
  const headVariants: any = {
    neutral: {
      rotate: config.headRotation,
      y: 0,
      transition: { type: "spring", damping: 10, stiffness: 100 },
    },
    bobbing: {
      y: [0, -config.headBobAmount, 0],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: easeInOut,
      },
    },
  };

  const eyeVariants: any = {
    blink: {
      scaleY: [1, 1, 0.1, 1, 1],
      transition: {
        duration: 0.6,
        times: [0, 0.4, 0.5, 0.6, 1],
        repeat: Infinity,
        repeatDelay: 3,
      },
    },
  };

  const glowVariants: any = {
    pulse: {
      boxShadow: [
        `inset 0 0 10px ${config.glowColor}`,
        `inset 0 0 30px ${config.glowColor}`,
        `inset 0 0 10px ${config.glowColor}`,
      ],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: easeInOut,
      },
    },
  };

  const speechBubbleVariants: any = {
    hidden: {
      opacity: 0,
      scale: 0.8,
      y: 10,
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: "spring",
        damping: 12,
        stiffness: 200,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.8,
      y: 10,
      transition: { duration: 0.2 },
    },
  };

  return (
    <div className="flex flex-col items-center justify-center relative">
      {/* Main Avatar Container with Glow */}
      <motion.div
        className="relative rounded-full flex items-center justify-center"
        style={{
          width: dims.container,
          height: dims.container,
        }}
        variants={glowVariants}
        animate={sentiment !== "neutral" ? "pulse" : false}
      >
        {/* Glow background gradient */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle, ${config.glowColor}, transparent)`,
          }}
        />

        {/* SVG Avatar Character */}
        <motion.svg
          viewBox="0 0 100 120"
          width={dims.head}
          height={dims.head}
          className="relative z-10"
          animate={sentiment !== "neutral" ? "bobbing" : "neutral"}
          variants={headVariants}
        >
          {/* Head */}
          <circle cx="50" cy="40" r="30" fill="#FFE5B4" stroke="#FFD699" strokeWidth="1" />

          {/* Left Eye */}
          <motion.circle
            cx="35"
            cy={40 + config.eyePosition.y}
            r={dims.eyes / 2 / 2}
            fill="#333"
            animate="blink"
            variants={eyeVariants}
          />

          {/* Right Eye */}
          <motion.circle
            cx="65"
            cy={40 + config.eyePosition.y}
            r={dims.eyes / 2 / 2}
            fill="#333"
            animate="blink"
            variants={eyeVariants}
          />

          {/* Eye highlights (life in the eyes) */}
          <circle cx="36" cy={39 + config.eyePosition.y} r="2" fill="#FFF" opacity="0.8" />
          <circle cx="66" cy={39 + config.eyePosition.y} r="2" fill="#FFF" opacity="0.8" />

          {/* Mouth - animated path based on sentiment */}
          <motion.path
            d={config.mouthShape}
            stroke="#D97706"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            animate={{ d: config.mouthShape }}
            transition={{ type: "spring", damping: 15, stiffness: 100 }}
          />

          {/* Nose - simple line */}
          <line x1="50" y1="35" x2="50" y2="55" stroke="#FFD699" strokeWidth="1" />

          {/* Cheeks - appears on happy/celebratory sentiments */}
          {(sentiment === "happy" || sentiment === "celebratory") && (
            <>
              <motion.circle
                cx="20"
                cy="55"
                r="8"
                fill="rgba(249, 115, 22, 0.3)"
                animate={{ opacity: [0.2, 0.4, 0.2] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <motion.circle
                cx="80"
                cy="55"
                r="8"
                fill="rgba(249, 115, 22, 0.3)"
                animate={{ opacity: [0.2, 0.4, 0.2] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            </>
          )}

          {/* Body (simple trapezoid) */}
          <path
            d="M 30,70 L 70,70 L 75,95 L 25,95 Z"
            fill="#4F46E5"
            opacity="0.8"
            stroke="#4338CA"
            strokeWidth="1"
          />

          {/* Arms - simple lines */}
          <line x1="30" y1="75" x2="10" y2="85" stroke="#FFE5B4" strokeWidth="3" strokeLinecap="round" />
          <line x1="70" y1="75" x2="90" y2="85" stroke="#FFE5B4" strokeWidth="3" strokeLinecap="round" />
        </motion.svg>

        {/* Celebratory sparkles (appear on celebratory sentiment) */}
        {sentiment === "celebratory" && (
          <>
            <motion.div
              className="absolute text-2xl"
              style={{ top: "-10px", left: "-10px" }}
              animate={{
                scale: [1, 1.2, 1],
                opacity: [1, 0.6, 1],
              }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                repeatDelay: 0.3,
              }}
            >
              ✨
            </motion.div>
            <motion.div
              className="absolute text-2xl"
              style={{ top: "-10px", right: "-10px" }}
              animate={{
                scale: [1, 1.2, 1],
                opacity: [1, 0.6, 1],
              }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                repeatDelay: 0.4,
              }}
            >
              ⭐
            </motion.div>
            <motion.div
              className="absolute text-2xl"
              style={{ bottom: "-10px", left: "-10px" }}
              animate={{
                scale: [1, 1.2, 1],
                opacity: [1, 0.6, 1],
              }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                repeatDelay: 0.5,
              }}
            >
              🎉
            </motion.div>
          </>
        )}
      </motion.div>

      {/* Speech Bubble with encouraging message */}
      <AnimatePresence>
        {showSpeechBubble && speechText && (
          <motion.div
            className="mt-4 max-w-xs"
            variants={speechBubbleVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div className="relative bg-white rounded-3xl rounded-tl-none shadow-lg border-2 border-indigo-200 px-4 py-3">
              {/* Tail pointer */}
              <div className="absolute -left-2 top-2 w-4 h-4 bg-white border-l-2 border-b-2 border-indigo-200 rounded-br transform -rotate-45" />

              {/* Message text */}
              <p className="text-sm font-semibold text-slate-700 text-center leading-snug">
                {speechText}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
