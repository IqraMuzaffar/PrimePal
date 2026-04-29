"use client";

import { motion } from "framer-motion";

export default function AnimatedBackground({
  children,
}: {
  children: React.ReactNode;
}) {
  // Floating geometric shapes with slow, continuous animation
  const floatingShapes = [
    { id: 1, size: "w-72 h-72", color: "bg-indigo-300/20", x: -50, y: 100, duration: 20 },
    { id: 2, size: "w-48 h-48", color: "bg-violet-300/15", x: 80, y: 200, duration: 25 },
    { id: 3, size: "w-96 h-96", color: "bg-purple-300/10", x: -100, y: -50, duration: 30 },
    { id: 4, size: "w-64 h-64", color: "bg-pink-300/15", x: 150, y: -100, duration: 22 },
    { id: 5, size: "w-80 h-80", color: "bg-rose-300/10", x: -20, y: -150, duration: 28 },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated gradient background */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-indigo-400 via-violet-300 to-pink-300"
        animate={{
          backgroundPosition: ["0% 0%", "100% 100%"],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "easeInOut",
        }}
        style={{
          backgroundSize: "200% 200%",
        }}
      />

      {/* Floating geometric shapes */}
      {floatingShapes.map((shape) => (
        <motion.div
          key={shape.id}
          className={`absolute rounded-full ${shape.size} ${shape.color} blur-3xl`}
          animate={{
            y: [shape.y, shape.y + 100, shape.y],
            x: [shape.x, shape.x + 50, shape.x],
          }}
          transition={{
            duration: shape.duration,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut",
          }}
          style={{
            filter: "blur(60px)",
            willChange: "transform",
          }}
        />
      ))}

      {/* Subtle animated grid overlay */}
      <motion.div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "linear-gradient(0deg, rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px)",
          backgroundSize: "50px 50px",
        }}
        animate={{
          backgroundPosition: ["0px 0px", "50px 50px"],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      {/* Content overlay */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
