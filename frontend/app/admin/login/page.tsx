"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, Shield } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type LoginStep = "code" | "signup" | "login";

const inputStyle = {
  width: '100%',
  padding: '15px 18px',
  fontSize: 16,
  backgroundColor: '#f8f9fc',
  border: '1px solid #e4e7f2',
  borderRadius: 12,
  color: '#0f1729',
  outline: 'none',
  textAlign: 'center' as const,
};

const labelStyle = {
  display: 'block',
  fontSize: 14,
  fontWeight: 600,
  color: '#374151',
  marginBottom: 8,
  textAlign: 'center' as const,
};

export default function AdminLoginPage() {
  const router = useRouter();

  const [inviteCode, setInviteCode] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState<LoginStep>("code");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
      const response = await fetch(`${API_BASE}/admin/validate-invite-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: inviteCode }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Invalid invite code");
      }

      const data = await response.json();
      setEmail(data.email);
      setStep("signup");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
      const response = await fetch(`${API_BASE}/admin/teachers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          full_name: fullName,
          password,
          invite_code: inviteCode,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Failed to create account");
      }

      const signInResponse = await supabase.auth.signInWithPassword({ email, password });
      if (signInResponse.error) throw new Error(signInResponse.error.message);

      router.push("/admin/dashboard/staff");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const signInResponse = await supabase.auth.signInWithPassword({ email, password });
      if (signInResponse.error) throw new Error(signInResponse.error.message);
      router.push("/admin/dashboard/staff");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const stepTitles: Record<LoginStep, { heading: string; sub: string }> = {
    code: { heading: "Enter invite code", sub: "Use the code provided by your administrator." },
    signup: { heading: "Create your account", sub: `Setting up account for ${email}` },
    login: { heading: "Welcome back", sub: "Enter your credentials to access the admin dashboard." },
  };

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
        {/* Logo */}
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
              ADMIN PORTAL
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, backgroundColor: '#eaecf4', marginBottom: 32 }} />

        {/* Step indicator */}
        <div className="flex justify-center gap-2 mb-6">
          {(['code', 'signup', 'login'] as LoginStep[]).map((s, _i) => (
            <div
              key={s}
              style={{
                width: step === s ? 24 : 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: step === s ? '#4361ee' : '#e4e7f2',
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </div>

        {/* Heading */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield size={20} color="#4361ee" strokeWidth={1.8} />
            <span style={{ fontSize: 13, color: '#4361ee', fontWeight: 700, letterSpacing: '0.05em' }}>
              {step === 'code' ? 'INVITE CODE' : step === 'signup' ? 'NEW ACCOUNT' : 'SIGN IN'}
            </span>
          </div>
          <h2
            className="font-extrabold"
            style={{ fontSize: 28, color: '#0f1729', letterSpacing: '-0.02em', lineHeight: 1.2 }}
          >
            {stepTitles[step].heading}
          </h2>
          <p className="mt-2" style={{ fontSize: 15, color: '#8896b8' }}>
            {stepTitles[step].sub}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div
            className="flex items-start gap-3 rounded-xl px-4 py-3 mb-5"
            style={{ backgroundColor: '#fff1f1', border: '1px solid #fecaca', color: '#dc2626', fontSize: 14 }}
          >
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Step 1: Invite Code */}
        {step === "code" && (
          <form onSubmit={handleCodeSubmit} className="space-y-5">
            <div>
              <label style={labelStyle}>Admin Invite Code</label>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="XXXX-XXXX-XXXX"
                style={inputStyle}
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className={`w-full text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all duration-200 ${
                loading ? '' : 'hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(67,97,238,0.50)] active:translate-y-0 active:shadow-[0_2px_8px_rgba(67,97,238,0.30)]'
              }`}
              style={{
                padding: '16px 24px',
                fontSize: 17,
                marginTop: 8,
                background: loading ? '#a5b4fc' : 'linear-gradient(135deg, #4361ee 0%, #5a7cf5 100%)',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(67,97,238,0.40)',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              {loading ? "Verifying…" : "Continue"}
            </button>
            <p className="text-center mt-4" style={{ fontSize: 14, color: '#8896b8' }}>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => { setError(""); setStep("login"); }}
                className="font-semibold"
                style={{ color: '#4361ee', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Sign in
              </button>
            </p>
          </form>
        )}

        {/* Step 2: Signup */}
        {step === "signup" && (
          <form onSubmit={handleSignup} className="space-y-5">
            <div>
              <label style={labelStyle}>Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                style={inputStyle}
                required
              />
            </div>
            <div>
              <label style={labelStyle}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••"
                style={inputStyle}
                required
              />
            </div>
            <div>
              <label style={labelStyle}>Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••"
                style={inputStyle}
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className={`w-full text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all duration-200 ${
                loading ? '' : 'hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(67,97,238,0.50)] active:translate-y-0 active:shadow-[0_2px_8px_rgba(67,97,238,0.30)]'
              }`}
              style={{
                padding: '16px 24px',
                fontSize: 17,
                marginTop: 8,
                background: loading ? '#a5b4fc' : 'linear-gradient(135deg, #4361ee 0%, #5a7cf5 100%)',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(67,97,238,0.40)',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              {loading ? "Creating account…" : "Create Admin Account"}
            </button>
            <p className="text-center mt-4" style={{ fontSize: 14, color: '#8896b8' }}>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => { setError(""); setStep("login"); }}
                className="font-semibold"
                style={{ color: '#4361ee', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Sign in
              </button>
            </p>
          </form>
        )}

        {/* Step 3: Login */}
        {step === "login" && (
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label style={labelStyle}>Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@school.edu"
                style={inputStyle}
                required
              />
            </div>
            <div>
              <label style={labelStyle}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••"
                style={inputStyle}
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className={`w-full text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all duration-200 ${
                loading ? '' : 'hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(67,97,238,0.50)] active:translate-y-0 active:shadow-[0_2px_8px_rgba(67,97,238,0.30)]'
              }`}
              style={{
                padding: '16px 24px',
                fontSize: 17,
                marginTop: 8,
                background: loading ? '#a5b4fc' : 'linear-gradient(135deg, #4361ee 0%, #5a7cf5 100%)',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(67,97,238,0.40)',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              {loading ? "Signing in…" : "Sign in"}
            </button>
            <p className="text-center mt-4" style={{ fontSize: 14, color: '#8896b8' }}>
              New admin?{" "}
              <button
                type="button"
                onClick={() => { setError(""); setStep("code"); }}
                className="font-semibold"
                style={{ color: '#4361ee', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Enter invite code
              </button>
            </p>
          </form>
        )}
        {/* Back to Home — inside card, visually prominent */}
        <div className="mt-8 pt-6" style={{ borderTop: '1px solid #eaecf4' }}>
          <a
            href="/"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-sm transition-all duration-200"
            style={{
              color: '#4361ee',
              backgroundColor: '#eef2ff',
              border: '1px solid #c7d2fe',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#e0e7ff';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(67,97,238,0.15)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#eef2ff';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <span style={{ fontSize: 16 }}>🏠</span>
            Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}
