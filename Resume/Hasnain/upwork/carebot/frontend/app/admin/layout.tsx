'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isLoggedIn, apiFetch, setToken, clearToken } from '@/lib/api';
import { Sidebar, MobileNav } from '@/components/admin/Sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Stethoscope, LogOut, ShieldCheck } from 'lucide-react';

interface LoginFormState {
  email: string;
  password: string;
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [form, setForm] = useState<LoginFormState>({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setAuthed(isLoggedIn());
    setChecking(false);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await apiFetch('/api/auth/staff/login', {
        method: 'POST',
        body: JSON.stringify({ email: form.email, password: form.password }),
      });
      setToken(data.token);
      setAuthed(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    clearToken();
    setAuthed(false);
    router.push('/admin');
  };

  if (checking) {
    return (
      <div className="admin-dark flex items-center justify-center min-h-screen bg-gray-950">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="size-10 rounded-full border-2 border-teal-500/30 border-t-teal-500 animate-spin" />
          </div>
          <p className="text-sm text-gray-400 animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="admin-dark flex items-center justify-center min-h-screen bg-gray-950 px-4">
        {/* Subtle background glow */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-teal-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] bg-amber-500/5 rounded-full blur-3xl" />
        </div>

        <div className="relative w-full max-w-sm animate-fade-in-up">
          {/* Login card */}
          <div className="bg-gray-800/90 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-lg rounded-2xl p-8">
            {/* Brand header */}
            <div className="flex flex-col items-center gap-3 mb-8">
              <div className="relative">
                <div className="absolute inset-0 bg-teal-500/20 rounded-2xl blur-xl" />
                <div className="relative rounded-2xl bg-teal-500/10 p-3.5">
                  <Stethoscope className="size-8 text-teal-400" />
                </div>
              </div>
              <div className="text-center">
                <h1 className="text-2xl font-heading text-gray-100 tracking-tight">
                  CareBot Admin
                </h1>
                <p className="text-sm text-gray-400 mt-1">
                  Sign in to your dashboard
                </p>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="text-xs font-medium uppercase tracking-wider text-gray-400"
                >
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@carebot.com"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                  required
                  className="bg-white/5 border-white/10 text-gray-100 placeholder:text-gray-400/50 focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500/50 transition-all duration-200 h-11"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="text-xs font-medium uppercase tracking-wider text-gray-400"
                >
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter password"
                  value={form.password}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, password: e.target.value }))
                  }
                  required
                  className="bg-white/5 border-white/10 text-gray-100 placeholder:text-gray-400/50 focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500/50 transition-all duration-200 h-11"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2.5">
                  <div className="size-1.5 rounded-full bg-red-400 shrink-0" />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-11 bg-amber-500 hover:bg-amber-400 text-gray-900 font-semibold rounded-xl shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-all duration-300"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="size-4 rounded-full border-2 border-black/30 border-t-black animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="size-4" />
                    Sign In
                  </span>
                )}
              </Button>
            </form>

            {/* Footer */}
            <div className="mt-6 pt-5 border-t border-white/5 text-center">
              <p className="text-xs text-gray-400/60">
                Protected by CareBot Security
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dark flex min-h-screen bg-gray-950">
      <Sidebar />

      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header bar */}
        <header className="sticky top-0 z-40 flex items-center justify-between px-6 py-3 backdrop-blur-md bg-gray-950/80 border-b border-white/[0.06]">
          <h2 className="text-sm font-medium text-gray-400 md:hidden font-heading">
            CareBot Admin
          </h2>
          <div className="hidden md:block" />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="text-gray-400 hover:text-gray-100 hover:bg-white/5 transition-all duration-200 gap-1.5"
          >
            <LogOut className="size-4" />
            Sign Out
          </Button>
        </header>

        {/* Main content */}
        <main className="flex-1 p-6 pb-20 md:pb-6 overflow-auto">{children}</main>
      </div>

      <MobileNav />
    </div>
  );
}
