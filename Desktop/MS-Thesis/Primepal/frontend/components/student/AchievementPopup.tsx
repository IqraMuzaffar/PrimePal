"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface AchievementPopupProps {
  name: string;
  icon: string;
  tier: "bronze" | "silver" | "gold";
  onDismiss?: () => void;
}

const TIER_COLORS: Record<string, { bg: string; border: string; glow: string; text: string }> = {
  bronze: {
    bg: "bg-gradient-to-br from-amber-100 to-orange-100",
    border: "border-[#CD7F32]",
    glow: "shadow-[0_0_30px_rgba(205,127,50,0.5)]",
    text: "text-[#CD7F32]",
  },
  silver: {
    bg: "bg-gradient-to-br from-slate-100 to-gray-200",
    border: "border-[#C0C0C0]",
    glow: "shadow-[0_0_30px_rgba(192,192,192,0.6)]",
    text: "text-[#808080]",
  },
  gold: {
    bg: "bg-gradient-to-br from-yellow-100 to-amber-200",
    border: "border-[#FFD700]",
    glow: "shadow-[0_0_30px_rgba(255,215,0,0.6)]",
    text: "text-[#B8860B]",
  },
};

export default function AchievementPopup({ name, icon, tier, onDismiss }: AchievementPopupProps) {
  const [visible, setVisible] = useState(true);
  const colors = TIER_COLORS[tier] || TIER_COLORS.bronze;

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss?.(), 300);
    }, 3000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className={[
              "pointer-events-auto flex flex-col items-center gap-3 px-8 py-6 rounded-3xl border-4",
              colors.bg,
              colors.border,
              colors.glow,
            ].join(" ")}
            initial={{ scale: 0.3, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.5, opacity: 0, y: -20 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 15,
            }}
            onClick={() => {
              setVisible(false);
              setTimeout(() => onDismiss?.(), 100);
            }}
          >
            <p className="text-xs font-extrabold uppercase tracking-widest text-slate-500">
              Achievement Unlocked!
            </p>
            <span className="text-5xl">{icon}</span>
            <p className="text-lg font-extrabold text-slate-800 text-center">{name}</p>
            <span
              className={[
                "text-xs font-extrabold uppercase px-3 py-1 rounded-full",
                colors.text,
                tier === "gold" ? "bg-yellow-200" : tier === "silver" ? "bg-slate-200" : "bg-orange-200",
              ].join(" ")}
            >
              {tier}
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
