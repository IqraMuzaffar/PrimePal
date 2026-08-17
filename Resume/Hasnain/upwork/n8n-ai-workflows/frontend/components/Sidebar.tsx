"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Zap,
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
  { href: "/workflows", label: "Workflows", icon: Activity },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex flex-col justify-between border-r border-slate-800/60 shrink-0 h-screen sticky top-0"
      style={{ width: 230, background: "linear-gradient(180deg, #0a0f1a 0%, #020408 100%)" }}>

      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/25">
          <Zap className="text-white" size={20} />
        </div>
        <div>
          <span className="font-bold text-slate-100 block text-[17px] leading-tight">FlowPilot AI</span>
          <span className="text-emerald-500/60 text-[11px] font-medium">Automation Platform</span>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 h-px bg-gradient-to-r from-transparent via-slate-700/50 to-transparent" />

      {/* Nav — evenly spread */}
      <nav className="flex flex-col justify-evenly flex-1 px-3">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 relative group ${
                isActive
                  ? "bg-gradient-to-r from-emerald-500/15 to-emerald-500/5 text-emerald-400 shadow-sm shadow-emerald-500/10"
                  : "text-slate-500 hover:text-slate-200 hover:bg-slate-800/40"
              }`}>
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-7 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)]" />
              )}
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                isActive ? "bg-emerald-500/20" : "bg-slate-800/50 group-hover:bg-slate-700/50"
              }`}>
                <Icon size={18} className={isActive ? "text-emerald-400" : "group-hover:text-slate-200"} />
              </div>
              <span className="font-semibold text-[15px]">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="mx-4 h-px bg-gradient-to-r from-transparent via-slate-700/50 to-transparent" />

      {/* Footer */}
      <div className="px-5 py-3 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)] animate-pulse" />
        <span className="text-slate-600 text-xs">System Online</span>
        <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-500 font-mono">v1.0</span>
      </div>
    </aside>
  );
}
