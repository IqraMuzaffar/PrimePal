// frontend/app/admin/layout.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { isCurrentUserAdmin } from "@/lib/adminAuth";
import {
  ClipboardCheck,
  Users,
  Network,
  GraduationCap,
  BookOpen,
  Download,
  Tags,
} from "lucide-react";
import { Sidebar, TopBar } from "@/components/teacher/design-system";

const ADMIN_NAV_LINKS = [
  { href: "/admin/dashboard", label: "Evaluations", icon: ClipboardCheck },
  { href: "/admin/dashboard/staff", label: "Staff", icon: Users },
  { href: "/admin/dashboard/hierarchy", label: "Hierarchy", icon: Network },
  { href: "/admin/dashboard/students", label: "Students", icon: GraduationCap },
  { href: "/admin/dashboard/topics", label: "Topics", icon: Tags },
  { href: "/admin/dashboard/curriculum", label: "Curriculum", icon: BookOpen },
  { href: "/admin/dashboard/export", label: "Export", icon: Download },
];

const PAGE_TITLES: Record<string, string> = {
  "/admin/dashboard": "Evaluations",
  "/admin/dashboard/staff": "Staff Management",
  "/admin/dashboard/hierarchy": "Hierarchy",
  "/admin/dashboard/students": "Students",
  "/admin/dashboard/topics": "Topic Management",
  "/admin/dashboard/curriculum": "Curriculum",
  "/admin/dashboard/export": "Export Data",
};

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

  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    if (isLoginPage) {
      setLoading(false);
      return;
    }

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
        console.warn("[AdminLayout] User is not admin, redirecting. Session user:", session.user?.email);
        router.push("/admin/login");
        return;
      }

      setAdminName(session.user?.email || "Admin");
      setAuthenticated(true);
      setLoading(false);
    };

    checkAuth();
  }, [router, isLoginPage, pathname]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!authenticated) {
    return null;
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/admin/login");
  }

  const pageTitle = PAGE_TITLES[pathname] || 'Admin';

  return (
    <div className="flex h-screen">
      <Sidebar
        navItems={ADMIN_NAV_LINKS}
        userEmail={adminName}
        userRole="Administrator"
        onLogout={handleLogout}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar pageTitle={pageTitle} userEmail={adminName} />
        <main className="flex-1 overflow-auto" style={{ backgroundColor: '#0e1525' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
