// components.jsx — Shared UI: Icon, Sidebar, TopBar, StatCard, LineChart, BarChart, ProgressBar
const { useState, useEffect } = React;

const Icon = ({ d, size = 18, color = 'currentColor', sw = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {(Array.isArray(d) ? d : [d]).map((p, i) => <path key={i} d={p} />)}
  </svg>
);

const ICONS = {
  dashboard:     ['M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z','M9 22V12h6v10'],
  classrooms:    ['M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z','M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z'],
  students:      ['M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2','M9 11a4 4 0 100-8 4 4 0 000 8z','M23 21v-2a4 4 0 00-3-3.87','M16 3.13a4 4 0 010 7.75'],
  missions:      ['M22 11.08V12a10 10 0 11-5.93-9.14','M22 4L12 14.01l-3-3'],
  announcements: ['M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9','M13.73 21a2 2 0 01-3.46 0'],
  analytics:     ['M18 20V10','M12 20V4','M6 20v-6'],
  reports:       ['M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z','M14 2v6h6','M16 13H8','M16 17H8','M10 9H8'],
  curriculum:    ['M4 19.5A2.5 2.5 0 016.5 17H20','M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z'],
  settings:      ['M12 15a3 3 0 100-6 3 3 0 000 6z','M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z'],
  logout:        ['M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4','M16 17l5-5-5-5','M21 12H9'],
  bell:          ['M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9','M13.73 21a2 2 0 01-3.46 0'],
  plus:          ['M12 5v14','M5 12h14'],
  chevronRight:  'M9 18l6-6-6-6',
  chevronLeft:   'M15 18l-6-6 6-6',
  search:        ['M21 21l-4.35-4.35','M11 19a8 8 0 100-16 8 8 0 000 16z'],
  download:      ['M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4','M7 10l5 5 5-5','M12 15V3'],
};

const NAV_ITEMS = [
  { id: 'dashboard',     label: 'Dashboard' },
  { id: 'classrooms',    label: 'Classrooms' },
  { id: 'students',      label: 'Students' },
  { id: 'missions',      label: 'Missions' },
  { id: 'announcements', label: 'Announcements' },
  { id: 'analytics',     label: 'Analytics' },
  { id: 'reports',       label: 'Reports' },
  { id: 'curriculum',    label: 'Curriculum Hub' },
];

// ── Sidebar ──────────────────────────────────────────────────
const Sidebar = ({ active, onNav, collapsed, onToggle }) => {
  const w = collapsed ? 64 : 224;
  const acc = 'var(--accent, #4361ee)';
  return (
    <div style={{
      width: w, background: '#0f1729', display: 'flex', flexDirection: 'column',
      transition: 'width 0.22s cubic-bezier(.4,0,.2,1)',
      flexShrink: 0, position: 'relative', zIndex: 20, overflow: 'hidden',
      height: '100vh',
    }}>
      {/* Logo */}
      <div style={{ height: 64, display: 'flex', alignItems: 'center', padding: '0 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', gap: 10, flexShrink: 0 }}>
        <div style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, background: 'linear-gradient(135deg,#4361ee,#7c9eff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, color: '#fff', fontSize: 15 }}>P</div>
        {!collapsed && <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 17, color: '#fff', whiteSpace: 'nowrap', letterSpacing: '-0.3px' }}>PrimePal</span>}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '10px 0', overflowY: 'auto', overflowX: 'hidden' }}>
        {NAV_ITEMS.map(item => {
          const isActive = active === item.id;
          return (
            <button key={item.id} onClick={() => onNav(item.id)}
              title={collapsed ? item.label : undefined}
              style={{
                display: 'flex', alignItems: 'center', gap: 11, width: '100%', border: 'none',
                cursor: 'pointer', padding: '11px 16px',
                background: isActive ? 'rgba(67,97,238,0.16)' : 'transparent',
                color: isActive ? '#a5b8ff' : '#7a8db0',
                borderLeft: `3px solid ${isActive ? '#4361ee' : 'transparent'}`,
                fontFamily: "'DM Sans',sans-serif", fontSize: 13.5,
                fontWeight: isActive ? 600 : 400, transition: 'all 0.13s', textAlign: 'left', whiteSpace: 'nowrap',
              }}>
              <span style={{ flexShrink: 0 }}>
                <Icon d={ICONS[item.id] || ICONS.dashboard} size={17} color={isActive ? '#a5b8ff' : '#7a8db0'} />
              </span>
              {!collapsed && item.label}
            </button>
          );
        })}
      </nav>

      {/* Bottom */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingBottom: 8 }}>
        <button style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', border: 'none', cursor: 'pointer', padding: '10px 16px', background: 'transparent', color: '#7a8db0', fontFamily: "'DM Sans',sans-serif", fontSize: 13.5, whiteSpace: 'nowrap' }}>
          <Icon d={ICONS.settings} size={17} color="#7a8db0" />{!collapsed && 'Settings'}
        </button>
        <button style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', border: 'none', cursor: 'pointer', padding: '10px 16px', background: 'transparent', color: '#7a8db0', fontFamily: "'DM Sans',sans-serif", fontSize: 13.5, whiteSpace: 'nowrap' }}>
          <Icon d={ICONS.logout} size={17} color="#7a8db0" />{!collapsed && 'Logout'}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: collapsed ? '10px 16px' : '10px 12px', cursor: 'pointer' }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg,#4361ee,#7c9eff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: 14, fontFamily: "'Space Grotesk',sans-serif" }}>A</div>
          {!collapsed && (
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#e0e6f5', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Ms. Adeola</div>
              <div style={{ fontSize: 11, color: '#7a8db0' }}>Class Teacher</div>
            </div>
          )}
        </div>
      </div>

      {/* Collapse toggle */}
      <button onClick={onToggle} style={{
        position: 'absolute', top: '50%', right: -13, transform: 'translateY(-50%)',
        width: 26, height: 26, borderRadius: '50%', background: '#1e2f55',
        border: '1.5px solid rgba(255,255,255,0.14)', color: '#8896b8', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, zIndex: 30,
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      }}>
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <path d={collapsed ? 'M3.5 2l4 3.5-4 3.5' : 'M7.5 2l-4 3.5 4 3.5'} />
        </svg>
      </button>
    </div>
  );
};

// ── TopBar ────────────────────────────────────────────────────
const TopBar = ({ page }) => {
  const TITLES = { dashboard:'Dashboard', classrooms:'Classrooms', students:'Students', missions:'Missions', announcements:'Announcements', analytics:'Analytics', reports:'Reports', curriculum:'Curriculum Hub' };
  return (
    <div style={{ height: 64, background: '#fff', borderBottom: '1px solid #e8eaf0', display: 'flex', alignItems: 'center', padding: '0 28px', gap: 16, flexShrink: 0 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 18, color: '#0f1729', lineHeight: 1.2 }}>{TITLES[page] || page}</div>
        <div style={{ fontSize: 11.5, color: '#9aa8c9', marginTop: 1 }}>Tuesday, 29 April 2026 · Term 2, Week 6</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button style={{ width: 38, height: 38, borderRadius: 10, background: '#f4f5fb', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          <Icon d={ICONS.bell} size={17} color="#4361ee" />
          <span style={{ position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: '50%', background: '#ef4444', border: '2px solid #fff' }}></span>
        </button>
        <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg,#4361ee,#7c9eff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: 14, cursor: 'pointer', fontFamily: "'Space Grotesk',sans-serif" }}>A</div>
      </div>
    </div>
  );
};

// ── StatCard ──────────────────────────────────────────────────
const StatCard = ({ value, label, sub, iconColor, iconBg, trend, icon }) => (
  <div style={{ background: '#fff', borderRadius: 14, padding: '18px 20px', flex: 1, minWidth: 0, border: '1px solid #eaedf5', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
      <div style={{ width: 40, height: 40, borderRadius: 11, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon d={icon} size={19} color={iconColor} />
      </div>
      {trend !== undefined && (
        <span style={{ fontSize: 11.5, fontWeight: 600, borderRadius: 20, padding: '3px 8px', color: trend >= 0 ? '#059669' : '#dc2626', background: trend >= 0 ? '#d1fae5' : '#fee2e2' }}>
          {trend >= 0 ? '+' : ''}{trend}%
        </span>
      )}
    </div>
    <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 30, fontWeight: 700, color: '#0f1729', lineHeight: 1 }}>{value}</div>
    <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginTop: 5 }}>{label}</div>
    {sub && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{sub}</div>}
  </div>
);

// ── LineChart ─────────────────────────────────────────────────
const LineChart = ({ datasets, labels, height = 160 }) => {
  const all = datasets.flatMap(d => d.values);
  const max = Math.max(...all) * 1.08;
  const min = Math.min(...all) * 0.88;
  const W = 500, H = height - 24;
  const n = labels.length;
  const toX = i => (i / (n - 1)) * W;
  const toY = v => H - ((v - min) / (max - min)) * H;
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none">
      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => <line key={i} x1={0} y1={H * t} x2={W} y2={H * t} stroke="#f0f2f8" strokeWidth={1} />)}
      {datasets.map((d, di) => {
        const pts = d.values.map((v, i) => [toX(i), toY(v)]);
        const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
        const area = `${line} L${W},${H} L0,${H} Z`;
        return (
          <g key={di}>
            <path d={area} fill={d.color} opacity={0.07} />
            <path d={line} fill="none" stroke={d.color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
            {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={3.5} fill={d.color} stroke="#fff" strokeWidth={1.5} />)}
          </g>
        );
      })}
      {labels.map((l, i) => <text key={i} x={toX(i)} y={height - 4} textAnchor="middle" fontSize={10} fill="#9ca3af" fontFamily="DM Sans, sans-serif">{l}</text>)}
    </svg>
  );
};

// ── ProgressBar ───────────────────────────────────────────────
const ProgressBar = ({ value, color, max = 100 }) => (
  <div style={{ background: '#f0f2f8', borderRadius: 99, height: 8, overflow: 'hidden' }}>
    <div style={{ width: `${(value / max) * 100}%`, height: '100%', background: color, borderRadius: 99, transition: 'width 0.6s ease' }} />
  </div>
);

Object.assign(window, { Icon, ICONS, NAV_ITEMS, Sidebar, TopBar, StatCard, LineChart, ProgressBar });
