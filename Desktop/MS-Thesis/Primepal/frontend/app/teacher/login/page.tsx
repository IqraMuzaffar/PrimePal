"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, GraduationCap } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

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
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{
        background: "linear-gradient(145deg, #0b1535 0%, #0f1e4a 45%, #162660 100%)",
      }}
    >
      {/* Decorative blobs */}
      <div style={{
        position: 'fixed', top: -160, right: -160, width: 500, height: 500,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(67,97,238,0.20) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'fixed', bottom: -120, left: -120, width: 420, height: 420,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(124,158,255,0.14) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Card */}
      <div
        className="w-full relative z-10"
        style={{
          maxWidth: 520,
          backgroundColor: '#ffffff',
          borderRadius: 24,
          padding: '52px 52px 44px',
          boxShadow: '0 32px 80px rgba(0,0,0,0.35), 0 8px 24px rgba(0,0,0,0.2)',
        }}
      >
        {/* Logo — same style as sidebar */}
        <div className="flex flex-col items-center mb-10">
          <div
            className="flex items-center justify-center text-white font-extrabold rounded-2xl mb-4"
            style={{
              width: 60,
              height: 60,
              fontSize: 26,
              background: 'linear-gradient(135deg, #4361ee 0%, #7c9eff 100%)',
              boxShadow: '0 6px 24px rgba(67,97,238,0.5)',
            }}
          >
            P
          </div>
          <div className="text-center">
            <div
              className="font-extrabold tracking-tight"
              style={{ fontSize: 26, color: '#0f1729', letterSpacing: '-0.02em' }}
            >
              PrimePal
            </div>
            <div
              className="font-medium mt-1"
              style={{ fontSize: 13, color: '#9aa8c9', letterSpacing: '0.06em' }}
            >
              TEACHER PORTAL
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, backgroundColor: '#eaecf4', marginBottom: 32 }} />

        {/* Heading */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <GraduationCap size={20} color="#4361ee" strokeWidth={1.8} />
            <span style={{ fontSize: 13, color: '#4361ee', fontWeight: 700, letterSpacing: '0.05em' }}>
              SIGN IN
            </span>
          </div>
          <h2
            className="font-extrabold"
            style={{ fontSize: 30, color: '#0f1729', letterSpacing: '-0.02em', lineHeight: 1.2 }}
          >
            Welcome back
          </h2>
          <p className="mt-2" style={{ fontSize: 15, color: '#8896b8' }}>
            Enter your credentials to access your dashboard.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="block font-semibold mb-2 text-center"
              style={{ fontSize: 14, color: '#374151' }}
            >
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
              className="w-full rounded-xl border focus:outline-none focus:ring-2 transition-all text-center"
              style={{
                padding: '15px 18px',
                fontSize: 16,
                backgroundColor: '#f8f9fc',
                borderColor: '#e4e7f2',
                color: '#0f1729',
              }}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block font-semibold mb-2 text-center"
              style={{ fontSize: 14, color: '#374151' }}
            >
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
              className="w-full rounded-xl border focus:outline-none focus:ring-2 transition-all text-center"
              style={{
                padding: '15px 18px',
                fontSize: 16,
                backgroundColor: '#f8f9fc',
                borderColor: '#e4e7f2',
                color: '#0f1729',
              }}
            />
          </div>

          {error && (
            <div
              className="flex items-start gap-3 rounded-xl px-4 py-3"
              style={{ backgroundColor: '#fff1f1', border: '1px solid #fecaca', color: '#dc2626', fontSize: 14 }}
            >
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
            style={{
              padding: '16px 24px',
              fontSize: 17,
              marginTop: 8,
              background: loading
                ? '#a5b4fc'
                : 'linear-gradient(135deg, #4361ee 0%, #5a7cf5 100%)',
              boxShadow: loading ? 'none' : '0 4px 20px rgba(67,97,238,0.40)',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading && <Loader2 size={18} className="animate-spin" />}
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        {/* Student link */}
        <p className="text-center mt-8" style={{ fontSize: 14, color: '#8896b8' }}>
          Are you a student?{" "}
          <a
            href="/student/play"
            className="font-semibold"
            style={{ color: '#4361ee' }}
          >
            Enter your class code here
          </a>
        </p>

        {/* Back to home */}
        <p className="text-center mt-3" style={{ fontSize: 13, color: '#b0bcd5' }}>
          <a
            href="/"
            className="font-medium hover:underline"
            style={{ color: '#9aa8c9' }}
          >
            ← Back to Home
          </a>
        </p>
      </div>
    </div>
  );
}
