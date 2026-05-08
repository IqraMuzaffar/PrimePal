"use client";

import { ReactNode } from "react";

type Pill = {
  icon?: string;
  label: string;
  variant?: "white" | "amber";
};

interface PageHeroProps {
  label?: string;
  name: string;
  waveEmoji?: string;
  subtitle?: string;
  pills?: Pill[];
  mascot?: string;
  className?: string;
  rightSlot?: ReactNode;
}

export default function PageHero({
  label,
  name,
  waveEmoji,
  subtitle,
  pills,
  mascot,
  className,
  rightSlot,
}: PageHeroProps) {
  return (
    <div
      className={[
        "relative overflow-hidden rounded-3xl",
        "bg-student-hero",
        "px-6 sm:px-10 py-8 sm:py-10",
        "min-h-[180px] sm:min-h-[220px]",
        "flex items-center justify-between gap-6",
        "shadow-[0_12px_40px_rgba(168,85,247,0.10)]",
        "animate-slideUp",
        className ?? "",
      ].join(" ")}
    >
      {/* Glow blobs */}
      <div
        className="pointer-events-none absolute -right-12 -top-12 w-60 h-60 rounded-full animate-pulseSoft"
        style={{
          background:
            "radial-gradient(circle, rgba(251,191,36,1) 0%, rgba(251,191,36,0) 70%)",
        }}
      />
      <div
        className="pointer-events-none absolute right-20 -bottom-12 w-36 h-36 rounded-full opacity-50 animate-pulseSoftReverse"
        style={{
          background:
            "radial-gradient(circle, rgba(167,139,250,1) 0%, rgba(167,139,250,0) 70%)",
        }}
      />

      <div className="relative z-10 min-w-0">
        {label && (
          <p className="font-baloo font-extrabold text-xs sm:text-sm tracking-[0.2em] text-pink-900/70">
            {label}
          </p>
        )}
        <h1 className="font-baloo font-extrabold text-4xl sm:text-5xl lg:text-6xl text-slate-900 leading-[1.05] mt-2 tracking-tight">
          {name}
          {waveEmoji && (
            <span className="inline-block ml-2 origin-[70%_70%] animate-wave">
              {waveEmoji}
            </span>
          )}
        </h1>
        {subtitle && (
          <p className="font-nunito font-semibold text-sm sm:text-base text-slate-500 mt-2">
            {subtitle}
          </p>
        )}
        {pills && pills.length > 0 && (
          <div className="flex flex-wrap gap-2.5 mt-5">
            {pills.map((p, i) => (
              <span
                key={i}
                className={[
                  "rounded-full px-4 py-2 font-baloo font-extrabold text-sm sm:text-base flex items-center gap-1.5 shadow-[0_4px_12px_rgba(0,0,0,0.06)]",
                  p.variant === "amber"
                    ? "bg-gradient-to-br from-amber-400 to-amber-500 text-white"
                    : "bg-white text-pink-900",
                ].join(" ")}
              >
                {p.icon && <span>{p.icon}</span>}
                <span>{p.label}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {rightSlot ? (
        <div className="relative z-10 shrink-0">{rightSlot}</div>
      ) : mascot ? (
        <div
          className="relative z-10 shrink-0 text-7xl sm:text-8xl lg:text-9xl animate-floatBig"
          style={{ filter: "drop-shadow(0 14px 22px rgba(168,85,247,0.25))" }}
        >
          {mascot}
        </div>
      ) : null}
    </div>
  );
}
