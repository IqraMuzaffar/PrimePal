// frontend/components/teacher/design-system/Sidebar.tsx

"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LucideIcon, ChevronLeft, ChevronRight, Settings, LogOut } from 'lucide-react';
import { designTokens } from '@/lib/design-tokens';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface SidebarProps {
  navItems: NavItem[];
  userEmail?: string;
  userRole?: string;
  onLogout?: () => void;
}

export function Sidebar({ navItems, userEmail, userRole = 'Teacher', onLogout }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  // Load collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved !== null) {
      setCollapsed(saved === 'true');
    }
  }, []);

  // Save collapsed state to localStorage
  const toggleCollapsed = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    localStorage.setItem('sidebar-collapsed', String(newState));
  };

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/');
  };

  const width = collapsed ? '64px' : '224px';

  return (
    <div
      className="flex flex-col relative shrink-0 transition-all duration-[220ms] ease-out overflow-hidden h-screen"
      style={{
        width,
        backgroundColor: designTokens.colors.dark,
      }}
    >
      {/* Logo */}
      <div
        className="h-16 flex items-center px-4 gap-2.5 border-b shrink-0"
        style={{ borderColor: 'rgba(255,255,255,0.07)' }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white font-extrabold text-base"
          style={{
            background: `linear-gradient(135deg, ${designTokens.colors.primary} 0%, ${designTokens.colors.primaryLight} 100%)`,
            fontFamily: designTokens.typography.heading,
          }}
        >
          P
        </div>
        {!collapsed && (
          <span
            className="text-white font-bold text-lg tracking-tight"
            style={{ fontFamily: designTokens.typography.heading }}
          >
            PrimePal
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2.5 overflow-y-auto overflow-x-hidden">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 w-full px-4 py-3 transition-all duration-[130ms] border-l-[3px]"
              style={{
                backgroundColor: active ? 'rgba(67,97,238,0.16)' : 'transparent',
                color: active ? '#a5b8ff' : '#7a8db0',
                borderLeftColor: active ? designTokens.colors.primary : 'transparent',
                fontFamily: designTokens.typography.body,
                fontSize: designTokens.typography.sizes.base,
                fontWeight: active ? designTokens.typography.weights.semibold : designTokens.typography.weights.regular,
              }}
              title={collapsed ? item.label : undefined}
            >
              <item.icon size={17} strokeWidth={1.8} className="shrink-0" />
              {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="border-t pb-2" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        {/* Settings */}
        <button
          className="flex items-center gap-3 w-full px-4 py-2.5 transition-colors text-[#7a8db0] hover:text-white"
          style={{
            fontFamily: designTokens.typography.body,
            fontSize: designTokens.typography.sizes.base,
          }}
          title={collapsed ? 'Settings' : undefined}
        >
          <Settings size={17} strokeWidth={1.8} className="shrink-0" />
          {!collapsed && <span className="whitespace-nowrap">Settings</span>}
        </button>

        {/* Logout */}
        <button
          onClick={onLogout}
          className="flex items-center gap-3 w-full px-4 py-2.5 transition-colors text-[#7a8db0] hover:text-white"
          style={{
            fontFamily: designTokens.typography.body,
            fontSize: designTokens.typography.sizes.base,
          }}
          title={collapsed ? 'Logout' : undefined}
        >
          <LogOut size={17} strokeWidth={1.8} className="shrink-0" />
          {!collapsed && <span className="whitespace-nowrap">Logout</span>}
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer" style={{ padding: collapsed ? '10px 16px' : '10px 12px' }}>
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-white font-bold text-sm"
            style={{
              background: `linear-gradient(135deg, ${designTokens.colors.primary} 0%, ${designTokens.colors.primaryLight} 100%)`,
              fontFamily: designTokens.typography.heading,
            }}
          >
            {userEmail?.[0]?.toUpperCase() || 'T'}
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <div className="text-sm font-semibold text-[#e0e6f5] whitespace-nowrap overflow-hidden text-ellipsis">
                {userEmail || 'Teacher'}
              </div>
              <div className="text-xs text-[#7a8db0]">{userRole}</div>
            </div>
          )}
        </div>
      </div>

      {/* Toggle Button */}
      <button
        onClick={toggleCollapsed}
        className="absolute top-1/2 -translate-y-1/2 -right-[13px] w-[26px] h-[26px] rounded-full border-[1.5px] flex items-center justify-center text-[#8896b8] z-30 transition-colors"
        style={{
          backgroundColor: '#1e2f55',
          borderColor: 'rgba(255,255,255,0.14)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? (
          <ChevronRight size={11} strokeWidth={2.2} />
        ) : (
          <ChevronLeft size={11} strokeWidth={2.2} />
        )}
      </button>
    </div>
  );
}
