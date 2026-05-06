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
  "/teacher/reports": "Reports",
  "/teacher/assistant": "AI Assistant",
};

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setEmail(session?.user?.email ?? null);
    });
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/teacher/login");
  }

  // Get page title from pathname
  const pageTitle = PAGE_TITLES[pathname] || pathname.split('/').pop() || 'Teacher';

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
        <main className="flex-1 overflow-auto" style={{ backgroundColor: '#f0f2f8' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
