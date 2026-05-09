// frontend/app/teacher/layout.tsx

"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  School,
  GraduationCap,
  Zap,
  BookOpen,
  BookMarked,
  BarChart2,
  FileBarChart,
  Sparkles,
} from "lucide-react";
import { Sidebar, TopBar } from "@/components/teacher/design-system";
import { supabase } from "@/lib/supabase/client";

const NAV_LINKS = [
  { href: "/teacher/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/teacher/classroom", label: "Classrooms", icon: School },
  { href: "/teacher/students", label: "Students", icon: GraduationCap },
  { href: "/teacher/missions", label: "Missions", icon: Zap },
  { href: "/teacher/curriculum", label: "Curriculum Hub", icon: BookOpen },
  { href: "/teacher/topics", label: "Topics", icon: BookMarked },
  { href: "/teacher/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/teacher/reports", label: "Reports", icon: FileBarChart },
  { href: "/teacher/assistant", label: "AI Assistant", icon: Sparkles },
];

const PAGE_TITLES: Record<string, string> = {
  "/teacher/dashboard": "Dashboard",
  "/teacher/classroom": "Classrooms",
  "/teacher/students": "Students",
  "/teacher/missions": "Missions",
  "/teacher/curriculum": "Curriculum Hub",
  "/teacher/topics": "Topics",
  "/teacher/analytics": "Analytics",
  "/teacher/reports": "Reports",
  "/teacher/assistant": "AI Assistant",
};

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(() => {
    // Sync read from Supabase's local storage cache to avoid flash
    if (typeof window !== "undefined") {
      try {
        const key = Object.keys(localStorage).find(k => k.startsWith("sb-") && k.endsWith("-auth-token"));
        if (key) {
          const data = JSON.parse(localStorage.getItem(key) || "{}");
          return data?.user?.email ?? null;
        }
      } catch { /* ignore */ }
    }
    return null;
  });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/teacher/login");
  }

  // Skip layout shell for login page
  if (pathname === '/teacher/login') {
    return <>{children}</>;
  }

  // Get page title from pathname
  const matchedTitle = Object.entries(PAGE_TITLES).find(([key]) => pathname.startsWith(key))?.[1];
  const pageTitle = matchedTitle || 'Teacher';

  return (
    <div className="flex h-screen">
      <Sidebar
        navItems={NAV_LINKS}
        userEmail={email || undefined}
        userRole="Teacher"
        onLogout={handleLogout}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar pageTitle={pageTitle} userEmail={email || undefined} />
        <main className="flex-1 overflow-auto" style={{ backgroundColor: '#f0f2f8', backgroundImage: 'radial-gradient(circle at 20% 0%, rgba(67,97,238,0.04) 0%, transparent 60%)' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
