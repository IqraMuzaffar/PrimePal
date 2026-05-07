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
    <div className="h-screen relative overflow-hidden flex flex-col items-center justify-center px-4 selection:bg-white/20" style={{ background: 'linear-gradient(145deg, #0b1535 0%, #0f1e4a 45%, #162660 100%)' }}>
      {/* ── ambient background ── */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-[15%] left-[20%] w-[28rem] h-[28rem] rounded-full blur-[100px]" style={{ background: 'radial-gradient(circle, rgba(67,97,238,0.15) 0%, transparent 70%)' }} />
        <div className="absolute bottom-[10%] right-[15%] w-[34rem] h-[34rem] rounded-full blur-[120px]" style={{ background: 'radial-gradient(circle, rgba(124,158,255,0.1) 0%, transparent 70%)' }} />
        {/* Third blob hidden to reduce visual clutter - preserved for potential future use */}
        <div className="absolute top-[60%] left-[55%] w-[20rem] h-[20rem] rounded-full blur-[80px]" style={{ display: 'none' }} />
      </div>

      {/* ── floating emoji ── */}
      <FloatingEmojis items={floatingItems} />

      {/* ── hero ── */}
      <AnimatedHeroSection>
        <AnimatedHeroItem className="inline-flex items-center justify-center backdrop-blur-md rounded-3xl mb-6 border-2 border-white/30" style={{ width: '120px', height: '120px', background: 'linear-gradient(135deg, #4361ee 0%, #7c9eff 100%)', boxShadow: '0 12px 48px rgba(67,97,238,0.6)' }}>
          <span className="text-7xl leading-none">⭐</span>
        </AnimatedHeroItem>

        <AnimatedHeroH1 className="font-black text-white tracking-tight leading-none" style={{ fontSize: '96px', letterSpacing: '-0.02em' }}>
          PrimePal
        </AnimatedHeroH1>

        <AnimatedHeroP className="text-white font-semibold mt-4" style={{ fontSize: '20px' }}>
          Learn English the fun way!
        </AnimatedHeroP>

        <AnimatedHeroItem className="flex items-center justify-center gap-4 mt-4">
          {pillars.map(({ icon: Icon, label }) => (
            <span
              key={label}
              className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-white"
              style={{ opacity: 0.8 }}
            >
              <Icon size={14} strokeWidth={2.5} />
              {label}
            </span>
          ))}
        </AnimatedHeroItem>
      </AnimatedHeroSection>

      {/* ── role cards ── */}
      <div className="flex flex-col sm:flex-row gap-5 sm:gap-6 w-full relative z-10" style={{ maxWidth: '800px' }}>
        {/* student */}
        <AnimatedCard xOffset={-36} delay={0.5} className="flex-1">
          <Link href="/student/play" className="block group">
            <AnimatedCardInner className="relative bg-gradient-to-br from-amber-400 to-orange-500 overflow-hidden" style={{ maxWidth: '400px', borderRadius: '80px', padding: '48px 40px', boxShadow: '0 24px 72px rgba(234,88,12,0.4)', border: '3px solid rgba(252,211,77,0.5)' }}>
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

              <h2 className="font-black text-white mb-1.5 leading-tight" style={{ fontSize: '28px' }}>
                I&apos;m a Student
              </h2>
              <p className="font-medium leading-relaxed" style={{ color: 'rgba(254,243,199,0.9)', fontSize: '15px' }}>
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
            <AnimatedCardInner className="relative bg-gradient-to-br from-green-500 to-emerald-600 overflow-hidden" style={{ maxWidth: '400px', borderRadius: '80px', padding: '48px 40px', boxShadow: '0 24px 72px rgba(5,150,105,0.4)', border: '3px solid rgba(110,231,183,0.5)' }}>
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

              <h2 className="font-black text-white mb-1.5 leading-tight" style={{ fontSize: '28px' }}>
                I&apos;m a Teacher
              </h2>
              <p className="font-medium leading-relaxed" style={{ color: 'rgba(209,250,229,0.9)', fontSize: '15px' }}>
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
      <AnimatedFooter className="text-xs font-medium mt-8 relative z-10 text-center" style={{ color: 'rgba(147,197,253,0.4)' }}>
        AI-powered English learning for Pakistan&apos;s future &mdash; tackling the
        &ldquo;Mute English&rdquo; phenomenon
      </AnimatedFooter>

      <p className="text-xs font-medium mt-3 relative z-10 text-center" style={{ color: 'rgba(147,197,253,0.5)' }}>
        Are you an admin?{" "}
        <Link
          href="/admin/login"
          className="font-semibold"
          style={{ color: '#93c5fd', borderBottom: '1px solid rgba(147,197,253,0.5)', textDecoration: 'none' }}
        >
          Sign in here
        </Link>
      </p>
    </div>
  );
}
