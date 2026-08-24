'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Calendar,
  Users,
  FlaskConical,
  Pill,
  UserCog,
  HelpCircle,
  ClipboardList,
  Stethoscope,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Appointments', href: '/admin/appointments', icon: Calendar },
  { label: 'Patients', href: '/admin/patients', icon: Users },
  { label: 'Labs', href: '/admin/labs', icon: FlaskConical },
  { label: 'Prescriptions', href: '/admin/prescriptions', icon: Pill },
  { label: 'Doctors', href: '/admin/doctors', icon: UserCog },
  { label: 'FAQs', href: '/admin/faqs', icon: HelpCircle },
  { label: 'Audit Log', href: '/admin/audit', icon: ClipboardList },
];

export function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  return (
    <aside className="hidden md:flex flex-col w-60 min-h-screen bg-black/40 backdrop-blur-xl border-r border-white/[0.06]">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-white/[0.06]">
        <div className="rounded-xl bg-teal-500/10 p-1.5">
          <Stethoscope className="size-5 text-teal-400" />
        </div>
        <span className="text-lg font-heading text-gray-100 tracking-tight">
          CareBot
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                active
                  ? 'bg-teal-500/10 text-teal-400 border-l-2 border-teal-500'
                  : 'text-gray-400 hover:text-amber-400 hover:bg-white/[0.03] border-l-2 border-transparent'
              }`}
            >
              <Icon
                className={`size-[18px] transition-colors duration-200 ${
                  active
                    ? 'text-teal-400'
                    : 'text-gray-400 group-hover:text-amber-400'
                }`}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-white/[0.06]">
        <p className="text-[11px] text-gray-400/50 tracking-wide">
          CareBot v1.0
        </p>
      </div>
    </aside>
  );
}

/** Mobile bottom nav for small screens */
export function MobileNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden items-center justify-around bg-black/60 backdrop-blur-xl border-t border-white/[0.06] py-2 safe-bottom">
      {navItems.slice(0, 5).map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg text-xs transition-all duration-200 relative ${
              active ? 'text-teal-400' : 'text-gray-400'
            }`}
          >
            {active && (
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 w-5 h-[2px] rounded-full bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.6)]" />
            )}
            <Icon className="size-5" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
