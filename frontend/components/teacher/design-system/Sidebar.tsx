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
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

const EXPANDED_W = 268;
const COLLAPSED_W = 72;

export function Sidebar({ navItems, userEmail, userRole = 'Teacher', onLogout, mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved !== null) setCollapsed(saved === 'true');
  }, []);

  const toggleCollapsed = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    localStorage.setItem('sidebar-collapsed', String(newState));
  };

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/');

  return (
    <>
    {/* Mobile backdrop */}
    {mobileOpen && (
      <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={onMobileClose} />
    )}
    <div
      className={[
        "flex flex-col relative shrink-0 h-screen select-none",
        "fixed inset-y-0 left-0 z-50 md:relative md:z-auto",
        mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
      ].join(" ")}
      style={{
        width: collapsed && !mobileOpen ? COLLAPSED_W : EXPANDED_W,
        backgroundColor: designTokens.colors.dark,
        transition: 'width 240ms cubic-bezier(.4,0,.2,1), transform 240ms cubic-bezier(.4,0,.2,1)',
        boxShadow: '3px 0 24px rgba(0,0,0,0.28)',
        overflow: 'hidden',
      }}
    >
      {/* ── Logo ── */}
      <div
        className="shrink-0 flex items-center gap-3"
        style={{
          height: 72,
          padding: collapsed ? '0 20px' : '0 20px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          background: 'linear-gradient(180deg, rgba(67,97,238,0.12) 0%, transparent 100%)',
        }}
      >
        <div
          className="flex items-center justify-center shrink-0 text-white font-extrabold rounded-xl"
          style={{
            width: 36,
            height: 36,
            fontSize: 18,
            background: `linear-gradient(135deg, ${designTokens.colors.primary} 0%, ${designTokens.colors.primaryLight} 100%)`,
            boxShadow: `0 4px 14px rgba(67,97,238,0.45)`,
          }}
        >
          P
        </div>
        <div
          style={{
            overflow: 'hidden',
            width: collapsed ? 0 : 180,
            opacity: collapsed ? 0 : 1,
            transition: 'width 220ms cubic-bezier(.4,0,.2,1), opacity 180ms ease',
            whiteSpace: 'nowrap',
          }}
        >
          <div className="text-white font-bold leading-tight" style={{ fontSize: 17 }}>
            PrimePal
          </div>
          <div style={{ fontSize: 11, color: '#5a7ab8', marginTop: 1, letterSpacing: '0.04em' }}>
            Teacher Portal
          </div>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav
        className="flex-1 flex flex-col justify-evenly overflow-y-auto overflow-x-hidden"
        style={{ padding: '8px 10px' }}
      >
        {navItems.map((item) => {
          const active = isActive(item.href);
          const hovered = hoveredItem === item.href;

          return (
            <div key={item.href} className="relative" title={collapsed ? item.label : undefined}>
              <Link
                href={item.href}
                onClick={onMobileClose}
                onMouseEnter={() => setHoveredItem(item.href)}
                onMouseLeave={() => setHoveredItem(null)}
                className="flex items-center gap-3 w-full relative"
                style={{
                  padding: collapsed ? '11px 16px' : '11px 14px',
                  borderRadius: 10,
                  backgroundColor: active
                    ? 'rgba(67,97,238,0.20)'
                    : hovered
                    ? 'rgba(255,255,255,0.07)'
                    : 'transparent',
                  color: active ? '#a5b8ff' : hovered ? '#c8d4f0' : '#6b7fa8',
                  transition: 'background-color 160ms ease, color 160ms ease',
                  textDecoration: 'none',
                }}
              >
                {/* Active indicator bar */}
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: '18%',
                    height: '64%',
                    width: 3,
                    borderRadius: '0 3px 3px 0',
                    backgroundColor: designTokens.colors.primaryLight,
                    opacity: active ? 1 : 0,
                    transition: 'opacity 180ms ease, transform 180ms ease',
                    transform: active ? 'scaleY(1)' : 'scaleY(0.3)',
                  }}
                />

                {/* Icon */}
                <item.icon
                  size={20}
                  strokeWidth={active ? 2.2 : 1.8}
                  className="shrink-0"
                  style={{
                    transform: hovered && !active ? 'scale(1.14) translateX(1px)' : 'scale(1)',
                    transition: 'transform 160ms ease',
                    color: active
                      ? designTokens.colors.primaryLight
                      : hovered
                      ? '#c8d4f0'
                      : '#4a6080',
                  }}
                />

                {/* Label */}
                <div
                  style={{
                    overflow: 'hidden',
                    width: collapsed ? 0 : 180,
                    opacity: collapsed ? 0 : 1,
                    transition: 'width 220ms cubic-bezier(.4,0,.2,1), opacity 180ms ease',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span
                    style={{
                      fontSize: 18,
                      fontWeight: active ? 700 : 500,
                      letterSpacing: active ? '0.01em' : 0,
                      transition: 'font-weight 160ms ease',
                    }}
                  >
                    {item.label}
                  </span>
                </div>

                {/* Active dot (collapsed mode) */}
                {active && collapsed && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 7,
                      right: 7,
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      backgroundColor: designTokens.colors.primaryLight,
                    }}
                  />
                )}
              </Link>
            </div>
          );
        })}
      </nav>

      {/* ── Bottom Section ── */}
      <div
        style={{
          borderTop: '1px solid rgba(255,255,255,0.08)',
          padding: '12px 10px 10px',
          background: 'linear-gradient(0deg, rgba(0,0,0,0.15) 0%, transparent 100%)',
        }}
      >
        {/* User Profile */}
        <div
          className="flex items-center gap-3 rounded-xl mb-3"
          style={{
            padding: '12px 14px',
            backgroundColor: 'rgba(67,97,238,0.12)',
            border: '1px solid rgba(67,97,238,0.18)',
          }}
        >
          <div
            className="shrink-0 flex items-center justify-center text-white font-extrabold rounded-full"
            style={{
              width: 40,
              height: 40,
              fontSize: 18,
              background: `linear-gradient(135deg, ${designTokens.colors.primary} 0%, ${designTokens.colors.primaryLight} 100%)`,
              boxShadow: '0 3px 12px rgba(67,97,238,0.5)',
              flexShrink: 0,
            }}
          >
            {userEmail?.[0]?.toUpperCase() || 'T'}
          </div>
          <div
            style={{
              overflow: 'hidden',
              width: collapsed ? 0 : 170,
              opacity: collapsed ? 0 : 1,
              transition: 'width 220ms cubic-bezier(.4,0,.2,1), opacity 180ms ease',
              whiteSpace: 'nowrap',
            }}
          >
            <div
              className="font-bold truncate"
              style={{ fontSize: 16, color: '#dce8ff', letterSpacing: '-0.01em' }}
            >
              {userEmail?.split('@')[0] || 'Teacher'}
            </div>
            <div
              style={{
                display: 'inline-block',
                marginTop: 3,
                fontSize: 13,
                fontWeight: 600,
                color: designTokens.colors.primaryLight,
                backgroundColor: 'rgba(67,97,238,0.25)',
                padding: '1px 8px',
                borderRadius: 20,
                letterSpacing: '0.03em',
              }}
            >
              {userRole}
            </div>
          </div>
        </div>

        {/* Settings */}
        <BottomButton icon={Settings} label="Settings" collapsed={collapsed} />

        {/* Logout */}
        <BottomButton icon={LogOut} label="Log Out" collapsed={collapsed} onClick={onLogout} danger />
      </div>

      {/* ── Collapse Toggle ── */}
      <button
        onClick={toggleCollapsed}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        style={{
          position: 'absolute',
          top: '50%',
          right: -13,
          transform: 'translateY(-50%)',
          width: 26,
          height: 26,
          borderRadius: '50%',
          backgroundColor: '#1a2e5a',
          border: '1.5px solid rgba(255,255,255,0.13)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#8896b8',
          zIndex: 30,
          cursor: 'pointer',
          transition: 'background-color 150ms ease, color 150ms ease',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = designTokens.colors.primary;
          (e.currentTarget as HTMLButtonElement).style.color = '#fff';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1a2e5a';
          (e.currentTarget as HTMLButtonElement).style.color = '#8896b8';
        }}
      >
        {collapsed ? (
          <ChevronRight size={12} strokeWidth={2.5} />
        ) : (
          <ChevronLeft size={12} strokeWidth={2.5} />
        )}
      </button>
    </div>
    </>
  );
}

// ── Bottom action button ──────────────────────────────────────────────────────
function BottomButton({
  icon: Icon,
  label,
  collapsed,
  onClick,
  danger,
}: {
  icon: LucideIcon;
  label: string;
  collapsed: boolean;
  onClick?: () => void;
  danger?: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={collapsed ? label : undefined}
      className="flex items-center gap-3 w-full"
      style={{
        padding: collapsed ? '11px 18px' : '11px 14px',
        borderRadius: 10,
        color: danger
          ? hovered ? '#fca5a5' : '#6b80a8'
          : hovered ? '#dce8ff' : '#6b80a8',
        backgroundColor: hovered
          ? danger ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.08)'
          : 'transparent',
        transition: 'color 150ms ease, background-color 150ms ease',
        marginBottom: 3,
      }}
    >
      <Icon
        size={20}
        strokeWidth={1.8}
        className="shrink-0"
        style={{
          transform: hovered ? 'scale(1.12) translateX(1px)' : 'scale(1)',
          transition: 'transform 150ms ease',
        }}
      />
      <div
        style={{
          overflow: 'hidden',
          width: collapsed ? 0 : 170,
          opacity: collapsed ? 0 : 1,
          transition: 'width 220ms cubic-bezier(.4,0,.2,1), opacity 180ms ease',
          whiteSpace: 'nowrap',
          fontSize: 18,
          fontWeight: 500,
          textAlign: 'left',
          letterSpacing: '-0.01em',
        }}
      >
        {label}
      </div>
    </button>
  );
}
