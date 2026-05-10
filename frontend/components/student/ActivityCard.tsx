"use client";

import Link from "next/link";

type Tone = "purple" | "pink" | "amber" | "cyan" | "emerald" | "blue" | "rose";

const TONE_CLASS: Record<Tone, string> = {
  purple:  "bg-card-purple",
  pink:    "bg-card-pink",
  amber:   "bg-card-amber",
  cyan:    "bg-card-cyan",
  emerald: "bg-card-emerald",
  blue:    "bg-card-blue",
  rose:    "bg-card-rose",
};

interface ActivityCardProps {
  href: string;
  icon: string;
  title: string;
  subtitle?: string;
  tone: Tone;
  wide?: boolean;
  badge?: string;
  delayClass?: string;
}

export default function ActivityCard({
  href,
  icon,
  title,
  subtitle,
  tone,
  wide = false,
  badge,
  delayClass,
}: ActivityCardProps) {
  return (
    <Link
      href={href}
      className={[
        "group relative overflow-hidden rounded-3xl p-7",
        "min-h-[170px] flex flex-col justify-between text-white",
        "transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
        "hover:-translate-y-1.5 hover:rotate-[-0.3deg] hover:shadow-[0_24px_48px_rgba(0,0,0,0.18)]",
        "shadow-[0_12px_24px_rgba(15,23,42,0.10)]",
        "animate-slideUp",
        delayClass ?? "",
        wide ? "lg:col-span-2" : "",
        TONE_CLASS[tone],
      ].join(" ")}
    >
      <span
        className="pointer-events-none absolute -right-10 -top-10 w-44 h-44 rounded-full bg-white/[0.18] transition-transform duration-300 ease-out group-hover:scale-[1.4]"
        aria-hidden="true"
      />

      {badge && (
        <span className="absolute top-4 right-4 z-10 bg-white text-pink-700 font-baloo font-extrabold text-xs px-3 py-1 rounded-lg animate-pulse2">
          {badge}
        </span>
      )}

      <span
        className="relative z-10 text-5xl sm:text-6xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-[-8deg]"
        style={{ filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.18))" }}
      >
        {icon}
      </span>

      <div className="relative z-10">
        <p className="font-baloo font-extrabold text-2xl sm:text-[26px] leading-tight">
          {title}
        </p>
        {subtitle && (
          <p className="font-nunito font-semibold text-sm sm:text-base opacity-90 mt-1">
            {subtitle}
          </p>
        )}
      </div>
    </Link>
  );
}
