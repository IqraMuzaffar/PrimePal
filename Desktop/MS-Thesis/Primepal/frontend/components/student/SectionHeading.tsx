"use client";

import Link from "next/link";

type BadgeTone = "pink" | "amber" | "blue" | "violet" | "emerald";

const TONE_CLASS: Record<BadgeTone, string> = {
  pink:    "bg-gradient-to-br from-pink-200 to-pink-300",
  amber:   "bg-gradient-to-br from-amber-200 to-amber-300",
  blue:    "bg-gradient-to-br from-blue-200 to-blue-300",
  violet:  "bg-gradient-to-br from-violet-200 to-violet-300",
  emerald: "bg-gradient-to-br from-emerald-200 to-emerald-300",
};

interface SectionHeadingProps {
  icon: string;
  title: string;
  tone?: BadgeTone;
  rightHref?: string;
  rightLabel?: string;
}

export default function SectionHeading({
  icon,
  title,
  tone = "pink",
  rightHref,
  rightLabel,
}: SectionHeadingProps) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div
        className={[
          "w-10 h-10 sm:w-11 sm:h-11 rounded-2xl",
          "flex items-center justify-center text-xl sm:text-2xl",
          "shadow-[0_4px_12px_rgba(0,0,0,0.08)]",
          TONE_CLASS[tone],
        ].join(" ")}
      >
        {icon}
      </div>
      <h2 className="font-baloo font-extrabold text-base sm:text-lg lg:text-xl tracking-[0.15em] text-slate-900 uppercase">
        {title}
      </h2>
      <div className="flex-1 h-[2px] bg-gradient-to-r from-slate-200 to-transparent" />
      {rightHref && rightLabel && (
        <Link
          href={rightHref}
          className="font-baloo font-extrabold text-sm sm:text-base text-violet-500 hover:text-violet-700 transition-colors shrink-0"
        >
          {rightLabel}
        </Link>
      )}
    </div>
  );
}
