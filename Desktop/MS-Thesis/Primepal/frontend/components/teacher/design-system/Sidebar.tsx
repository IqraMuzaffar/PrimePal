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
    <div
      className="flex flex-col relative shrink-0 h-screen select-none"
      style={{
        width: collapsed ? 64 : 224,
        backgroundColor: designTokens.colors.dark,
        transition: 'width 240ms cubic-bezier(.4,0,.2,1)',
        boxShadow: '2px 0 20px rgba(0,0,0,0.25)',
        overflow: 'hidden',
      }}
    >
      {/* ── Logo ── */}
      <div
        className="h-16 flex items-center gap-3 shrink-0"
        style={{
          padding: collapsed ? '0 18px' : '0 16px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-white font-extrabold text-sm"
          style={{
            background: `linear-gradient(135deg, ${designTokens.colors.primary} 0%, ${designTokens.colors.primaryLight} 100%)`,
            boxShadow: `0 4px 12px rgba(67,97,238,0.4)`,
            transition: 'transform 150ms ease',
          }}
        >
          P
        </div>
        <div
          style={{
            overflow: 'hidden',
            width: collapsed ? 0 : 140,
            opacity: collapsed ? 0 : 1,
            transition: 'width 220ms cubic-bezier(.4,0,.2,1), opacity 180ms ease',
            whiteSpace: 'nowrap',
          }}
        >
          <span className="text-white font-bold text-base tracking-tight">
            PrimePal
          </span>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav
        className="flex-1 flex flex-col justify-evenly overflow-y-auto overflow-x-hidden"
        style={{ padding: '8px 0' }}
      >
        {navItems.map((item) => {
          const active = isActive(item.href);
          const hovered = hoveredItem === item.href;

          return (
            <div key={item.href} className="relative px-2" title={collapsed ? item.label : undefined}>
              <Link
                href={item.href}
                onMouseEnter={() => setHoveredItem(item.href)}
                onMouseLeave={() => setHoveredItem(null)}
                className="flex items-center gap-3 w-full relative"
                style={{
                  padding: collapsed ? '10px 12px' : '10px 14px',
                  borderRadius: 10,
                  backgroundColor: active
                    ? 'rgba(67,97,238,0.18)'
                    : hovered
                    ? 'rgba(255,255,255,0.06)'
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
                    top: '20%',
                    height: '60%',
                    width: 3,
                    borderRadius: '0 3px 3px 0',
                    backgroundColor: designTokens.colors.primary,
                    opacity: active ? 1 : 0,
                    transition: 'opacity 180ms ease, transform 180ms ease',
                    transform: active ? 'scaleY(1)' : 'scaleY(0.4)',
                  }}
                />

                {/* Icon */}
                <item.icon
                  size={18}
                  strokeWidth={active ? 2.2 : 1.8}
                  className="shrink-0"
                  style={{
                    transform: hovered && !active ? 'scale(1.12) translateX(1px)' : 'scale(1)',
                    transition: 'transform 160ms ease, stroke-width 160ms ease',
                    color: active
                      ? designTokens.colors.primaryLight
                      : hovered
                      ? '#c8d4f0'
                      : '#5a6e94',
                  }}
                />

                {/* Label */}
                <div
                  style={{
                    overflow: 'hidden',
                    width: collapsed ? 0 : 140,
                    opacity: collapsed ? 0 : 1,
                    transition: 'width 220ms cubic-bezier(.4,0,.2,1), opacity 180ms ease',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: active ? 600 : 400,
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
                      top: 6,
                      right: 6,
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
          borderTop: '1px solid rgba(255,255,255,0.06)',
          padding: '8px 0 6px',
        }}
      >
        {/* User Profile */}
        <div
          className="flex items-center gap-2.5 mx-2 mb-1 rounded-xl"
          style={{
            padding: collapsed ? '8px 10px' : '8px 10px',
            backgroundColor: 'rgba(255,255,255,0.04)',
          }}
        >
          <div
            className="shrink-0 flex items-center justify-center text-white font-bold text-sm rounded-full"
            style={{
              width: 32,
              height: 32,
              background: `linear-gradient(135deg, ${designTokens.colors.primary} 0%, ${designTokens.colors.primaryLight} 100%)`,
              boxShadow: '0 2px 8px rgba(67,97,238,0.35)',
              fontSize: 13,
            }}
          >
            {userEmail?.[0]?.toUpperCase() || 'T'}
          </div>
          <div
            style={{
              overflow: 'hidden',
              width: collapsed ? 0 : 130,
              opacity: collapsed ? 0 : 1,
              transition: 'width 220ms cubic-bezier(.4,0,.2,1), opacity 180ms ease',
              whiteSpace: 'nowrap',
            }}
          >
            <div
              className="font-semibold text-ellipsis overflow-hidden"
              style={{ fontSize: 12, color: '#d0daee' }}
            >
              {userEmail || 'Teacher'}
            </div>
            <div style={{ fontSize: 11, color: '#4d6080', marginTop: 1 }}>{userRole}</div>
          </div>
        </div>

        {/* Settings */}
        <BottomButton
          icon={Settings}
          label="Settings"
          collapsed={collapsed}
        />

        {/* Logout */}
        <BottomButton
          icon={LogOut}
          label="Logout"
          collapsed={collapsed}
          onClick={onLogout}
          danger
        />
      </div>

      {/* ── Collapse Toggle ── */}
      <button
        onClick={toggleCollapsed}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        style={{
          position: 'absolute',
          top: '50%',
          right: -12,
          transform: 'translateY(-50%)',
          width: 24,
          height: 24,
          borderRadius: '50%',
          backgroundColor: '#1a2e5a',
          border: '1.5px solid rgba(255,255,255,0.12)',
          boxShadow: '0 2px 10px rgba(0,0,0,0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#8896b8',
          zIndex: 30,
          cursor: 'pointer',
          transition: 'background-color 150ms ease, color 150ms ease, transform 150ms ease',
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
          <ChevronRight size={11} strokeWidth={2.5} />
        ) : (
          <ChevronLeft size={11} strokeWidth={2.5} />
        )}
      </button>
    </div>
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
        padding: collapsed ? '8px 18px' : '8px 18px',
        color: danger
          ? hovered ? '#f87171' : '#4d6080'
          : hovered ? '#c8d4f0' : '#4d6080',
        backgroundColor: hovered
          ? danger ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.05)'
          : 'transparent',
        transition: 'color 150ms ease, background-color 150ms ease',
        borderRadius: 0,
      }}
    >
      <Icon
        size={16}
        strokeWidth={1.8}
        className="shrink-0"
        style={{
          transform: hovered ? 'scale(1.1)' : 'scale(1)',
          transition: 'transform 150ms ease',
        }}
      />
      <div
        style={{
          overflow: 'hidden',
          width: collapsed ? 0 : 130,
          opacity: collapsed ? 0 : 1,
          transition: 'width 220ms cubic-bezier(.4,0,.2,1), opacity 180ms ease',
          whiteSpace: 'nowrap',
          fontSize: 13,
          textAlign: 'left',
        }}
      >
        {label}
      </div>
    </button>
  );
}
