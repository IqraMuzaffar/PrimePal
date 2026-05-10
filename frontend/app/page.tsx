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

const pillarData = [
  { icon: BookOpen, label: "Reading", desc: "Stories & comprehension" },
  { icon: PenLine, label: "Writing", desc: "Spelling & grammar" },
  { icon: Mic, label: "Listening", desc: "Audio comprehension" },
  { icon: Mic, label: "Speaking", desc: "Pronunciation practice" },
];

export default function LandingPage() {
  return (
    <div
      className="min-h-screen relative overflow-x-hidden overflow-y-auto flex flex-col selection:bg-white/20"
      style={{ background: "linear-gradient(145deg, #0b1535 0%, #0f1e4a 45%, #162660 100%)" }}
    >
      {/* ── ambient background ── */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute top-[15%] left-[20%] w-[28rem] h-[28rem] rounded-full blur-[100px]"
          style={{ background: "radial-gradient(circle, rgba(67,97,238,0.15) 0%, transparent 70%)" }}
        />
        <div
          className="absolute bottom-[10%] right-[15%] w-[34rem] h-[34rem] rounded-full blur-[120px]"
          style={{ background: "radial-gradient(circle, rgba(124,158,255,0.1) 0%, transparent 70%)" }}
        />
        <div
          className="absolute top-[50%] left-[50%] w-[20rem] h-[20rem] rounded-full blur-[80px] -translate-x-1/2"
          style={{ background: "radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)" }}
        />
      </div>

      {/* ── floating emoji ── */}
      <FloatingEmojis items={floatingItems} />

      {/* ── nav bar ── */}
      <nav className="flex items-center justify-between px-6 sm:px-10 py-4 relative z-10">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 flex items-center justify-center text-white font-extrabold rounded-[10px] text-base"
            style={{
              background: "linear-gradient(135deg, #4361ee 0%, #7c9eff 100%)",
              boxShadow: "0 4px 16px rgba(67,97,238,0.4)",
            }}
          >
            P
          </div>
          <span className="text-white font-extrabold text-xl" style={{ letterSpacing: "-0.01em" }}>
            PrimePal
          </span>
        </div>
        <div />
        {/* Admin moved to role cards below */}
      </nav>

      {/* ── main content (centered on desktop, scrollable on mobile) ── */}
      <div className="flex-1 flex flex-col items-center sm:justify-center px-4 py-6 relative z-10">
        {/* ── hero ── */}
        <AnimatedHeroSection>
          {/* badge */}
          <AnimatedHeroItem className="flex items-center justify-center mb-3 sm:mb-5">
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full"
              style={{
                background: "rgba(67,97,238,0.15)",
                border: "1px solid rgba(67,97,238,0.25)",
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: "#4361ee" }}
              />
              <span
                className="text-xs font-bold"
                style={{ color: "#93c5fd", letterSpacing: "0.08em" }}
              >
                AI-POWERED ESL PLATFORM
              </span>
            </div>
          </AnimatedHeroItem>

          {/* title */}
          <AnimatedHeroH1
            className="font-extrabold text-white text-center leading-[0.95]"
            style={{ fontSize: "clamp(48px, 8vw, 80px)", letterSpacing: "-0.03em" }}
          >
            Learn English
            <br />
            the{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #60a5fa, #a78bfa, #f472b6)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Fun Way
            </span>
          </AnimatedHeroH1>

          {/* subtitle */}
          <AnimatedHeroP
            className="font-semibold text-center mt-3 sm:mt-4 mx-auto"
            style={{
              fontSize: "clamp(16px, 2.2vw, 20px)",
              color: "rgba(255,255,255,0.6)",
              maxWidth: "640px",
              lineHeight: 1.6,
            }}
          >
            AI-powered English learning for Pakistani primary classrooms &mdash; fun
            missions for students, smart insights for teachers
          </AnimatedHeroP>
        </AnimatedHeroSection>

        {/* ── pillar cards ── */}
        <AnimatedHeroItem className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-6 sm:mb-10 relative z-10 w-full" style={{ maxWidth: "720px" }}>
          {pillarData.map(({ label, desc }, i) => {
            const emojis: Record<string, string> = { Reading: "📖", Writing: "✏️", Listening: "🎧", Speaking: "🎤" };
            const glows: Record<string, string> = {
              Reading: "rgba(59,130,246,0.25)", Writing: "rgba(16,185,129,0.25)",
              Listening: "rgba(245,158,11,0.25)", Speaking: "rgba(244,63,94,0.25)",
            };
            return (
              <div
                key={label}
                className="flex flex-col items-center gap-2 px-4 py-4 rounded-2xl transition-all duration-300 hover:-translate-y-1.5 hover:scale-105 cursor-default"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  boxShadow: `0 8px 24px ${glows[label]}`,
                  animationDelay: `${i * 100}ms`,
                }}
              >
                <span className="text-3xl sm:text-4xl drop-shadow-md" style={{ filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.3))" }}>
                  {emojis[label]}
                </span>
                <span className="text-white text-sm sm:text-base font-extrabold leading-tight">{label}</span>
                <span
                  className="text-[10px] sm:text-xs font-semibold leading-tight text-center"
                  style={{ color: "rgba(255,255,255,0.5)" }}
                >
                  {desc}
                </span>
              </div>
            );
          })}
        </AnimatedHeroItem>

        {/* ── role cards ── */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-5 w-full relative z-10" style={{ maxWidth: "1080px" }}>
          {/* student */}
          <AnimatedCard xOffset={-36} delay={0.5} className="flex-1">
            <Link href="/student/play" className="block group">
              <AnimatedCardInner
                className="relative overflow-hidden"
                style={{
                  background: "linear-gradient(135deg, #f472b6 0%, #db2777 100%)",
                  borderRadius: "24px",
                  padding: "clamp(20px, 4vw, 36px) clamp(20px, 4vw, 32px)",
                  boxShadow: "0 20px 56px rgba(219,39,119,0.35)",
                  border: "2px solid rgba(251,146,191,0.4)",
                }}
              >
                <div className="absolute -right-4 -bottom-4 text-[6rem] opacity-[0.08] leading-none select-none pointer-events-none">
                  🎮
                </div>

                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg">
                    <Gamepad2 size={26} className="text-white" strokeWidth={2.5} />
                  </div>
                  <span className="bg-white/20 text-white text-xs font-extrabold px-4 py-2 rounded-full tracking-wide shadow-md">
                    LET&apos;S PLAY!
                  </span>
                </div>

                <h2 className="font-extrabold text-white mb-2 leading-tight" style={{ fontSize: "28px" }}>
                  I&apos;m a Student
                </h2>
                <p className="font-semibold leading-relaxed mb-5" style={{ fontSize: "15px", color: "rgba(255,255,255,0.8)", lineHeight: 1.6 }}>
                  Enter your class code and start your English adventure with fun missions!
                </p>

                <div
                  className="inline-flex items-center gap-2.5 font-bold text-base px-6 py-3 rounded-2xl backdrop-blur-sm group-hover:bg-white/30 transition-all duration-200 group-hover:gap-3.5"
                  style={{ backgroundColor: "rgba(255,255,255,0.2)", color: "white" }}
                >
                  <span>Enter Class Code</span>
                  <span className="text-xl transition-transform duration-200 group-hover:translate-x-1">→</span>
                </div>
              </AnimatedCardInner>
            </Link>
          </AnimatedCard>

          {/* teacher */}
          <AnimatedCard xOffset={36} delay={0.6} className="flex-1">
            <Link href="/teacher/login" className="block group">
              <AnimatedCardInner
                className="relative overflow-hidden"
                style={{
                  background: "linear-gradient(135deg, #2dd4bf 0%, #0d9488 100%)",
                  borderRadius: "24px",
                  padding: "clamp(20px, 4vw, 36px) clamp(20px, 4vw, 32px)",
                  boxShadow: "0 20px 56px rgba(13,148,136,0.35)",
                  border: "2px solid rgba(94,234,212,0.4)",
                }}
              >
                <div className="absolute -right-4 -bottom-4 text-[6rem] opacity-[0.08] leading-none select-none pointer-events-none">
                  📊
                </div>

                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg">
                    <GraduationCap size={26} className="text-white" strokeWidth={2.5} />
                  </div>
                  <span className="bg-white/20 text-white text-xs font-extrabold px-4 py-2 rounded-full tracking-wide shadow-md">
                    DASHBOARD
                  </span>
                </div>

                <h2 className="font-extrabold text-white mb-2 leading-tight" style={{ fontSize: "28px" }}>
                  I&apos;m a Teacher
                </h2>
                <p className="font-semibold leading-relaxed mb-5" style={{ fontSize: "15px", color: "rgba(255,255,255,0.8)", lineHeight: 1.6 }}>
                  Manage classrooms, track progress, and view AI-powered insights.
                </p>

                <div
                  className="inline-flex items-center gap-2.5 font-bold text-base px-6 py-3 rounded-2xl backdrop-blur-sm group-hover:bg-white/30 transition-all duration-200 group-hover:gap-3.5"
                  style={{ backgroundColor: "rgba(255,255,255,0.2)", color: "white" }}
                >
                  <span>Sign In</span>
                  <span className="text-xl transition-transform duration-200 group-hover:translate-x-1">→</span>
                </div>
              </AnimatedCardInner>
            </Link>
          </AnimatedCard>

          {/* admin */}
          <AnimatedCard xOffset={0} delay={0.7} className="flex-1">
            <Link href="/admin/login" className="block group">
              <AnimatedCardInner
                className="relative overflow-hidden"
                style={{
                  background: "linear-gradient(135deg, #4361ee 0%, #7c3aed 100%)",
                  borderRadius: "24px",
                  padding: "clamp(20px, 4vw, 36px) clamp(20px, 4vw, 32px)",
                  boxShadow: "0 20px 56px rgba(67,97,238,0.35)",
                  border: "2px solid rgba(124,158,255,0.4)",
                }}
              >
                <div className="absolute -right-4 -bottom-4 text-[6rem] opacity-[0.08] leading-none select-none pointer-events-none">
                  🛡️
                </div>

                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg text-2xl">
                    🛡️
                  </div>
                  <span className="bg-white/20 text-white text-xs font-extrabold px-4 py-2 rounded-full tracking-wide shadow-md">
                    ADMIN
                  </span>
                </div>

                <h2 className="font-extrabold text-white mb-2 leading-tight" style={{ fontSize: "28px" }}>
                  I&apos;m an Admin
                </h2>
                <p className="font-semibold leading-relaxed mb-5" style={{ fontSize: "15px", color: "rgba(255,255,255,0.8)", lineHeight: 1.6 }}>
                  Manage the platform, configure curriculum, and oversee schools.
                </p>

                <div
                  className="inline-flex items-center gap-2.5 font-bold text-base px-6 py-3 rounded-2xl backdrop-blur-sm group-hover:bg-white/30 transition-all duration-200 group-hover:gap-3.5"
                  style={{ backgroundColor: "rgba(255,255,255,0.2)", color: "white" }}
                >
                  <span>Admin Panel</span>
                  <span className="text-xl transition-transform duration-200 group-hover:translate-x-1">→</span>
                </div>
              </AnimatedCardInner>
            </Link>
          </AnimatedCard>
        </div>
      </div>

      {/* ── footer ── */}
      <AnimatedFooter
        className="text-xs font-semibold py-4 relative z-10 text-center"
        style={{ color: "rgba(147,197,253,0.3)" }}
      >
        Tackling the &ldquo;Mute English&rdquo; phenomenon &mdash; one classroom at a time
      </AnimatedFooter>
    </div>
  );
}
