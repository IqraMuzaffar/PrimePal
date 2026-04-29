"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Clock,
  Lightbulb,
  Sun,
  Cloud,
  Leaf,
  Flame,
  Star,
  Sparkles,
} from "lucide-react";

interface DynamicBackgroundProps {
  missionsCompleted?: number;
}

export default function DynamicBackground({
  missionsCompleted = 0,
}: DynamicBackgroundProps) {
  const [isNightMode, setIsNightMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Detect day/night cycle based on local time
  useEffect(() => {
    setMounted(true);
    const updateTimeMode = () => {
      const hour = new Date().getHours();
      // Night mode: 6 PM (18) to 6 AM (6)
      const isNight = hour >= 18 || hour < 6;
      setIsNightMode(isNight);
    };

    updateTimeMode();
    // Check time every minute
    const interval = setInterval(updateTimeMode, 60000);
    return () => clearInterval(interval);
  }, []);

  if (!mounted) return null;

  // Determine theme tier based on missions completed
  const getTier = () => {
    if (missionsCompleted >= 100) return "tier3"; // Space Station
    if (missionsCompleted >= 50) return "tier2"; // Jungle Safari
    return "tier1"; // Classroom
  };

  const tier = getTier();

  // Dynamic background gradients based on time and tier
  const getDayGradient = () => {
    switch (tier) {
      case "tier3": // Space Station - cosmic day
        return "from-blue-400 via-purple-400 to-indigo-500";
      case "tier2": // Jungle - warm day
        return "from-amber-200 via-emerald-300 to-blue-400";
      case "tier1": // Classroom - bright day
      default:
        return "from-sky-300 via-blue-300 to-cyan-200";
    }
  };

  const getNightGradient = () => {
    switch (tier) {
      case "tier3": // Space Station - deep space
        return "from-slate-900 via-indigo-900 to-purple-900";
      case "tier2": // Jungle - dark night
        return "from-emerald-900 via-slate-900 to-blue-900";
      case "tier1": // Classroom - dark blue night
      default:
        return "from-slate-800 via-blue-900 to-indigo-900";
    }
  };

  const gradientClass = isNightMode ? getNightGradient() : getDayGradient();

  return (
    <>
      {/* Main background gradient */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className={`fixed inset-0 z-[-1] bg-gradient-to-br ${gradientClass}`}
      />

      {/* Optional: Animated overlay for depth */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isNightMode ? 0.3 : 0.1 }}
        transition={{ duration: 1 }}
        className="fixed inset-0 z-[-1] bg-black"
      />

      {/* Vignette effect for visual polish */}
      <div
        className="fixed inset-0 z-[-1] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 0%, rgba(0, 0, 0, 0.15) 100%)",
        }}
      />

      {/* TIER 1: CLASSROOM */}
      {tier === "tier1" && (
        <>
          {/* Day: Sun and clouds */}
          {!isNightMode && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.8 }}
                transition={{ delay: 0.3 }}
                className="fixed top-20 right-10 z-[-1]"
              >
                <Sun className="w-24 h-24 text-yellow-300 drop-shadow-lg" />
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                transition={{ delay: 0.4 }}
                className="fixed top-32 left-20 z-[-1]"
              >
                <Cloud className="w-20 h-20 text-white/60" />
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                transition={{ delay: 0.5 }}
                className="fixed top-40 right-40 z-[-1]"
              >
                <Cloud className="w-16 h-16 text-white/50" />
              </motion.div>
            </>
          )}

          {/* Night: Moon and stars, desk lamp */}
          {isNightMode && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.7 }}
                transition={{ delay: 0.3 }}
                className="fixed top-24 right-16 z-[-1]"
              >
                <div className="w-20 h-20 rounded-full bg-white/80 shadow-lg shadow-white/40" />
              </motion.div>

              {/* Desk lamp in corner */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.8 }}
                transition={{ delay: 0.4 }}
                className="fixed bottom-20 right-10 z-[-1]"
              >
                <Lightbulb className="w-16 h-16 text-yellow-200 drop-shadow-lg" />
              </motion.div>

              {/* Additional desk lamp */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                transition={{ delay: 0.5 }}
                className="fixed top-1/3 left-10 z-[-1]"
              >
                <Lightbulb className="w-12 h-12 text-yellow-100/70" />
              </motion.div>
            </>
          )}

          {/* Clock on wall with rotating animation (always visible) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6, rotate: 360 }}
            transition={{
              delay: 0.2,
              rotate: {
                duration: 60,
                repeat: Infinity,
                ease: "linear",
              },
              opacity: { duration: 0.5 },
            }}
            className="fixed top-10 left-1/2 -translate-x-1/2 z-[-1]"
          >
            <Clock className={`w-12 h-12 ${isNightMode ? "text-slate-300" : "text-slate-600"}`} />
          </motion.div>

          {/* Dust motes floating in sunbeam (day only) */}
          {!isNightMode && (
            <>
              {[0, 1, 2, 3].map((i) => (
                <motion.div
                  key={`dust-${i}`}
                  initial={{ opacity: 0, y: 0, x: 0 }}
                  animate={{
                    opacity: [0.3, 0.6, 0.3],
                    y: [0, 40, 80],
                    x: [0, 20 - i * 10, 0],
                  }}
                  transition={{
                    duration: 4 + i * 0.5,
                    repeat: Infinity,
                    delay: i * 0.5,
                    ease: "easeInOut",
                  }}
                  className="fixed z-[-1]"
                  style={{
                    left: `${20 + i * 15}%`,
                    top: "20%",
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor: "rgba(255, 255, 255, 0.8)",
                    filter: "blur(1px)",
                  }}
                />
              ))}
            </>
          )}
        </>
      )}

      {/* TIER 2: JUNGLE SAFARI */}
      {tier === "tier2" && (
        <>
          {/* Day: Sun and vines */}
          {!isNightMode && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.7 }}
                transition={{ delay: 0.3 }}
                className="fixed top-16 right-12 z-[-1]"
              >
                <Sun className="w-28 h-28 text-yellow-300 drop-shadow-lg" />
              </motion.div>

              {/* Foliage elements */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                transition={{ delay: 0.4 }}
                className="fixed top-0 left-0 z-[-1]"
              >
                <Leaf className="w-32 h-32 text-green-600 drop-shadow-lg" />
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                transition={{ delay: 0.5 }}
                className="fixed bottom-20 right-10 z-[-1]"
              >
                <Leaf className="w-24 h-24 text-emerald-500 drop-shadow-lg" />
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                transition={{ delay: 0.6 }}
                className="fixed top-1/3 right-0 z-[-1]"
              >
                <Leaf className="w-28 h-28 text-emerald-600/70" />
              </motion.div>
            </>
          )}

          {/* Night: Moon and fireflies */}
          {isNightMode && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                transition={{ delay: 0.3 }}
                className="fixed top-20 right-20 z-[-1]"
              >
                <div className="w-24 h-24 rounded-full bg-slate-300/70 shadow-lg shadow-slate-400/30" />
              </motion.div>

              {/* Dark foliage at night */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                transition={{ delay: 0.4 }}
                className="fixed top-0 left-0 z-[-1]"
              >
                <Leaf className="w-32 h-32 text-emerald-900" />
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.3 }}
                transition={{ delay: 0.5 }}
                className="fixed bottom-20 right-10 z-[-1]"
              >
                <Leaf className="w-24 h-24 text-emerald-950" />
              </motion.div>
            </>
          )}

          {/* Flame/torch element (represents wildlife) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: isNightMode ? 0.6 : 0.4 }}
            transition={{ delay: 0.2 }}
            className="fixed bottom-10 left-8 z-[-1]"
          >
            <Flame className={`w-10 h-10 ${isNightMode ? "text-orange-400" : "text-orange-500"}`} />
          </motion.div>

          {/* Flying butterfly/bird animation across screen */}
          <motion.div
            initial={{ opacity: 0, x: "-100%", y: "30%" }}
            animate={{
              opacity: [0, 0.8, 0.8, 0],
              x: ["calc(-50% - 100vw)", "calc(-50% + 100vw)"],
              y: ["30%", "20%", "35%", "25%"],
            }}
            transition={{
              duration: 18,
              repeat: Infinity,
              delay: 0,
              ease: "easeInOut",
            }}
            className="fixed z-[-1] pointer-events-none"
          >
            <div className="text-3xl">🦋</div>
          </motion.div>

          {/* Second butterfly with different timing */}
          <motion.div
            initial={{ opacity: 0, x: "100%", y: "60%" }}
            animate={{
              opacity: [0, 0.7, 0.7, 0],
              x: ["100vw", "-100vw"],
              y: ["60%", "50%", "65%", "55%"],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              delay: 10,
              ease: "easeInOut",
            }}
            className="fixed z-[-1] pointer-events-none"
          >
            <div className="text-2xl">🦋</div>
          </motion.div>
        </>
      )}

      {/* TIER 3: SPACE STATION */}
      {tier === "tier3" && (
        <>
          {/* Stars (always visible but more prominent at night) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: isNightMode ? 0.8 : 0.3 }}
            transition={{ delay: 0.2 }}
            className="fixed top-10 right-20 z-[-1]"
          >
            <Star className="w-6 h-6 text-yellow-300 fill-yellow-300" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: isNightMode ? 0.7 : 0.2 }}
            transition={{ delay: 0.25 }}
            className="fixed top-32 left-16 z-[-1]"
          >
            <Star className="w-8 h-8 text-cyan-300 fill-cyan-300" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: isNightMode ? 0.6 : 0.2 }}
            transition={{ delay: 0.3 }}
            className="fixed bottom-32 right-12 z-[-1]"
          >
            <Star className="w-5 h-5 text-purple-300 fill-purple-300" />
          </motion.div>

          {/* Sparkles (glowing neon effects) */}
          {isNightMode && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.4, 0.8, 0.4] }}
                transition={{ delay: 0.4, duration: 3, repeat: Infinity }}
                className="fixed top-1/4 left-1/4 z-[-1]"
              >
                <Sparkles className="w-8 h-8 text-cyan-300" />
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.5, 0.9, 0.5] }}
                transition={{ delay: 1, duration: 3, repeat: Infinity }}
                className="fixed top-2/3 right-1/4 z-[-1]"
              >
                <Sparkles className="w-6 h-6 text-purple-300" />
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.3, 0.7, 0.3] }}
                transition={{ delay: 2, duration: 4, repeat: Infinity }}
                className="fixed bottom-1/3 left-10 z-[-1]"
              >
                <Sparkles className="w-7 h-7 text-pink-300" />
              </motion.div>
            </>
          )}

          {/* Sun for day mode */}
          {!isNightMode && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              transition={{ delay: 0.3 }}
              className="fixed top-12 right-16 z-[-1]"
            >
              <Sun className="w-28 h-28 text-yellow-200 drop-shadow-lg" />
            </motion.div>
          )}

          {/* Planets (visual elements) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            transition={{ delay: 0.35 }}
            className="fixed bottom-20 right-20 z-[-1]"
          >
            <div className="w-16 h-16 rounded-full bg-orange-400/60 shadow-lg shadow-orange-400/40" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            transition={{ delay: 0.4 }}
            className="fixed top-1/3 left-12 z-[-1]"
          >
            <div className="w-12 h-12 rounded-full bg-blue-400/50 shadow-lg shadow-blue-400/30" />
          </motion.div>

          {/* Drifting stars with parallax effect (slow) */}
          <motion.div
            initial={{ opacity: 0, x: -100, y: -100 }}
            animate={{
              opacity: [0.3, 0.7, 0.3],
              x: [-100, 100, -100],
              y: [-100, 50, -100],
            }}
            transition={{
              duration: 25,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="fixed top-1/4 right-20 z-[-1]"
          >
            <Star className="w-8 h-8 text-white/80 fill-white/80" />
          </motion.div>

          {/* Another drifting star */}
          <motion.div
            initial={{ opacity: 0, x: 100, y: 100 }}
            animate={{
              opacity: [0.2, 0.6, 0.2],
              x: [100, -100, 100],
              y: [100, -50, 100],
            }}
            transition={{
              duration: 30,
              repeat: Infinity,
              delay: 5,
              ease: "easeInOut",
            }}
            className="fixed bottom-1/3 left-20 z-[-1]"
          >
            <Star className="w-6 h-6 text-cyan-200/70 fill-cyan-200/70" />
          </motion.div>

          {/* Astronaut bobbing in zero gravity */}
          <motion.div
            initial={{ opacity: 0, y: 0 }}
            animate={{
              opacity: [0.5, 0.8, 0.5],
              y: [0, -15, 0],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="fixed bottom-20 left-1/3 z-[-1]"
          >
            <div className="text-5xl">🧑‍🚀</div>
          </motion.div>

          {/* Floating debris/satellite (slow rotation) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{
              opacity: [0.4, 0.7, 0.4],
              rotate: 360,
              y: [0, 20, 0],
            }}
            transition={{
              duration: 10,
              rotate: {
                duration: 12,
                repeat: Infinity,
                ease: "linear",
              },
              opacity: { duration: 3, repeat: Infinity },
              y: { duration: 5, repeat: Infinity },
            }}
            className="fixed top-1/2 right-10 z-[-1]"
          >
            <div className="w-6 h-6 border-2 border-cyan-300/60 rounded-lg" />
          </motion.div>
        </>
      )}
    </>
  );
}
