"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Workflow,
  LayoutDashboard,
  Mail,
  FileText,
  Users,
  Activity,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/emails", label: "Emails", icon: Mail },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/workflows", label: "Workflow Runs", icon: Activity },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="flex flex-col border-r border-slate-800 shrink-0"
      style={{ width: 240, minHeight: "100vh", background: "#020408" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-slate-800">
        <Workflow className="text-emerald-400 shrink-0" size={22} />
        <span
          className="font-semibold text-slate-100 leading-tight"
          style={{ fontSize: 20 }}
        >
          n8n AI Workflows
        </span>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1 px-3 py-4 flex-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 border-l-2 ${
                isActive
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500"
                  : "text-slate-500 border-transparent hover:text-slate-300 hover:bg-slate-800/50"
              }`}
              style={{ fontSize: 17 }}
            >
              <Icon size={18} className="shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-slate-800">
        <p className="text-slate-600 text-xs">Powered by n8n + OpenAI</p>
      </div>
    </aside>
  );
}
