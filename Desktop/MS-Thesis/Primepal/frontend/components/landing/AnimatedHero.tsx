"use client";

import { motion } from "framer-motion";

// ── types ──────────────────────────────────────────────────────────────────

interface FloatingItem {
  emoji: string;
  x: string;
  y: string;
  delay: number;
  dur: number;
}

interface AnimatedCardProps {
  /** slide-in direction: -36 for left, +36 for right */
  xOffset: number;
  delay: number;
  children: React.ReactNode;
  className?: string;
}

// ── stagger variants (shared with page.tsx data) ───────────────────────────

const stagger = {
  container: {
    animate: { transition: { staggerChildren: 0.12 } },
  },
  item: {
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
  },
} as const satisfies Record<string, import("framer-motion").Variants>;

// ── FloatingEmojis ─────────────────────────────────────────────────────────

export function FloatingEmojis({ items }: { items: FloatingItem[] }) {
  return (
    <>
      {items.map((f, i) => (
        <motion.span
          key={i}
          aria-hidden
          className="absolute text-2xl sm:text-3xl opacity-[0.15] pointer-events-none select-none"
          style={{ left: f.x, top: f.y }}
          animate={{ y: [-8, 8, -8], rotate: [-4, 4, -4] }}
          transition={{
            duration: f.dur,
            repeat: Infinity,
            delay: f.delay,
            ease: "easeInOut",
          }}
        >
          {f.emoji}
        </motion.span>
      ))}
    </>
  );
}

// ── AnimatedHeroSection ────────────────────────────────────────────────────
// Wraps the hero text block with the stagger container variant.

export function AnimatedHeroSection({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={stagger.container}
      initial="initial"
      animate="animate"
      className="text-center mb-8 relative z-10 max-w-lg"
    >
      {children}
    </motion.div>
  );
}

// ── AnimatedHeroItem ───────────────────────────────────────────────────────
// Each direct child inside AnimatedHeroSection uses this to pick up the
// stagger.item variant automatically.

export function AnimatedHeroItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div variants={stagger.item} className={className}>
      {children}
    </motion.div>
  );
}

// ── AnimatedHeroH1 ─────────────────────────────────────────────────────────

export function AnimatedHeroH1({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.h1 variants={stagger.item} className={className}>
      {children}
    </motion.h1>
  );
}

// ── AnimatedHeroP ──────────────────────────────────────────────────────────

export function AnimatedHeroP({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.p variants={stagger.item} className={className}>
      {children}
    </motion.p>
  );
}

// ── AnimatedCard ───────────────────────────────────────────────────────────
// Outer slide-in wrapper for a role card (student / teacher).

export function AnimatedCard({ xOffset, delay, children, className }: AnimatedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: xOffset }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.55, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── AnimatedCardInner ──────────────────────────────────────────────────────
// The inner card surface that responds to hover / tap.

export function AnimatedCardInner({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.03, y: -5 }}
      whileTap={{ scale: 0.97 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── AnimatedFooter ─────────────────────────────────────────────────────────

export function AnimatedFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.p
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.2, duration: 0.6 }}
      className={className}
    >
      {children}
    </motion.p>
  );
}
