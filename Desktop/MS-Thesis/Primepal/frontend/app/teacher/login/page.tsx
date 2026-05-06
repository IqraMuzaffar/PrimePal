"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  AlertCircle,
  BookOpen,
  Users,
  BarChart2,
  Sparkles,
  CheckCircle2,
  GraduationCap,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";

const FEATURES = [
  {
    icon: Users,
    title: "Classroom Management",
    desc: "Manage students, classrooms, and grade-level topics in one place.",
  },
  {
    icon: BarChart2,
    title: "Performance Analytics",
    desc: "Track student accuracy across reading, writing, listening & speaking.",
  },
  {
    icon: Sparkles,
    title: "AI-Powered Lessons",
    desc: "Generate personalised missions and teaching plans instantly.",
  },
];

const STATS = [
  { value: "6", label: "Grade Levels" },
  { value: "4", label: "Skill Pillars" },
  { value: "AI", label: "Powered" },
];

export default function TeacherLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = e.currentTarget;
    const emailVal = (form.elements.namedItem("email") as HTMLInputElement).value;
    const passwordVal = (form.elements.namedItem("password") as HTMLInputElement).value;

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: emailVal,
      password: passwordVal,
    });

    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    router.push("/teacher/dashboard");
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden">

      {/* ── Left Panel ── */}
      <div
        className="hidden lg:flex flex-col justify-between w-[58%] h-full relative overflow-hidden"
        style={{
          background: "linear-gradient(145deg, #0b1535 0%, #0f1e4a 40%, #162660 100%)",
        }}
      >
        {/* Background decorative circles */}
        <div style={{
          position: 'absolute', top: -120, right: -120,
          width: 420, height: 420, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(67,97,238,0.18) 0%, transparent 70%)',
        }} />
        <div style={{
          position: 'absolute', bottom: -80, left: -80,
          width: 360, height: 360, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124,158,255,0.12) 0%, transparent 70%)',
        }} />
        <div style={{
          position: 'absolute', top: '40%', left: '60%',
          width: 180, height: 180, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(67,97,238,0.10) 0%, transparent 70%)',
        }} />

        {/* Top: Brand */}
        <div className="relative z-10 p-12">
          <div className="flex items-center gap-3 mb-16">
            <div
              className="flex items-center justify-center rounded-2xl text-white font-extrabold"
              style={{
                width: 48, height: 48, fontSize: 20,
                background: 'linear-gradient(135deg, #4361ee 0%, #7c9eff 100%)',
                boxShadow: '0 6px 20px rgba(67,97,238,0.45)',
              }}
            >
              P
            </div>
            <div>
              <div className="text-white font-bold text-xl tracking-tight">PrimePal</div>
              <div style={{ fontSize: 12, color: '#5a7ab8', letterSpacing: '0.06em' }}>TEACHER PORTAL</div>
            </div>
          </div>

          <h1
            className="text-white font-extrabold leading-tight mb-4"
            style={{ fontSize: 42, letterSpacing: '-0.02em', maxWidth: 480 }}
          >
            Empowering Teachers,<br />
            <span style={{ color: '#7c9eff' }}>Inspiring Students</span>
          </h1>
          <p style={{ color: '#6b85b8', fontSize: 16, maxWidth: 420, lineHeight: 1.7 }}>
            Pakistan&apos;s AI-powered ESL platform for primary education. Manage classrooms,
            track performance, and generate personalised lessons effortlessly.
          </p>
        </div>

        {/* Middle: Feature list */}
        <div className="relative z-10 px-12 space-y-5">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-4">
              <div
                className="flex items-center justify-center shrink-0 rounded-xl"
                style={{
                  width: 42, height: 42,
                  backgroundColor: 'rgba(67,97,238,0.18)',
                  border: '1px solid rgba(67,97,238,0.3)',
                }}
              >
                <Icon size={18} color="#7c9eff" strokeWidth={1.8} />
              </div>
              <div>
                <div className="text-white font-semibold" style={{ fontSize: 15 }}>{title}</div>
                <div style={{ color: '#5a7ab8', fontSize: 13, marginTop: 2, lineHeight: 1.5 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom: Stat cards */}
        <div className="relative z-10 p-12">
          <div className="flex gap-4">
            {STATS.map(({ value, label }) => (
              <div
                key={label}
                className="flex-1 rounded-2xl text-center"
                style={{
                  padding: '16px 12px',
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <div className="text-white font-extrabold" style={{ fontSize: 28, color: '#7c9eff' }}>
                  {value}
                </div>
                <div style={{ color: '#4a6080', fontSize: 12, marginTop: 2, fontWeight: 500 }}>
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right Panel ── */}
      <div
        className="flex-1 flex flex-col items-center justify-center h-full overflow-y-auto px-8"
        style={{ backgroundColor: '#ffffff' }}
      >
        <div className="w-full max-w-sm">

          {/* Mobile logo (hidden on large screens) */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div
              className="flex items-center justify-center rounded-2xl text-white font-extrabold"
              style={{
                width: 44, height: 44, fontSize: 18,
                background: 'linear-gradient(135deg, #4361ee 0%, #7c9eff 100%)',
              }}
            >
              P
            </div>
            <div>
              <div className="font-bold text-lg text-gray-900">PrimePal</div>
              <div className="text-xs text-gray-400">Teacher Portal</div>
            </div>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <GraduationCap size={22} color="#4361ee" strokeWidth={1.8} />
              <span
                className="font-semibold"
                style={{ fontSize: 13, color: '#4361ee', letterSpacing: '0.04em' }}
              >
                TEACHER SIGN IN
              </span>
            </div>
            <h2 className="font-extrabold text-gray-900" style={{ fontSize: 32, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              Welcome back
            </h2>
            <p className="text-gray-400 mt-2" style={{ fontSize: 15 }}>
              Sign in to your teacher account to continue.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block font-semibold text-gray-700 mb-2" style={{ fontSize: 14 }}>
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@school.edu"
                className="w-full rounded-xl border border-gray-200 text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                style={{
                  padding: '14px 16px',
                  fontSize: 15,
                  backgroundColor: '#f8f9fc',
                  // @ts-ignore
                  '--tw-ring-color': '#4361ee',
                }}
              />
            </div>

            <div>
              <label htmlFor="password" className="block font-semibold text-gray-700 mb-2" style={{ fontSize: 14 }}>
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••"
                className="w-full rounded-xl border border-gray-200 text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                style={{
                  padding: '14px 16px',
                  fontSize: 15,
                  backgroundColor: '#f8f9fc',
                }}
              />
            </div>

            {error && (
              <div className="flex items-start gap-3 rounded-xl px-4 py-3 text-sm"
                style={{ backgroundColor: '#fff1f1', border: '1px solid #fecaca', color: '#dc2626' }}>
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
              style={{
                padding: '15px 24px',
                fontSize: 16,
                background: loading ? '#a5b4fc' : 'linear-gradient(135deg, #4361ee 0%, #5a7cf5 100%)',
                boxShadow: loading ? 'none' : '0 4px 18px rgba(67,97,238,0.35)',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          {/* Trust badges */}
          <div className="flex items-center gap-4 mt-8">
            {["Secure login", "AI-powered", "SNC aligned"].map((badge) => (
              <div key={badge} className="flex items-center gap-1.5">
                <CheckCircle2 size={13} color="#4361ee" />
                <span style={{ fontSize: 12, color: '#9aa8c9', fontWeight: 500 }}>{badge}</span>
              </div>
            ))}
          </div>

          {/* Student link */}
          <div
            className="mt-10 rounded-2xl flex items-center gap-3"
            style={{
              padding: '14px 18px',
              backgroundColor: '#f4f5fb',
              border: '1px solid #e4e7f2',
            }}
          >
            <BookOpen size={18} color="#4361ee" strokeWidth={1.8} className="shrink-0" />
            <p style={{ fontSize: 13, color: '#6b7fa8' }}>
              Are you a student?{" "}
              <a
                href="/student/play"
                className="font-semibold"
                style={{ color: '#4361ee' }}
              >
                Enter your class code here
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
