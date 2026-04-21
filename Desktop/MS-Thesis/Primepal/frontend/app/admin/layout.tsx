"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { isCurrentUserAdmin } from "@/lib/adminAuth";
import Link from "next/link";
import { LogOut } from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [adminName, setAdminName] = useState("");

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

  const currentPath = typeof window !== "undefined" ? window.location.pathname : "";

  const isActive = (path: string) => currentPath.includes(path);

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">PrimePal Admin</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-300">{adminName}</span>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.push("/admin/login");
              }}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-white transition"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-slate-800 border-b border-slate-700 sticky top-0 z-40">
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

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {children}
      </div>
    </div>
  );
}
