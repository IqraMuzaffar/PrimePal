"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { isCurrentUserAdmin } from "@/lib/adminAuth";
import Link from "next/link";
import { LogOut, Menu, X } from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [adminName, setAdminName] = useState("");
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/admin/login");
        return;
      }

      const isAdmin = await isCurrentUserAdmin();
      if (!isAdmin) {
        await supabase.auth.signOut();
        router.push("/admin/login");
        return;
      }

      setAdminName(session.user?.email || "Admin");
      setAuthenticated(true);
      setLoading(false);
    };

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!authenticated) {
    return null;
  }

  const isActive = (path: string) => pathname.includes(path);

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-4 flex items-center justify-between gap-4">
          {/* Mobile menu toggle */}
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="lg:hidden text-white hover:bg-slate-700 p-2 rounded-lg transition-colors"
          >
            {showMobileMenu ? <X size={20} /> : <Menu size={20} />}
          </button>

          <h1 className="text-xl lg:text-2xl font-bold text-white">PrimePal Admin</h1>
          <div className="flex items-center gap-2 lg:gap-4">
            <span className="hidden sm:inline text-sm text-gray-300">{adminName}</span>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.push("/admin/login");
              }}
              className="flex items-center gap-2 px-3 lg:px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-white transition"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation (desktop) */}
      <div className="hidden lg:block bg-slate-800 border-b border-slate-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-8 text-white">
            <Link
              href="/admin/dashboard/staff"
              className={`px-4 py-3 border-b-2 transition text-sm font-medium ${
                isActive("/staff")
                  ? "border-indigo-500 text-white"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              Staff Directory
            </Link>
            <Link
              href="/admin/dashboard/hierarchy"
              className={`px-4 py-3 border-b-2 transition text-sm font-medium ${
                isActive("/hierarchy")
                  ? "border-indigo-500 text-white"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              School Hierarchy
            </Link>
            <Link
              href="/admin/dashboard/students"
              className={`px-4 py-3 border-b-2 transition text-sm font-medium ${
                isActive("/students")
                  ? "border-indigo-500 text-white"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              Students
            </Link>
            <Link
              href="/admin/dashboard/curriculum"
              className={`px-4 py-3 border-b-2 transition text-sm font-medium ${
                isActive("/curriculum")
                  ? "border-indigo-500 text-white"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              Global Curriculum
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {showMobileMenu && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 z-40 lg:hidden"
            onClick={() => setShowMobileMenu(false)}
          />

          {/* Drawer */}
          <nav className="fixed top-16 left-0 right-0 bg-slate-800 border-b border-slate-700 z-50 lg:hidden">
            <div className="flex flex-col p-2 space-y-1">
              <Link
                href="/admin/dashboard/staff"
                onClick={() => setShowMobileMenu(false)}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition ${
                  isActive("/staff")
                    ? "bg-indigo-600 text-white"
                    : "text-gray-300 hover:text-white hover:bg-slate-700"
                }`}
              >
                Staff Directory
              </Link>
              <Link
                href="/admin/dashboard/hierarchy"
                onClick={() => setShowMobileMenu(false)}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition ${
                  isActive("/hierarchy")
                    ? "bg-indigo-600 text-white"
                    : "text-gray-300 hover:text-white hover:bg-slate-700"
                }`}
              >
                School Hierarchy
              </Link>
              <Link
                href="/admin/dashboard/students"
                onClick={() => setShowMobileMenu(false)}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition ${
                  isActive("/students")
                    ? "bg-indigo-600 text-white"
                    : "text-gray-300 hover:text-white hover:bg-slate-700"
                }`}
              >
                Students
              </Link>
              <Link
                href="/admin/dashboard/curriculum"
                onClick={() => setShowMobileMenu(false)}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition ${
                  isActive("/curriculum")
                    ? "bg-indigo-600 text-white"
                    : "text-gray-300 hover:text-white hover:bg-slate-700"
                }`}
              >
                Global Curriculum
              </Link>
            </div>
          </nav>
        </>
      )}

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6 lg:py-8">
        {children}
      </div>
    </div>
  );
}
