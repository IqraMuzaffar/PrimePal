import {
  GraduationCap,
  Gamepad2,
  BookOpen,
  Mic,
  PenLine,
} from "lucide-react";
import Link from "next/link";
import {
  FloatingEmojis,
  AnimatedHeroSection,
  AnimatedHeroItem,
  AnimatedHeroH1,
  AnimatedHeroP,
  AnimatedCard,
  AnimatedCardInner,
  AnimatedFooter,
} from "@/components/landing/AnimatedHero";

const floatingItems = [
  { emoji: "📚", x: "8%", y: "18%", delay: 0, dur: 6 },
  { emoji: "⭐", x: "88%", y: "14%", delay: 1.2, dur: 5.5 },
  { emoji: "🎯", x: "12%", y: "78%", delay: 2, dur: 7 },
  { emoji: "💬", x: "82%", y: "72%", delay: 0.6, dur: 6.2 },
  { emoji: "✏️", x: "52%", y: "8%", delay: 1.8, dur: 5.8 },
  { emoji: "🌟", x: "92%", y: "48%", delay: 2.8, dur: 6.5 },
  { emoji: "🎮", x: "4%", y: "48%", delay: 0.3, dur: 7.2 },
  { emoji: "📖", x: "72%", y: "88%", delay: 1.5, dur: 6.8 },
  { emoji: "🇵🇰", x: "35%", y: "85%", delay: 3.2, dur: 5.2 },
];

const pillars = [
  { icon: BookOpen, label: "Reading" },
  { icon: PenLine, label: "Writing" },
  { icon: Mic, label: "Speaking" },
];

export default function LandingPage() {
  return (
    <div className="h-screen bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 relative overflow-hidden flex flex-col items-center justify-center px-4 selection:bg-white/20">
      {/* ── ambient background ── */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-[15%] left-[20%] w-[28rem] h-[28rem] bg-indigo-400/15 rounded-full blur-[100px]" />
        <div className="absolute bottom-[10%] right-[15%] w-[34rem] h-[34rem] bg-violet-400/15 rounded-full blur-[120px]" />
        <div className="absolute top-[60%] left-[55%] w-[20rem] h-[20rem] bg-fuchsia-400/10 rounded-full blur-[80px]" />
      </div>

      {/* ── floating emoji ── */}
      <FloatingEmojis items={floatingItems} />

      {/* ── hero ── */}
      <AnimatedHeroSection>
        <AnimatedHeroItem className="inline-flex items-center justify-center w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl mb-4 border border-white/20 shadow-lg shadow-black/10">
          <span className="text-3xl leading-none">⭐</span>
        </AnimatedHeroItem>

        <AnimatedHeroH1 className="text-5xl sm:text-7xl font-black text-white tracking-tight leading-none">
          PrimePal
        </AnimatedHeroH1>

        <AnimatedHeroP className="text-indigo-200 text-lg sm:text-xl font-semibold mt-4">
          Learn English the fun way!
        </AnimatedHeroP>

        <AnimatedHeroItem className="flex items-center justify-center gap-4 mt-4">
          {pillars.map(({ icon: Icon, label }) => (
            <span
              key={label}
              className="flex items-center gap-1.5 text-indigo-300/70 text-xs font-bold uppercase tracking-wider"
            >
              <Icon size={14} strokeWidth={2.5} />
              {label}
            </span>
          ))}
        </AnimatedHeroItem>
      </AnimatedHeroSection>

      {/* ── role cards ── */}
      <div className="flex flex-col sm:flex-row gap-5 sm:gap-6 w-full max-w-2xl relative z-10">
        {/* student */}
        <AnimatedCard xOffset={-36} delay={0.5} className="flex-1">
          <Link href="/student/play" className="block group">
            <AnimatedCardInner className="relative bg-gradient-to-br from-amber-400 to-orange-500 rounded-[1.5rem] p-6 sm:p-7 shadow-2xl shadow-orange-600/20 border border-amber-300/30 overflow-hidden">
              <div className="absolute -right-6 -bottom-6 text-[8rem] opacity-[0.08] leading-none select-none pointer-events-none">
                🎮
              </div>

              <div className="flex items-center gap-3 mb-5">
                <div className="bg-white/20 backdrop-blur-sm p-2.5 rounded-xl">
                  <Gamepad2 size={28} className="text-white" strokeWidth={2.5} />
                </div>
                <span className="bg-white/20 text-white text-[0.65rem] font-extrabold px-3 py-1 rounded-full uppercase tracking-wide">
                  Let&apos;s Play!
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-white mb-1.5 leading-tight">
                I&apos;m a Student
              </h2>
              <p className="text-amber-100/90 text-sm font-medium leading-relaxed">
                Enter your class code and start your English adventure with fun missions and games!
              </p>

              <div className="mt-6 flex items-center gap-2 text-white font-bold text-sm group-hover:gap-3 transition-all duration-200">
                <span>Enter Class Code</span>
                <span className="text-base transition-transform duration-200 group-hover:translate-x-0.5">→</span>
              </div>
            </AnimatedCardInner>
          </Link>
        </AnimatedCard>

        {/* teacher */}
        <AnimatedCard xOffset={36} delay={0.6} className="flex-1">
          <Link href="/teacher/login" className="block group">
            <AnimatedCardInner className="relative bg-gradient-to-br from-emerald-500 to-teal-600 rounded-[1.5rem] p-6 sm:p-7 shadow-2xl shadow-teal-600/20 border border-emerald-400/30 overflow-hidden">
              <div className="absolute -right-6 -bottom-6 text-[8rem] opacity-[0.08] leading-none select-none pointer-events-none">
                📊
              </div>

              <div className="flex items-center gap-3 mb-5">
                <div className="bg-white/20 backdrop-blur-sm p-2.5 rounded-xl">
                  <GraduationCap size={28} className="text-white" strokeWidth={2.5} />
                </div>
                <span className="bg-white/20 text-white text-[0.65rem] font-extrabold px-3 py-1 rounded-full uppercase tracking-wide">
                  Dashboard
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-white mb-1.5 leading-tight">
                I&apos;m a Teacher
              </h2>
              <p className="text-emerald-100/90 text-sm font-medium leading-relaxed">
                Manage classrooms, track student progress, and view AI-powered insights across all four skills.
              </p>

              <div className="mt-6 flex items-center gap-2 text-white font-bold text-sm group-hover:gap-3 transition-all duration-200">
                <span>Sign In</span>
                <span className="text-base transition-transform duration-200 group-hover:translate-x-0.5">→</span>
              </div>
            </AnimatedCardInner>
          </Link>
        </AnimatedCard>
      </div>

      {/* ── footer tagline ── */}
      <AnimatedFooter className="text-indigo-300/40 text-xs font-medium mt-8 relative z-10 text-center">
        AI-powered English learning for Pakistan&apos;s future &mdash; tackling the
        &ldquo;Mute English&rdquo; phenomenon
      </AnimatedFooter>
    </div>
  );
}
