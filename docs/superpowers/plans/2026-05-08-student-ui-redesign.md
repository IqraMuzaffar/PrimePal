# Student UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the C+B hybrid visual system (pastel base, saturated card gradients, animated mascot, light navbar, larger type) across all student-facing pages without breaking any existing behavior.

**Architecture:** New design tokens & keyframes in `tailwind.config.ts`. Three new shared atoms (`PageHero`, `SectionHeading`, `ActivityCard`) live in `frontend/components/student/`. Existing pages restyle their JSX/className strings only — all React state, hooks, queries, fetch logic, game state machines, streaming/audio behavior stay untouched.

**Tech Stack:** Next.js 14 (App Router), React 18, Tailwind CSS, Tailwind keyframes, framer-motion (existing usage preserved).

**Spec:** `docs/superpowers/specs/2026-05-08-student-ui-redesign-design.md`

**Verification per task:** Because this is a presentation-only refactor, traditional unit-test-driven TDD doesn't apply. Each task verifies via:
1. `cd frontend && npx tsc --noEmit` (no new TypeScript errors)
2. `cd frontend && npm run build` (Next.js build succeeds — only at phase boundaries to save time)
3. Manual smoke check listed per task (e.g. "open /student/home, hero renders").

Engineer must keep `cd frontend && npm run dev` running throughout, observe console for runtime errors after every save.

---

## Phase 0 — Pre-flight

### Task 0: Verify clean baseline

**Files:** none

- [ ] **Step 1:** Confirm dev server starts cleanly

```bash
cd frontend && npm run dev
```

Expected: server up on http://localhost:3000 with zero console errors when navigating to `/student/home` (you may need to log in via `/student/play` first using a test class code/student/PIN).

- [ ] **Step 2:** Confirm baseline build passes

```bash
cd frontend && npm run build
```

Expected: build completes with zero errors.

- [ ] **Step 3:** Confirm baseline typecheck passes

```bash
cd frontend && npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 4:** Note current behavior of these critical flows so you can re-verify later:
  - Student login at `/student/play` (3-step wizard)
  - Home page renders with name, points, badges
  - Click Missions card → navigates to `/student/missions`
  - Click a pillar card → enters gameplay
  - Open chat, send a message, get streaming response
  - Open spelling-bee, hear word, type answer
  - Open story-time, read & answer
  - Logout via "Out 👋" button

If any of these is already broken, stop and report — fix first.

---

## Phase 1 — Tokens & Foundation

### Task 1: Add design tokens & keyframes to Tailwind

**Files:**
- Modify: `frontend/tailwind.config.ts`

- [ ] **Step 1:** Replace the entire file with this content

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        cream: "#f5f0e8",
      },
      backgroundImage: {
        "student-bg":
          "linear-gradient(180deg, #fafaf9 0%, #fdf4ff 60%, #ecfeff 100%)",
        "student-hero":
          "linear-gradient(135deg, #fce7f3 0%, #ddd6fe 50%, #cffafe 100%)",
        "card-purple": "linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)",
        "card-pink":   "linear-gradient(135deg, #f472b6 0%, #db2777 100%)",
        "card-amber":  "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
        "card-cyan":   "linear-gradient(135deg, #22d3ee 0%, #0891b2 100%)",
        "card-emerald":"linear-gradient(135deg, #34d399 0%, #059669 100%)",
        "card-blue":   "linear-gradient(135deg, #60a5fa 0%, #2563eb 100%)",
        "card-rose":   "linear-gradient(135deg, #fb7185 0%, #e11d48 100%)",
        "pill-active": "linear-gradient(135deg, #fbcfe8 0%, #ddd6fe 100%)",
      },
      fontFamily: {
        baloo: ['"Baloo 2"', "cursive", "sans-serif"],
        nunito: ["Nunito", "sans-serif"],
      },
      keyframes: {
        floatUp: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        popIn: {
          "0%": { transform: "scale(0.8)", opacity: "0" },
          "70%": { transform: "scale(1.05)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        slideUp: {
          from: { transform: "translateY(20px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "20%": { transform: "translateX(-8px)" },
          "40%": { transform: "translateX(8px)" },
          "60%": { transform: "translateX(-6px)" },
          "80%": { transform: "translateX(6px)" },
        },
        pulse2: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.85", transform: "scale(1.04)" },
        },
        starBurst: {
          "0%": { transform: "scale(0) rotate(-20deg)", opacity: "0" },
          "60%": { transform: "scale(1.3) rotate(8deg)", opacity: "1" },
          "100%": { transform: "scale(1) rotate(0deg)", opacity: "1" },
        },
        confettiFall: {
          "0%": { transform: "translateY(-20px) rotate(0deg)", opacity: "1" },
          "100%": { transform: "translateY(120px) rotate(360deg)", opacity: "0" },
        },
        wave: {
          "0%, 60%, 100%": { transform: "rotate(0deg)" },
          "10%": { transform: "rotate(14deg)" },
          "20%": { transform: "rotate(-8deg)" },
          "30%": { transform: "rotate(14deg)" },
          "40%": { transform: "rotate(-4deg)" },
          "50%": { transform: "rotate(10deg)" },
        },
        floatBig: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-14px)" },
        },
        pulseSoft: {
          "0%, 100%": { transform: "scale(1)", opacity: "1" },
          "50%": { transform: "scale(1.15)", opacity: "0.7" },
        },
        spinSlow: {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        bounceSoft: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        floatUp: "floatUp 3s ease-in-out infinite",
        popIn: "popIn 0.3s ease",
        slideUp: "slideUp 0.3s ease",
        shake: "shake 0.4s ease",
        pulse2: "pulse2 2s ease-in-out infinite",
        starBurst: "starBurst 0.4s ease",
        confettiFall: "confettiFall 1.5s ease-in forwards",
        wave: "wave 2.5s ease-in-out infinite",
        floatBig: "floatBig 3.5s ease-in-out infinite",
        pulseSoft: "pulseSoft 4s ease-in-out infinite",
        pulseSoftReverse: "pulseSoft 5s ease-in-out infinite reverse",
        spinSlow: "spinSlow 8s linear infinite",
        bounceSoft: "bounceSoft 2s ease-in-out infinite",
        shimmer: "shimmer 3s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
```

- [ ] **Step 2:** Verify typecheck

```bash
cd frontend && npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3:** Verify dev server hot-reloaded successfully (no errors in browser console).

- [ ] **Step 4:** Commit

```bash
git add frontend/tailwind.config.ts
git commit -m "feat(student-ui): add design tokens and animation keyframes for redesign"
```

### Task 2: Add reduced-motion handling to globals.css

**Files:**
- Modify: `frontend/app/globals.css`

- [ ] **Step 1:** Append the following to `frontend/app/globals.css` (do not replace existing content)

```css

/* Reduced-motion: respect users who prefer no motion. Disables infinite
   ambient animations only — interactive transitions still work. */
@media (prefers-reduced-motion: reduce) {
  .animate-floatUp,
  .animate-floatBig,
  .animate-wave,
  .animate-pulseSoft,
  .animate-pulseSoftReverse,
  .animate-pulse2,
  .animate-spinSlow,
  .animate-bounceSoft,
  .animate-shimmer {
    animation: none !important;
  }
}
```

- [ ] **Step 2:** Verify dev server hot-reloaded.

- [ ] **Step 3:** Commit

```bash
git add frontend/app/globals.css
git commit -m "feat(student-ui): respect prefers-reduced-motion"
```

---

## Phase 2 — Shared Atoms

### Task 3: Create `PageHero` component

**Files:**
- Create: `frontend/components/student/PageHero.tsx`

- [ ] **Step 1:** Create the file with this content

```tsx
"use client";

import { ReactNode } from "react";

type Pill = {
  icon?: string;
  label: string;
  variant?: "white" | "amber";
};

interface PageHeroProps {
  /** Small uppercase eyebrow (e.g. "WELCOME BACK!"). Optional. */
  label?: string;
  /** Main heading text (e.g. "Hi Horain!"). Required. */
  name: string;
  /** Optional waving emoji rendered inside the name with wave animation. */
  waveEmoji?: string;
  /** Optional smaller line under the name (e.g. roll number). */
  subtitle?: string;
  /** Optional pill row under subtitle. */
  pills?: Pill[];
  /** Optional emoji on the right side. Renders large with float animation. */
  mascot?: string;
  /** Override gradient. Defaults to bg-student-hero (pink → lavender → mint). */
  className?: string;
  /** Replace right-side mascot with custom node (e.g. svg). */
  rightSlot?: ReactNode;
}

export default function PageHero({
  label,
  name,
  waveEmoji,
  subtitle,
  pills,
  mascot,
  className,
  rightSlot,
}: PageHeroProps) {
  return (
    <div
      className={[
        "relative overflow-hidden rounded-3xl",
        "bg-student-hero",
        "px-6 sm:px-10 py-8 sm:py-10",
        "min-h-[180px] sm:min-h-[220px]",
        "flex items-center justify-between gap-6",
        "shadow-[0_12px_40px_rgba(168,85,247,0.10)]",
        "animate-slideUp",
        className ?? "",
      ].join(" ")}
    >
      {/* Glow blobs */}
      <div
        className="pointer-events-none absolute -right-12 -top-12 w-60 h-60 rounded-full animate-pulseSoft"
        style={{
          background:
            "radial-gradient(circle, rgba(251,191,36,1) 0%, rgba(251,191,36,0) 70%)",
        }}
      />
      <div
        className="pointer-events-none absolute right-20 -bottom-12 w-36 h-36 rounded-full opacity-50 animate-pulseSoftReverse"
        style={{
          background:
            "radial-gradient(circle, rgba(167,139,250,1) 0%, rgba(167,139,250,0) 70%)",
        }}
      />

      {/* Left: text */}
      <div className="relative z-10 min-w-0">
        {label && (
          <p className="font-baloo font-extrabold text-xs sm:text-sm tracking-[0.2em] text-pink-900/70">
            {label}
          </p>
        )}
        <h1 className="font-baloo font-extrabold text-4xl sm:text-5xl lg:text-6xl text-slate-900 leading-[1.05] mt-2 tracking-tight">
          {name}
          {waveEmoji && (
            <span className="inline-block ml-2 origin-[70%_70%] animate-wave">
              {waveEmoji}
            </span>
          )}
        </h1>
        {subtitle && (
          <p className="font-nunito font-semibold text-sm sm:text-base text-slate-500 mt-2">
            {subtitle}
          </p>
        )}
        {pills && pills.length > 0 && (
          <div className="flex flex-wrap gap-2.5 mt-5">
            {pills.map((p, i) => (
              <span
                key={i}
                className={[
                  "rounded-full px-4 py-2 font-baloo font-extrabold text-sm sm:text-base flex items-center gap-1.5 shadow-[0_4px_12px_rgba(0,0,0,0.06)]",
                  p.variant === "amber"
                    ? "bg-gradient-to-br from-amber-400 to-amber-500 text-white"
                    : "bg-white text-pink-900",
                ].join(" ")}
              >
                {p.icon && <span>{p.icon}</span>}
                <span>{p.label}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Right: mascot or custom slot */}
      {rightSlot ? (
        <div className="relative z-10 shrink-0">{rightSlot}</div>
      ) : mascot ? (
        <div
          className="relative z-10 shrink-0 text-7xl sm:text-8xl lg:text-9xl animate-floatBig"
          style={{ filter: "drop-shadow(0 14px 22px rgba(168,85,247,0.25))" }}
        >
          {mascot}
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 2:** Typecheck

```bash
cd frontend && npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3:** Commit

```bash
git add frontend/components/student/PageHero.tsx
git commit -m "feat(student-ui): add PageHero shared component"
```

### Task 4: Create `SectionHeading` component

**Files:**
- Create: `frontend/components/student/SectionHeading.tsx`

- [ ] **Step 1:** Create the file

```tsx
"use client";

import Link from "next/link";

type BadgeTone = "pink" | "amber" | "blue" | "violet" | "emerald";

const TONE_CLASS: Record<BadgeTone, string> = {
  pink:    "bg-gradient-to-br from-pink-200 to-pink-300",
  amber:   "bg-gradient-to-br from-amber-200 to-amber-300",
  blue:    "bg-gradient-to-br from-blue-200 to-blue-300",
  violet:  "bg-gradient-to-br from-violet-200 to-violet-300",
  emerald: "bg-gradient-to-br from-emerald-200 to-emerald-300",
};

interface SectionHeadingProps {
  /** Emoji displayed inside the colored badge square. */
  icon: string;
  /** Section label, displayed uppercase tracked. */
  title: string;
  /** Tone of the icon badge. Defaults to "pink". */
  tone?: BadgeTone;
  /** Optional right-side link (e.g. "See all →"). */
  rightHref?: string;
  rightLabel?: string;
}

export default function SectionHeading({
  icon,
  title,
  tone = "pink",
  rightHref,
  rightLabel,
}: SectionHeadingProps) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div
        className={[
          "w-10 h-10 sm:w-11 sm:h-11 rounded-2xl",
          "flex items-center justify-center text-xl sm:text-2xl",
          "shadow-[0_4px_12px_rgba(0,0,0,0.08)]",
          TONE_CLASS[tone],
        ].join(" ")}
      >
        {icon}
      </div>
      <h2 className="font-baloo font-extrabold text-base sm:text-lg lg:text-xl tracking-[0.15em] text-slate-900 uppercase">
        {title}
      </h2>
      <div className="flex-1 h-[2px] bg-gradient-to-r from-slate-200 to-transparent" />
      {rightHref && rightLabel && (
        <Link
          href={rightHref}
          className="font-baloo font-extrabold text-sm sm:text-base text-violet-500 hover:text-violet-700 transition-colors shrink-0"
        >
          {rightLabel}
        </Link>
      )}
    </div>
  );
}
```

- [ ] **Step 2:** Typecheck

```bash
cd frontend && npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3:** Commit

```bash
git add frontend/components/student/SectionHeading.tsx
git commit -m "feat(student-ui): add SectionHeading shared component"
```

### Task 5: Create `ActivityCard` component

**Files:**
- Create: `frontend/components/student/ActivityCard.tsx`

- [ ] **Step 1:** Create the file

```tsx
"use client";

import Link from "next/link";

type Tone = "purple" | "pink" | "amber" | "cyan" | "emerald" | "blue" | "rose";

const TONE_CLASS: Record<Tone, string> = {
  purple:  "bg-card-purple",
  pink:    "bg-card-pink",
  amber:   "bg-card-amber",
  cyan:    "bg-card-cyan",
  emerald: "bg-card-emerald",
  blue:    "bg-card-blue",
  rose:    "bg-card-rose",
};

interface ActivityCardProps {
  href: string;
  /** Big emoji shown at top-left. */
  icon: string;
  title: string;
  /** Short helper line below title. */
  subtitle?: string;
  /** Color theme. */
  tone: Tone;
  /** Spans 2 columns at lg breakpoint when true (used for "featured" card). */
  wide?: boolean;
  /** Small badge in top-right (e.g. "NEW"). */
  badge?: string;
  /** Optional stagger animation delay class (e.g. "[animation-delay:50ms]"). */
  delayClass?: string;
}

export default function ActivityCard({
  href,
  icon,
  title,
  subtitle,
  tone,
  wide = false,
  badge,
  delayClass,
}: ActivityCardProps) {
  return (
    <Link
      href={href}
      className={[
        "group relative overflow-hidden rounded-3xl p-7",
        "min-h-[170px] flex flex-col justify-between text-white",
        "transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
        "hover:-translate-y-1.5 hover:rotate-[-0.3deg] hover:shadow-[0_24px_48px_rgba(0,0,0,0.18)]",
        "shadow-[0_12px_24px_rgba(15,23,42,0.10)]",
        "animate-slideUp",
        delayClass ?? "",
        wide ? "lg:col-span-2" : "",
        TONE_CLASS[tone],
      ].join(" ")}
    >
      {/* Decorative blob */}
      <span
        className="pointer-events-none absolute -right-10 -top-10 w-44 h-44 rounded-full bg-white/[0.18] transition-transform duration-300 ease-out group-hover:scale-[1.4]"
        aria-hidden="true"
      />

      {badge && (
        <span className="absolute top-4 right-4 z-10 bg-white text-pink-700 font-baloo font-extrabold text-xs px-3 py-1 rounded-lg animate-pulse2">
          {badge}
        </span>
      )}

      <span
        className="relative z-10 text-5xl sm:text-6xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-[-8deg]"
        style={{ filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.18))" }}
      >
        {icon}
      </span>

      <div className="relative z-10">
        <p className="font-baloo font-extrabold text-2xl sm:text-[26px] leading-tight">
          {title}
        </p>
        {subtitle && (
          <p className="font-nunito font-semibold text-sm sm:text-base opacity-90 mt-1">
            {subtitle}
          </p>
        )}
      </div>
    </Link>
  );
}
```

- [ ] **Step 2:** Typecheck

```bash
cd frontend && npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3:** Commit

```bash
git add frontend/components/student/ActivityCard.tsx
git commit -m "feat(student-ui): add ActivityCard shared component"
```

---

## Phase 3 — Layout Shell

### Task 6: Redesign `student/layout.tsx` navbar

**Files:**
- Modify: `frontend/app/student/layout.tsx`

- [ ] **Step 1:** Replace the entire `return (...)` block (lines 74-188 in current file) so the layout renders the new white navbar, larger nav links, and student-bg gradient main.

Open `frontend/app/student/layout.tsx` and locate the `return (` inside `StudentLayoutContent`. Replace from `return (` through the closing `);` of that function with this:

```tsx
  return (
    <div className="min-h-screen bg-student-bg font-nunito">
      <OfflineBanner />

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 bg-white border-b border-slate-100 shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
        <div className="flex items-center gap-6 px-4 lg:px-6 min-h-[72px] sm:min-h-[88px] max-w-6xl mx-auto">
          {/* Logo */}
          <Link href="/student/home" className="flex items-center gap-2.5 shrink-0">
            <span className="text-3xl sm:text-4xl animate-spinSlow">⭐</span>
            <span className="font-baloo font-extrabold text-xl sm:text-2xl text-slate-900 tracking-tight hidden sm:inline">
              PrimePal
            </span>
          </Link>

          {/* Desktop nav (centered) */}
          <div className="hidden md:flex items-center gap-1.5 flex-1 justify-center">
            {NAV_LINKS.map(({ href, label, icon }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  onMouseEnter={() => handlePrefetch(href)}
                  onFocus={() => handlePrefetch(href)}
                  className={[
                    "flex items-center gap-2 px-4 lg:px-5 py-3 rounded-2xl",
                    "font-baloo font-extrabold text-base lg:text-lg",
                    "transition-all duration-150",
                    active
                      ? "bg-pill-active text-pink-900 shadow-[0_4px_14px_rgba(236,72,153,0.18)]"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 hover:-translate-y-0.5",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "text-xl lg:text-2xl",
                      active ? "animate-bounceSoft" : "",
                    ].join(" ")}
                  >
                    {icon}
                  </span>
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>

          {/* Right side: streak + points + logout */}
          <div className="flex items-center gap-2 shrink-0">
            {loading && (
              <div className="flex items-center gap-2 animate-pulse">
                <div className="w-9 h-9 rounded-2xl bg-slate-200" />
                <div className="h-9 w-16 rounded-2xl bg-slate-200" />
              </div>
            )}

            {!loading && profile && (
              <>
                <StreakCounter
                  currentStreak={streak?.current_streak ?? 0}
                  longestStreak={streak?.longest_streak ?? 0}
                />
                <div className="flex items-center gap-1.5 bg-gradient-to-br from-amber-200 to-amber-300 rounded-2xl px-3 lg:px-4 py-2.5 shadow-[0_4px_10px_rgba(245,158,11,0.15)]">
                  <span className="text-base lg:text-lg">⭐</span>
                  <span className="font-baloo font-extrabold text-sm lg:text-base text-amber-900">
                    {profile.points}
                  </span>
                </div>
              </>
            )}

            <button
              onClick={handleLogout}
              className="bg-gradient-to-br from-red-200 to-red-300 text-red-900 text-xs lg:text-sm font-baloo font-extrabold px-3 lg:px-4 py-2.5 rounded-2xl
                         hover:from-red-300 hover:to-red-400 transition-all duration-150 shadow-[0_4px_10px_rgba(239,68,68,0.15)]"
              aria-label="Logout"
            >
              Out 👋
            </button>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden flex flex-col gap-1 p-1.5 ml-1"
              aria-label="Toggle menu"
            >
              <span className="w-5 h-0.5 bg-slate-700 rounded-full" />
              <span className="w-5 h-0.5 bg-slate-700 rounded-full" />
              <span className="w-5 h-0.5 bg-slate-700 rounded-full" />
            </button>
          </div>
        </div>

        {/* Mobile nav dropdown */}
        {mobileOpen && (
          <div className="md:hidden bg-white border-t border-slate-100 px-4 pb-3 pt-2">
            <div className="flex flex-wrap gap-2">
              {NAV_LINKS.map(({ href, label, icon }) => {
                const active = pathname === href || pathname.startsWith(href + "/");
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className={[
                      "flex items-center gap-1.5 px-3 py-2 rounded-2xl text-sm font-baloo font-extrabold transition-all",
                      active
                        ? "bg-pill-active text-pink-900"
                        : "text-slate-700 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    <span>{icon}</span>
                    <span>{label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* ── Main content ── */}
      <main className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 max-w-6xl mx-auto">
        {children}
      </main>
    </div>
  );
```

(All imports and variables — `pathname`, `router`, `mobileOpen`, `profile`, `streak`, `loading`, `handlePrefetch`, `handleLogout`, `NAV_LINKS` — are already declared earlier in the file. Do not change them.)

- [ ] **Step 2:** Typecheck

```bash
cd frontend && npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3:** Visual smoke check
  - Open `/student/home` in dev server.
  - Navbar is white with rotating ⭐ on the left.
  - Five nav links centered, the active one is a pink/lavender pill with bouncing icon.
  - Streak chip + ⭐ chip + Out button align to the right and are taller than before.
  - Click each nav link — navigation still works.
  - Resize to <768px — hamburger appears, click opens drawer with same styling.
  - Click Out — logs out and redirects to `/student/play`.

- [ ] **Step 4:** Commit

```bash
git add frontend/app/student/layout.tsx
git commit -m "feat(student-ui): redesign student layout navbar and shell"
```

---

## Phase 4 — Home Page

### Task 7: Restyle home page

**Files:**
- Modify: `frontend/app/student/home/page.tsx`

- [ ] **Step 1:** Replace the entire file with this content

```tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useStudentProfile,
  useStreak,
  useDailySummary,
  useAchievements,
  usePointsBreakdown,
  type AchievementProgress,
} from "@/lib/hooks/queries";
import AchievementPopup from "@/components/student/AchievementPopup";
import PageHero from "@/components/student/PageHero";
import SectionHeading from "@/components/student/SectionHeading";
import ActivityCard from "@/components/student/ActivityCard";

const ACTIVITY_CARDS = [
  { href: "/student/missions",    icon: "🎯", title: "Daily Missions",    subtitle: "Earn stars across 4 pillars — let's go!", tone: "purple" as const, wide: true,  badge: "NEW" },
  { href: "/student/chat",        icon: "💬", title: "Chat",              subtitle: "Ask PrimePal anything",                  tone: "pink"   as const },
  { href: "/student/spelling-bee",icon: "🐝", title: "Spelling Bee",      subtitle: "30-second challenge",                    tone: "amber"  as const },
  { href: "/student/scores",      icon: "📊", title: "My Scores",         subtitle: "See your progress",                      tone: "cyan"   as const },
  { href: "/student/story-time",  icon: "📖", title: "Story Time",        subtitle: "Read & answer",                          tone: "emerald"as const },
];

const STAGGER = ["", "[animation-delay:50ms]", "[animation-delay:100ms]", "[animation-delay:150ms]", "[animation-delay:200ms]"];

export default function HomePage() {
  const router = useRouter();

  const { data: profile, isLoading: loadingProfile } = useStudentProfile();
  const { data: streak } = useStreak();
  const { data: dailySummary } = useDailySummary();
  const { data: achievementsData } = useAchievements();
  const { data: pointsBreakdown } = usePointsBreakdown();

  const [achievementPopup, setAchievementPopup] = useState<{ name: string; icon: string; tier: "bronze" | "silver" | "gold" } | null>(null);
  const [streakResetBanner, setStreakResetBanner] = useState(false);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("primepal_student_token") : null;
    if (!token) router.push("/student/play");
  }, [router]);

  useEffect(() => {
    if (streak && streak.current_streak === 0 && streak.longest_streak > 0) {
      setStreakResetBanner(true);
      setTimeout(() => setStreakResetBanner(false), 6000);
    }
  }, [streak]);

  const points = profile?.points ?? 0;
  const name = profile?.student_name
    ?? (typeof window !== "undefined" ? localStorage.getItem("primepal_student_name") : null)
    ?? "Champion";
  const firstName = name.split(" ")[0];

  const todayPoints = dailySummary?.today_points ?? 0;
  const heroPills = [
    { icon: "⭐", label: `${points} Stars`, variant: "white" as const },
    ...(todayPoints > 0 ? [{ label: `+${todayPoints} today`, variant: "amber" as const }] : []),
  ];

  // Daily progress: count today's distinct activities
  const todayActivityCount = pointsBreakdown?.today?.length ?? 0;
  const dailyGoal = 3;
  const progressPct = Math.min(100, Math.round((todayActivityCount / dailyGoal) * 100));

  // Achievements: always show 5 slots
  const unlocked = achievementsData?.achievements.filter((b: AchievementProgress) => b.unlocked) ?? [];
  const locked = achievementsData?.achievements.filter((b: AchievementProgress) => !b.unlocked) ?? [];
  const visibleAchievements: AchievementProgress[] = [
    ...unlocked.slice(0, 5),
    ...locked.slice(0, Math.max(0, 5 - unlocked.length)),
  ];

  return (
    <div className="space-y-6 sm:space-y-8 pb-10">
      {/* Streak reset banner */}
      {streakResetBanner && (
        <div className="w-full rounded-2xl bg-gradient-to-r from-pink-100 to-violet-100 border-2 border-pink-200 p-3 text-center animate-slideUp">
          <p className="text-sm font-baloo font-extrabold text-pink-700">
            Your streak reset — let&apos;s start a new one! 💪
          </p>
        </div>
      )}

      {/* ① Hero */}
      {loadingProfile ? (
        <div className="w-full rounded-3xl bg-student-hero p-8 animate-pulse min-h-[180px] sm:min-h-[220px] flex justify-between items-center">
          <div className="space-y-3">
            <div className="h-4 w-28 bg-white/50 rounded-full" />
            <div className="h-12 w-56 bg-white/60 rounded-full" />
            <div className="h-4 w-40 bg-white/40 rounded-full" />
            <div className="h-9 w-44 bg-white/50 rounded-full" />
          </div>
          <div className="h-24 w-24 bg-white/50 rounded-full" />
        </div>
      ) : (
        <PageHero
          label="WELCOME BACK!"
          name={`Hi ${firstName}!`}
          waveEmoji="👋"
          subtitle={profile?.roll_number ? `Roll No: ${profile.roll_number}` : undefined}
          pills={heroPills}
          mascot="🦄"
        />
      )}

      {/* ② Activity cards */}
      <section>
        <SectionHeading icon="🎮" title="Play Now" tone="pink" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {ACTIVITY_CARDS.map((card, i) => (
            <ActivityCard
              key={card.href}
              href={card.href}
              icon={card.icon}
              title={card.title}
              subtitle={card.subtitle}
              tone={card.tone}
              wide={card.wide}
              badge={card.badge}
              delayClass={STAGGER[i]}
            />
          ))}
        </div>
      </section>

      {/* ③ Today's Adventure progress */}
      <section className="bg-white rounded-3xl border-2 border-amber-100 p-6 flex items-center gap-5 shadow-[0_8px_24px_rgba(251,191,36,0.10)]">
        <span className="text-4xl sm:text-5xl animate-bounceSoft">🚀</span>
        <div className="flex-1 min-w-0">
          <p className="font-baloo font-extrabold text-lg sm:text-xl text-slate-900">Today&apos;s Adventure</p>
          <p className="font-nunito font-semibold text-xs sm:text-sm text-slate-500 mt-0.5">
            Complete {dailyGoal} activities to keep your streak alive!
          </p>
        </div>
        <div className="hidden sm:block w-48 lg:w-60 h-3.5 rounded-full bg-amber-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-400 to-pink-400 animate-shimmer"
            style={{ width: `${progressPct}%`, backgroundSize: "200% 100%" }}
          />
        </div>
        <span className="font-baloo font-extrabold text-base sm:text-lg text-amber-700 shrink-0">
          {todayActivityCount} / {dailyGoal}
        </span>
      </section>

      {/* ④ Badges */}
      <section>
        <SectionHeading
          icon="🏅"
          title="Your Badges"
          tone="amber"
          rightHref="/student/achievements"
          rightLabel="See all →"
        />
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 sm:gap-4">
          {visibleAchievements.length === 0 && !loadingProfile && (
            <div className="col-span-3 sm:col-span-5 flex flex-col items-center gap-2 py-6 rounded-2xl border-2 border-amber-100 bg-white text-center">
              <span className="text-3xl">🏅</span>
              <span className="text-sm font-baloo font-extrabold text-amber-700/70">
                No badges yet — keep learning!
              </span>
            </div>
          )}
          {visibleAchievements.map((badge) => (
            <div
              key={badge.id}
              className={[
                "flex flex-col items-center gap-1.5 py-5 px-2 rounded-2xl border-2 bg-white",
                "transition-all duration-200 hover:-translate-y-1 hover:border-violet-300 hover:shadow-[0_10px_24px_rgba(167,139,250,0.18)]",
                "group cursor-pointer",
                badge.unlocked ? "border-amber-200" : "border-slate-200 opacity-60",
              ].join(" ")}
              title={badge.name}
            >
              <span
                className={[
                  "text-3xl sm:text-4xl transition-transform duration-300",
                  "group-hover:scale-110 group-hover:rotate-[8deg]",
                  badge.unlocked ? "" : "grayscale",
                ].join(" ")}
              >
                {badge.icon}
              </span>
              <span className="text-[11px] sm:text-xs font-baloo font-extrabold text-slate-900 text-center leading-tight">
                {badge.name}
              </span>
              {badge.unlocked ? (
                <span className="text-[10px] font-baloo font-extrabold bg-amber-300 text-amber-950 rounded-full px-2 py-0.5">
                  UNLOCKED
                </span>
              ) : (
                <span className="text-[10px] font-nunito font-semibold text-slate-400">
                  {badge.current_progress}/{badge.threshold_value}
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Achievement popup */}
      {achievementPopup && (
        <AchievementPopup
          name={achievementPopup.name}
          icon={achievementPopup.icon}
          tier={achievementPopup.tier}
          onDismiss={() => setAchievementPopup(null)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2:** Typecheck

```bash
cd frontend && npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3:** Visual smoke check
  - `/student/home` renders pastel hero with floating 🦄 and waving 👋.
  - 5 activity cards in a 3+2 grid (Daily Missions spans 2 on desktop, has a NEW badge that pulses).
  - "Today's Adventure" white card shows 🚀 + shimmer progress bar.
  - Badge row always shows up to 5 tiles (locked/unlocked).
  - Hover an activity card — it lifts/tilts, icon scales.
  - Hover a badge tile — it lifts, icon wiggles.
  - Click each card → navigates to corresponding page.

- [ ] **Step 4:** Commit

```bash
git add frontend/app/student/home/page.tsx
git commit -m "feat(student-ui): restyle home page with new hero, cards, progress bar"
```

---

## Phase 5 — Missions

### Task 8: Restyle missions index (`MissionsDashboard`)

**Files:**
- Read first: `frontend/components/student/MissionsDashboard.tsx`
- Modify: `frontend/components/student/MissionsDashboard.tsx`
- (Optionally) Read: `frontend/app/student/missions/page.tsx`

- [ ] **Step 1:** Open `MissionsDashboard.tsx`. The component currently renders a header, a performance banner, and a grid of `PillarCard`s. Make these targeted changes:

  1. **Page hero:** at the very top of the rendered output, before any existing header, insert:

     ```tsx
     import PageHero from "@/components/student/PageHero";
     import SectionHeading from "@/components/student/SectionHeading";

     // ...inside the JSX, replace the existing header (the page title + subtitle block) with:
     <PageHero
       label="DAILY MISSIONS"
       name="Pick a Pillar"
       subtitle="Each pillar has fresh challenges every day."
       mascot="🎯"
     />
     ```

  2. **Section heading above pillar grid:** wrap the existing pillar grid inside a `<section>` and add a heading above it:

     ```tsx
     <section>
       <SectionHeading icon="🧭" title="Choose Your Pillar" tone="violet" />
       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
         {/* existing PillarCard renders */}
       </div>
     </section>
     ```

  3. **Performance banner:** if there's an existing performance banner div, change its outer classes to:

     ```
     bg-white rounded-3xl p-6 border-2 border-amber-100
     shadow-[0_8px_24px_rgba(251,191,36,0.10)]
     ```

     and ensure the accuracy chip uses pastel green (≥70%), amber (≥40%), rose (else):

     ```tsx
     const accuracyTone =
       accuracy >= 70 ? "bg-emerald-100 text-emerald-700"
       : accuracy >= 40 ? "bg-amber-100 text-amber-700"
       : "bg-rose-100 text-rose-700";
     ```

  4. **Container/spacing:** ensure the outermost wrapper uses `space-y-6 sm:space-y-8 pb-10` (drop any `max-w-2xl`/`max-w-3xl` constraints — the layout shell handles width).

  Do not change any data fetching, query keys, conditional rendering of empty/loading states, or behavior of click handlers.

- [ ] **Step 2:** Update `PillarCard.tsx` styling. Open `frontend/components/student/PillarCard.tsx` and update the outer card class string only:

  - **Replace** the existing card root class string with:

    ```
    group relative overflow-hidden rounded-3xl p-7 min-h-[160px]
    flex flex-col justify-between text-white
    transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]
    hover:-translate-y-1.5 hover:rotate-[-0.3deg]
    hover:shadow-[0_24px_48px_rgba(0,0,0,0.18)]
    shadow-[0_12px_24px_rgba(15,23,42,0.10)]
    animate-slideUp
    ```

  - The pillar-color tone classes already in the file (e.g. `from-blue-400 to-blue-600`) stay — only the structural classes change.
  - Increase title to `text-2xl sm:text-[26px] font-baloo font-extrabold leading-tight`.
  - Increase icon to `text-5xl sm:text-6xl`.
  - If the card already wraps a `<Link>`, leave the routing intact.

- [ ] **Step 3:** Typecheck

```bash
cd frontend && npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 4:** Visual smoke check
  - `/student/missions` renders new PageHero with 🎯.
  - "Choose Your Pillar" section heading.
  - 4 pillar cards in 2-column grid, each with bigger icons, hover lift.
  - Click a pillar → still navigates to `/student/missions/[pillar]`.
  - Performance banner (if you have data) renders as a soft white card.

- [ ] **Step 5:** Commit

```bash
git add frontend/components/student/MissionsDashboard.tsx frontend/components/student/PillarCard.tsx
git commit -m "feat(student-ui): restyle missions index with hero and updated pillar cards"
```

### Task 9: Polish mission gameplay wrapper

**Files:**
- Modify: `frontend/app/student/missions/[pillar]/page.tsx`

- [ ] **Step 1:** Open the file. Locate the loading state's gradient (e.g., `bg-gradient-to-br from-slate-50 to-slate-100`) and replace with `bg-student-bg`. Locate any `max-w-2xl`/`max-w-3xl` wrappers and replace with `max-w-4xl`.

- [ ] **Step 2:** Locate the `MissionGameplay` outer wrapper. Wrap it in:

```tsx
<div className="bg-white rounded-3xl shadow-[0_12px_40px_rgba(15,23,42,0.06)] p-4 sm:p-6">
  {/* existing MissionGameplay */}
</div>
```

Do NOT modify `MissionGameplay.tsx` internals (state machine, offline queue, question rendering).

- [ ] **Step 3:** Typecheck

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 4:** Smoke check: open a pillar, play through one question — answer submission, scoring, timer, offline behavior all unchanged.

- [ ] **Step 5:** Commit

```bash
git add frontend/app/student/missions/\[pillar\]/page.tsx
git commit -m "feat(student-ui): polish mission gameplay wrapper styling"
```

---

## Phase 6 — Chat Page

### Task 10: Restyle chat page

**Files:**
- Read first: `frontend/app/student/chat/page.tsx`
- Modify: `frontend/app/student/chat/page.tsx`

- [ ] **Step 1:** This page uses full-height layout (`h-[calc(100vh-64px)]`). Update three things:

  1. **Background:** change `bg-yellow-50` (or whatever the current `<div>` wrapping background uses) to `bg-student-bg`.

  2. **Height:** change `h-[calc(100vh-64px)]` to `h-[calc(100vh-72px)] sm:h-[calc(100vh-88px)]` (matches new navbar height).

  3. **Header bar:** if there's a header at the top of the page (PrimePal avatar + title), restyle it as:

     ```tsx
     <div className="flex items-center gap-3 px-4 sm:px-6 py-4 bg-white border-b border-slate-100">
       <div className="w-12 h-12 rounded-2xl bg-card-pink flex items-center justify-center text-2xl shadow-[0_4px_12px_rgba(236,72,153,0.25)]">
         💬
       </div>
       <div>
         <p className="font-baloo font-extrabold text-lg text-slate-900">PrimePal</p>
         <p className="font-nunito font-semibold text-xs text-slate-500">Your friendly tutor</p>
       </div>
     </div>
     ```

  4. **Message bubbles:** locate the className strings for student vs assistant bubbles. Update:

     - Student bubble (right-aligned): `bg-gradient-to-br from-pink-200 to-pink-300 text-pink-950 rounded-3xl rounded-tr-md px-4 py-3 font-nunito font-semibold text-sm sm:text-base`
     - Assistant bubble (left-aligned): `bg-white border border-violet-100 text-slate-900 rounded-3xl rounded-tl-md px-4 py-3 font-nunito font-semibold text-sm sm:text-base shadow-[0_2px_8px_rgba(15,23,42,0.04)]`

  5. **Composer footer:** the input/textarea row at the bottom. Wrap it in:

     ```tsx
     <div className="px-4 sm:px-6 py-4 bg-white border-t border-slate-100">
       <div className="flex gap-2 items-end max-w-3xl mx-auto">
         {/* existing textarea — give it: rounded-2xl border-slate-200 px-4 py-3 text-sm sm:text-base */}
         {/* existing send button — give it: rounded-2xl bg-card-pink text-white px-5 py-3 font-baloo font-extrabold shadow-[0_6px_14px_rgba(219,39,119,0.25)] */}
       </div>
     </div>
     ```

  Do NOT change: streaming token rendering, message-state useEffects, sessionStorage persistence, Urdu translation toggle behavior, scroll-to-bottom logic, or the `studentFetch`/SSE setup.

- [ ] **Step 2:** Typecheck

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 3:** Smoke check
  - `/student/chat` opens, header shows PrimePal pill, gradient bg.
  - Type a message, hit send — streaming response appears in white bubble.
  - Toggle Urdu — translation still loads.
  - Scroll behavior unchanged.

- [ ] **Step 4:** Commit

```bash
git add frontend/app/student/chat/page.tsx
git commit -m "feat(student-ui): restyle chat page bubbles, header, composer"
```

---

## Phase 7 — Spelling Bee

### Task 11: Restyle spelling-bee page

**Files:**
- Read first: `frontend/app/student/spelling-bee/page.tsx`
- Modify: `frontend/app/student/spelling-bee/page.tsx`

- [ ] **Step 1:** Make these targeted changes:

  1. **Container:** change `max-w-2xl` → `max-w-3xl`. Outer page bg from any `bg-gradient-to-br from-amber-50 to-yellow-50` → just rely on the layout's `bg-student-bg` (drop the override).

  2. **Add hero:** at the top, add:

     ```tsx
     import PageHero from "@/components/student/PageHero";
     // ...
     <PageHero
       label="SPELLING BEE"
       name="Buzz Buzz!"
       subtitle="You have 30 seconds. Listen, then spell."
       mascot="🐝"
     />
     ```

  3. **Score chip in header:** restyle to `bg-gradient-to-br from-amber-200 to-amber-300 text-amber-900 px-4 py-2 rounded-2xl font-baloo font-extrabold`.

  4. **Word/blanks card:** wrap in `bg-white rounded-3xl p-6 sm:p-8 shadow-[0_12px_40px_rgba(15,23,42,0.06)]` and bump letter-blank size to `text-3xl sm:text-4xl`.

  5. **Speak button (primary):** keep tactile shadow but use new colors:

     ```
     bg-gradient-to-br from-amber-400 to-amber-500 text-white
     px-6 py-4 rounded-2xl font-baloo font-extrabold text-lg
     shadow-[0_6px_0_#b45309,0_8px_18px_rgba(245,158,11,0.3)]
     active:translate-y-1 active:shadow-[0_2px_0_#b45309]
     ```

  6. **Input field:** `rounded-2xl border-2 border-amber-200 px-4 py-3 text-lg font-baloo font-extrabold`.

  7. **Result/completion modal:** keep the popIn animation, but update inner card to `bg-white rounded-3xl p-6 shadow-[0_24px_48px_rgba(0,0,0,0.18)]`.

  Do NOT change: speech synthesis (`speechSynthesis.speak()` setup), attempt counter logic, points-per-attempt scoring, completion state machine, or the words list fetch.

- [ ] **Step 2:** Typecheck

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 3:** Smoke check
  - `/student/spelling-bee` renders hero with 🐝.
  - Speak button reads the word aloud.
  - Type correct answer → result message appears, score updates.
  - Type wrong answer → second attempt allowed.
  - Completion modal renders.

- [ ] **Step 4:** Commit

```bash
git add frontend/app/student/spelling-bee/page.tsx
git commit -m "feat(student-ui): restyle spelling-bee with hero and updated cards"
```

---

## Phase 8 — Story Time

### Task 12: Restyle story-time page

**Files:**
- Read first: `frontend/app/student/story-time/page.tsx`
- Modify: `frontend/app/student/story-time/page.tsx`

- [ ] **Step 1:** Targeted changes:

  1. Container `max-w-2xl` → `max-w-3xl`. Drop any `bg-gradient-to-br from-emerald-50…` override (let layout's `bg-student-bg` show through).

  2. Add hero at top:

     ```tsx
     import PageHero from "@/components/student/PageHero";
     <PageHero
       label="STORY TIME"
       name="Read & Discover"
       subtitle="Read the story, then answer the questions."
       mascot="📖"
     />
     ```

  3. **Story card** (reading phase): `bg-white rounded-3xl p-6 sm:p-8 border-2 border-emerald-100 shadow-[0_12px_40px_rgba(15,23,42,0.06)]`. Story body text size `text-base sm:text-lg leading-relaxed font-nunito`.

  4. **Audio button:** `bg-gradient-to-br from-emerald-400 to-emerald-500 text-white px-5 py-3 rounded-2xl font-baloo font-extrabold shadow-[0_4px_12px_rgba(16,185,129,0.3)]`.

  5. **Question card** (questioning phase): same `bg-white rounded-3xl …` shell. Question text `text-xl sm:text-2xl font-baloo font-extrabold text-slate-900`.

  6. **Multiple-choice options:** each option is `block w-full text-left bg-white border-2 border-slate-200 rounded-2xl px-5 py-4 font-nunito font-semibold text-base hover:border-emerald-300 hover:bg-emerald-50 transition-all`. Selected state: `border-emerald-400 bg-emerald-50`. Correct: `border-emerald-500 bg-emerald-100 text-emerald-900`. Wrong: `border-rose-400 bg-rose-50 text-rose-900`.

  7. **Progress bar:** `h-3 rounded-full bg-emerald-100 overflow-hidden` with inner `bg-gradient-to-r from-emerald-400 to-teal-400 transition-all duration-500`.

  Do NOT change: `gameState` state machine, scoring (10 points per correct), question fetching, or any setState logic.

- [ ] **Step 2:** Typecheck

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 3:** Smoke check
  - Renders hero + story card.
  - Audio button plays story.
  - Click "Start questions" → questioning phase.
  - Click an option → correct/wrong styling shows.
  - Progress through all questions → final state shows.

- [ ] **Step 4:** Commit

```bash
git add frontend/app/student/story-time/page.tsx
git commit -m "feat(student-ui): restyle story-time page"
```

---

## Phase 9 — Scores

### Task 13: Restyle scores page

**Files:**
- Read first: `frontend/app/student/scores/page.tsx`
- Modify: `frontend/app/student/scores/page.tsx`

- [ ] **Step 1:** Targeted changes:

  1. Add hero:

     ```tsx
     import PageHero from "@/components/student/PageHero";
     import SectionHeading from "@/components/student/SectionHeading";
     <PageHero
       label="MY SCORES"
       name="Your Progress"
       subtitle="See how far you've come!"
       mascot="📊"
     />
     ```

  2. Wrap stat cards in `<section>` with `<SectionHeading icon="📈" title="At a Glance" tone="blue" />`.

  3. **Stat cards** (Questions, Stars, Accuracy): use new card geometry. Each stat card:

     ```
     bg-white rounded-3xl p-6 border-2 border-slate-100
     shadow-[0_8px_24px_rgba(15,23,42,0.06)]
     transition-transform duration-200 hover:-translate-y-1
     animate-slideUp
     ```

     With colored gradient icon badge inside (using `bg-card-cyan/blue/amber/emerald` — pick one per stat). Stat value: `text-4xl sm:text-5xl font-baloo font-extrabold text-slate-900`.

  4. **Pillar breakdown:** wrap in `<section>` with `<SectionHeading icon="🎯" title="By Pillar" tone="violet" />`. Each pillar row: white card with a colored left-edge accent (`border-l-4 border-l-emerald-400` for reading, `border-l-violet-400` for writing, etc.), `rounded-2xl px-5 py-4 mb-3`.

  5. Time-filter dropdown: restyle to `bg-white rounded-2xl border-2 border-slate-200 px-4 py-2 font-baloo font-extrabold text-sm`.

  Do NOT change: data fetching hooks, accuracy threshold colors logic, time-filter state, skeleton loader presence (just restyle the skeleton to match).

- [ ] **Step 2:** Typecheck

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 3:** Smoke check
  - `/student/scores` renders hero.
  - Stat cards stagger in.
  - Time filter changes data.
  - Pillar breakdown shows correctly.

- [ ] **Step 4:** Commit

```bash
git add frontend/app/student/scores/page.tsx
git commit -m "feat(student-ui): restyle scores page"
```

---

## Phase 10 — Achievements

### Task 14: Restyle achievements page

**Files:**
- Read first: `frontend/app/student/achievements/page.tsx`
- Modify: `frontend/app/student/achievements/page.tsx`

- [ ] **Step 1:** Targeted changes:

  1. Container `max-w-md` → drop it (use layout default `max-w-6xl`).

  2. Add hero:

     ```tsx
     import PageHero from "@/components/student/PageHero";
     import SectionHeading from "@/components/student/SectionHeading";
     <PageHero
       label="YOUR BADGES"
       name="Trophy Cabinet"
       subtitle="Collect them all!"
       mascot="🏆"
     />
     ```

  3. **Earned section:** `<SectionHeading icon="✨" title="Earned" tone="amber" />` then grid `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4`. Each unlocked card:

     ```
     bg-white rounded-3xl p-5 border-2 border-amber-200
     shadow-[0_8px_24px_rgba(251,191,36,0.12)]
     flex flex-col items-center gap-2
     transition-transform duration-200 hover:-translate-y-1
     ```

     Tier-colored badge ring around icon: bronze `from-orange-300 to-orange-500`, silver `from-slate-300 to-slate-500`, gold `from-yellow-300 to-yellow-500`. Icon size `text-5xl sm:text-6xl`. Name `font-baloo font-extrabold text-base text-center`. Earned date `font-nunito font-semibold text-xs text-slate-500`.

  4. **Locked section:** `<SectionHeading icon="🔒" title="Coming Up" tone="violet" />` then same grid. Locked card:

     ```
     bg-slate-50 rounded-3xl p-5 border-2 border-slate-200 opacity-70
     flex flex-col items-center gap-2
     ```

     Icon `grayscale`. Progress chip at bottom: `bg-slate-200 text-slate-600 px-2.5 py-0.5 rounded-full text-xs font-baloo font-extrabold`.

  Do NOT change: achievement data fetching, tier logic, popup behavior.

- [ ] **Step 2:** Typecheck

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 3:** Smoke check
  - Renders hero + Earned + Coming Up.
  - Both grids render at appropriate sizes.

- [ ] **Step 4:** Commit

```bash
git add frontend/app/student/achievements/page.tsx
git commit -m "feat(student-ui): restyle achievements page"
```

---

## Phase 11 — Evaluation

### Task 15: Restyle evaluation page

**Files:**
- Read first: `frontend/app/student/evaluation/page.tsx`
- Modify: `frontend/app/student/evaluation/page.tsx`

- [ ] **Step 1:** Targeted changes:

  1. Container `max-w-lg` → `max-w-3xl`.

  2. **Progress bar:** `h-3 rounded-full bg-violet-100 overflow-hidden` with inner `bg-gradient-to-r from-violet-400 to-pink-400 transition-all duration-500`.

  3. **Question card:** `bg-white rounded-3xl p-6 sm:p-8 shadow-[0_12px_40px_rgba(15,23,42,0.06)]`. Question text `text-xl sm:text-2xl font-baloo font-extrabold text-slate-900 leading-snug`.

  4. **Section badge:** existing pill (purple/blue) — restyle to:

     ```
     inline-flex items-center gap-1.5 bg-gradient-to-br from-violet-200 to-violet-300
     text-violet-900 px-3 py-1 rounded-full text-xs font-baloo font-extrabold
     ```

  5. **Likert emoji grid:** each option becomes a tactile pastel card:

     ```
     flex flex-col items-center gap-1.5 p-4 rounded-2xl
     bg-white border-2 border-slate-200
     hover:border-violet-300 hover:bg-violet-50
     transition-all duration-150
     active:translate-y-1
     ```

     Emoji `text-4xl sm:text-5xl`. Label `font-baloo font-extrabold text-sm`.

  6. **MCQ list options:** same pattern as Story Time options.

  7. **Audio buttons:** keep amber for listening, emerald for speaking, but use new shape `rounded-2xl px-5 py-3 font-baloo font-extrabold`.

  8. **Nav buttons (back/next/finish):** keep tactile `shadow-[0_3px_0_…]`, but use:
     - Back: `bg-slate-200 text-slate-700 shadow-[0_3px_0_#94a3b8]`
     - Next: `bg-gradient-to-br from-violet-400 to-violet-500 text-white shadow-[0_3px_0_#5b21b6]`
     - Finish: `bg-gradient-to-br from-emerald-400 to-emerald-500 text-white shadow-[0_3px_0_#065f46]`

  Do NOT change: question state machine, answer persistence, or scoring logic.

- [ ] **Step 2:** Typecheck

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 3:** Smoke check
  - Step through evaluation: Likert, MCQ, listening, speaking, complete.

- [ ] **Step 4:** Commit

```bash
git add frontend/app/student/evaluation/page.tsx
git commit -m "feat(student-ui): restyle evaluation page"
```

---

## Phase 12 — Play (pre-auth)

### Task 16: Update play page color tokens only

**Files:**
- Read first: `frontend/app/student/play/page.tsx`, `avatar-select.tsx`, `pin-entry.tsx`
- Modify: same three files

- [ ] **Step 1:** This page has its own layout (no main nav). Make conservative changes:

  1. **Page background:** wherever `bg-cream` is set on the page wrapper, replace with `bg-student-bg`.

  2. **Top header bar (if present):** if it's `bg-amber-950`, change to `bg-white border-b border-slate-100` with logo color updated to `text-slate-900`.

  3. **Card surface:** the central wizard card — change to `bg-white rounded-3xl p-8 shadow-[0_24px_48px_rgba(168,85,247,0.10)]`.

  4. **Primary submit/continue button:** change gradient to `bg-gradient-to-br from-violet-400 to-violet-500 text-white shadow-[0_6px_0_#5b21b6,0_8px_18px_rgba(124,58,237,0.3)] active:translate-y-1 active:shadow-[0_2px_0_#5b21b6]`. Keep the tactile feel.

  5. **Secondary/back button:** `bg-slate-100 text-slate-700 shadow-[0_3px_0_#94a3b8]`.

  6. **Mascot/decorative SVG:** keep as-is, just ensure float animation classname is `animate-floatUp` (no change needed if already so).

  7. **avatar-select.tsx:** keep image rings and theme-color top strips. Only change card background to `bg-white` (if it's currently cream) and selected ring to `ring-violet-400` instead of amber.

  8. **pin-entry.tsx:** PIN input borders → `border-slate-200`, focused → `border-violet-400`. Keypad buttons (if any) → `bg-white border-2 border-slate-200 hover:bg-violet-50 active:bg-violet-100 rounded-2xl`.

  Do NOT change: 3-step wizard state machine, class code validation, PIN auth flow, avatar fetching, error alert behavior.

- [ ] **Step 2:** Typecheck

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 3:** Smoke check (full login flow)
  - Open `/student/play` while logged out.
  - Enter a valid class code → student grid appears.
  - Pick a student → PIN entry appears.
  - Enter PIN → redirects to `/student/home`.
  - Wrong PIN → error alert shows.

- [ ] **Step 4:** Commit

```bash
git add frontend/app/student/play/page.tsx frontend/app/student/play/avatar-select.tsx frontend/app/student/play/pin-entry.tsx
git commit -m "feat(student-ui): update play page color tokens to new system"
```

---

## Phase 13 — QA Pass

### Task 17: Full build & smoke test

**Files:** none

- [ ] **Step 1:** Full build

```bash
cd frontend && npm run build
```

Expected: build succeeds, no errors.

- [ ] **Step 2:** Full typecheck

```bash
cd frontend && npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3:** Browser smoke test — go through this checklist on a real backend (or with a seeded test student):

  - [ ] **Login** — `/student/play` 3-step wizard works (code → student → PIN).
  - [ ] **Home** — hero, 5 cards, progress bar, badges all render. Streak chip shows correct number.
  - [ ] **Logout** — Out button clears tokens, redirects to play.
  - [ ] **Missions index** — pillar cards, performance banner.
  - [ ] **Mission gameplay** — start a mission, answer one question, see score update.
  - [ ] **Chat** — send a message, get streaming response, click Urdu translate.
  - [ ] **Spelling Bee** — hear a word, type correct/wrong answers, complete a round.
  - [ ] **Story Time** — read story, answer all questions, see final score.
  - [ ] **Scores** — stat cards, time filter, pillar breakdown.
  - [ ] **Achievements** — earned + locked sections render.
  - [ ] **Evaluation** — step through Likert + MCQ + audio prompts.
  - [ ] **Mobile (resize to 375px)** — every page above renders without horizontal scroll. Hamburger nav works.
  - [ ] **Reduced motion** — set Chrome DevTools "Emulate CSS prefers-reduced-motion" to "reduce". Reload home — mascot/blobs/wave should freeze.
  - [ ] **Console** — zero errors in console across all pages.
  - [ ] **Network** — no failing API calls compared to baseline.

- [ ] **Step 4:** If any item fails, fix it before proceeding. If a fix touches a page already committed, make a separate commit:

```bash
git commit -m "fix(student-ui): <specific issue>"
```

- [ ] **Step 5:** When all items pass, commit a marker:

```bash
git commit --allow-empty -m "chore(student-ui): redesign QA pass complete"
```

### Task 18: Self-review against spec

**Files:** read `docs/superpowers/specs/2026-05-08-student-ui-redesign-design.md`

- [ ] **Step 1:** Open the spec. For each numbered section in §6 Per-Page Treatment, verify the corresponding code change exists (use `git log --stat` and `git diff main..HEAD -- frontend/app/student/`).

- [ ] **Step 2:** For each item in §7.2 "Things explicitly not changing," do a quick grep to confirm those code paths are untouched:

```bash
git diff main..HEAD -- frontend/lib/hooks/queries.ts frontend/lib/api*.ts
git diff main..HEAD -- frontend/components/student/MissionGameplay.tsx
git diff main..HEAD -- frontend/components/student/AchievementPopup.tsx
```

Expected: minimal or zero diff in these files.

- [ ] **Step 3:** If anything from §6 or §7.2 isn't satisfied, return to that phase and fix.

---

## Phase 14 — Wrap-up

### Task 19: Final summary commit

**Files:** none

- [ ] **Step 1:** Push branch (if remote configured)

```bash
git push origin student-design-refactoring-branch
```

- [ ] **Step 2:** Inform user the implementation is ready for their review:

  > "Student UI redesign implemented across all pages on `student-design-refactoring-branch`. Spec at `docs/superpowers/specs/2026-05-08-student-ui-redesign-design.md`, plan at `docs/superpowers/plans/2026-05-08-student-ui-redesign.md`. Ready for your visual QA — start at `/student/home` after logging in."

---

## Self-Review (executed during plan writing)

**Spec coverage:**
- §4.1 Personality (pastel + saturated cards) → Tasks 1, 5 (tokens + ActivityCard).
- §4.2 Color tokens → Task 1.
- §4.3 Type scale → applied throughout Phases 3–12.
- §4.4 Spacing → Tasks 6, 7 (max-w-6xl, padding scale-up).
- §4.5 Shadow system → Tasks 5, 7, 8 (cards), Task 11, 15 (tactile-shadow exceptions).
- §4.6 Animations → Task 1 (keyframes), Task 2 (reduced-motion).
- §5.1 Layout/navbar → Task 6.
- §5.2 Shared atoms → Tasks 3, 4, 5.
- §6.1 Home → Task 7.
- §6.2 Missions index → Task 8.
- §6.3 Mission gameplay → Task 9.
- §6.4 Chat → Task 10.
- §6.5 Spelling Bee → Task 11.
- §6.6 Story Time → Task 12.
- §6.7 Scores → Task 13.
- §6.8 Achievements → Task 14.
- §6.9 Evaluation → Task 15.
- §6.10 Play → Task 16.
- §7.4 Testing surface → Task 17.

No gaps.

**Placeholder scan:** No "TBD"/"TODO"/"implement later". Each restyle task lists concrete class strings, even when applied to multiple sites in a file.

**Type consistency:** `PageHero`, `SectionHeading`, `ActivityCard` props are referenced consistently across Tasks 7–15. Tone names (`purple`, `pink`, `amber`, `cyan`, `emerald`, `blue`, `rose`, `violet`) match between the component definitions and their usage. Tailwind tokens (`bg-card-purple`, `bg-pill-active`, `bg-student-bg`, `bg-student-hero`) are defined in Task 1 and consumed throughout.
