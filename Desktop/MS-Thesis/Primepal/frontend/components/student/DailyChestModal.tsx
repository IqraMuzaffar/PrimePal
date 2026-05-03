"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface DailyChestModalProps {
  isOpen: boolean;
  onRewardClaimed: (reward: {
    reward_type: string;
    amount: number;
    new_total: number;
    message: string;
  }) => void;
  reward?: {
    reward_type: string;
    amount: number;
    new_total: number;
    message: string;
  };
  isClaiming?: boolean;
}

export default function DailyChestModal({
  isOpen,
  onRewardClaimed,
  reward,
  isClaiming = false,
}: DailyChestModalProps) {
  const [tapCount, setTapCount] = useState(0);
  const [isShaking, setIsShaking] = useState(false);
  const [showReward, setShowReward] = useState(false);
  const confettiRef = useRef<HTMLDivElement>(null);

  const isChestOpened = tapCount >= 3;

  // Trigger confetti explosion on tap 3
  const triggerConfetti = async () => {
    const confetti = (await import("canvas-confetti")).default;

    // Multi-stage confetti burst
    const duration = 2000;
    const animationEnd = Date.now() + duration;

    // Stage 1: Initial burst from center
    confetti({
      particleCount: 60,
      angle: 90,
      spread: 180,
      origin: { x: 0.5, y: 0.4 },
      gravity: 0.8,
      ticks: 200,
      decay: 0.96,
      colors: ["#FFD700", "#FFA500", "#FF69B4", "#00CED1", "#9370DB"],
    });

    // Stage 2: Left side burst (delayed 100ms)
    setTimeout(() => {
      confetti({
        particleCount: 40,
        angle: 60,
        spread: 100,
        origin: { x: 0.2, y: 0.3 },
        gravity: 0.8,
        ticks: 180,
        decay: 0.95,
        colors: ["#FFD700", "#FF69B4", "#9370DB"],
      });
    }, 100);

    // Stage 3: Right side burst (delayed 200ms)
    setTimeout(() => {
      confetti({
        particleCount: 40,
        angle: 120,
        spread: 100,
        origin: { x: 0.8, y: 0.3 },
        gravity: 0.8,
        ticks: 180,
        decay: 0.95,
        colors: ["#FFD700", "#00CED1", "#9370DB"],
      });
    }, 200);

    // Stage 4: Continuous smaller bursts for 1 second
    let _burstCount = 0;
    const burstInterval = setInterval(() => {
      if (Date.now() > animationEnd - 1000) {
        clearInterval(burstInterval);
        return;
      }

      confetti({
        particleCount: 15,
        angle: 90 + Math.random() * 60 - 30,
        spread: 60,
        origin: { x: 0.5 + (Math.random() - 0.5) * 0.2, y: 0.4 },
        gravity: 0.6,
        ticks: 100,
        decay: 0.94,
        colors: ["#FFD700", "#FFA500"],
      });

      _burstCount++;
    }, 150);
  };

  useEffect(() => {
    if (isChestOpened && showReward && confettiRef.current) {
      triggerConfetti();
    }
  }, [isChestOpened, showReward]);

  if (!isOpen || !reward) return null;

  const handleChestTap = () => {
    if (isChestOpened || isClaiming) return;

    const newTapCount = tapCount + 1;
    setTapCount(newTapCount);

    // Trigger shake
    if (newTapCount < 3) {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 400);
    } else {
      // Third tap: reveal
      setShowReward(true);
      setTimeout(() => {
        onRewardClaimed(reward);
      }, 1500);
    }
  };

  const getRewardEmoji = () => {
    if (reward.reward_type === "multiplier_2x") return "🚀";
    return "⭐";
  };

  const getTapProgress = () => {
    return Math.min((tapCount / 3) * 100, 100);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm"
            onClick={() => {
              /* Prevent closing by clicking backdrop */
            }}
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="w-full max-w-md">
              {/* Title */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-center mb-8"
              >
                <h1 className="text-4xl font-black text-white drop-shadow-lg">
                  Daily Chest! 🎁
                </h1>
                <p className="text-white/80 mt-2">Tap the chest 3 times to unlock your reward</p>
              </motion.div>

              {/* Chest Container */}
              <motion.div
                className="flex justify-center mb-8"
                animate={isShaking ? {
                  x: [-10, 10, -10, 10, 0],
                  rotateZ: [-3, 3, -3, 3, 0]
                } : {}}
                transition={{
                  duration: 0.4,
                  ease: "easeInOut",
                }}
              >
                {/* Closed Chest */}
                {!isChestOpened && (
                  <motion.button
                    onClick={handleChestTap}
                    disabled={isChestOpened || isClaiming}
                    className="relative focus:outline-none disabled:cursor-not-allowed"
                    animate={!isChestOpened ? {
                      scale: [1, 1.05, 1],
                      y: [0, -8, 0]
                    } : {}}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    whileHover={!isChestOpened ? { scale: 1.15, y: -12 } : {}}
                    whileTap={!isChestOpened ? { scale: 0.9, y: 5 } : {}}
                  >
                    <motion.div className="text-8xl drop-shadow-lg filter drop-shadow-[0_0_20px_rgba(255,215,0,0.4)]">
                      {isChestOpened ? "📂" : "📦"}
                    </motion.div>

                    {/* Tap indicator particles */}
                    {!isChestOpened && (
                      <>
                        {[0, 1, 2].map((i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, scale: 0 }}
                            animate={
                              tapCount > i
                                ? { opacity: [1, 0], scale: [1, 1.5], y: [-20, -40] }
                                : {}
                            }
                            transition={{ duration: 0.6 }}
                            className="absolute top-0 left-0 text-2xl pointer-events-none"
                            style={{
                              left: `${Math.cos((i * 2 * Math.PI) / 3) * 30}px`,
                              top: `${Math.sin((i * 2 * Math.PI) / 3) * 30}px`,
                            }}
                          >
                            ✨
                          </motion.div>
                        ))}
                      </>
                    )}
                  </motion.button>
                )}

                {/* Open Chest with Reward */}
                {isChestOpened && (
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", damping: 10, stiffness: 100 }}
                    className="relative"
                  >
                    <div className="text-8xl drop-shadow-lg">📂</div>

                    {/* Reward animation */}
                    {showReward && (
                      <motion.div
                        initial={{ y: 0, opacity: 0, scale: 0, rotate: 0 }}
                        animate={{
                          y: -80,
                          opacity: [1, 1, 0],
                          scale: [1, 1.2, 0.8],
                          rotate: 360
                        }}
                        transition={{
                          type: "spring",
                          damping: 6,
                          stiffness: 100,
                          duration: 2
                        }}
                        className="absolute top-0 left-1/2 -translate-x-1/2"
                      >
                        <motion.div
                          className="text-6xl drop-shadow-lg filter drop-shadow-[0_0_30px_rgba(255,215,0,0.8)]"
                          animate={{
                            scale: [1, 1.3, 1],
                            filter: [
                              "drop-shadow(0 0 20px rgba(255,215,0,0.6))",
                              "drop-shadow(0 0 40px rgba(255,215,0,1))",
                              "drop-shadow(0 0 20px rgba(255,215,0,0.6))"
                            ]
                          }}
                          transition={{
                            duration: 0.6,
                            repeat: Infinity
                          }}
                        >
                          {getRewardEmoji()}
                        </motion.div>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </motion.div>

              {/* Tap Progress Indicator */}
              {!isChestOpened && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mb-6"
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-white/60 text-sm font-medium">Taps</span>
                    <span className="text-white font-bold text-sm">{tapCount} / 3</span>
                  </div>
                  <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-indigo-400 to-purple-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${getTapProgress()}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </motion.div>
              )}

              {/* Reward Message */}
              {isChestOpened && showReward && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="text-center space-y-3"
                >
                  <h2 className="text-3xl font-black text-white drop-shadow-lg">
                    {reward.message}
                  </h2>

                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: 0.7, type: "spring", damping: 10 }}
                    className="bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/30 shadow-[0_0_30px_rgba(255,215,0,0.3)]"
                  >
                    <p className="text-white/80 text-sm">Total Stars</p>
                    <motion.p
                      className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-500"
                      animate={{
                        scale: [1, 1.1, 1],
                        textShadow: [
                          "0 0 20px rgba(255,215,0,0.4)",
                          "0 0 40px rgba(255,215,0,0.8)",
                          "0 0 20px rgba(255,215,0,0.4)"
                        ]
                      }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        repeatType: "reverse"
                      }}
                    >
                      ⭐ {reward.new_total}
                    </motion.p>
                  </motion.div>

                  {/* Collect Button */}
                  <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1 }}
                    onClick={() => onRewardClaimed(reward)}
                    disabled={isClaiming}
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    {isClaiming ? "Collecting..." : "Collect Reward!"}
                  </motion.button>
                </motion.div>
              )}

              {/* Instructions */}
              {!isChestOpened && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-center text-white/60 text-sm"
                >
                  {tapCount === 0 && "Ready? Tap the chest!"}
                  {tapCount === 1 && "2 more taps..."}
                  {tapCount === 2 && "One more tap!"}
                </motion.p>
              )}
            </div>
          </motion.div>

          {/* Confetti container */}
          {isChestOpened && showReward && (
            <div
              ref={confettiRef}
              className="fixed inset-0 z-[45] pointer-events-none"
              id="confetti-container"
            />
          )}
        </>
      )}
    </AnimatePresence>
  );
}
