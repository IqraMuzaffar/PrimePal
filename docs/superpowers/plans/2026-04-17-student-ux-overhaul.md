# Student UX Overhaul + Backend Mission Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the 500 crash on `/missions/daily`, add a full gamified student home dashboard with nav, achievements, and coming-soon feature cards, and update AI_CONTEXT.md to reflect current project state.

**Architecture:** Backend gets explicit try/except zones + logger around the RAG and LLM calls in `missions.py`. Frontend adds nav links + logout to the existing `layout.tsx`, creates a new `/home` page as the post-login destination, and enhances the missions loading screen with game-like animations. All student UI uses bubbly Tailwind button patterns.

**Tech Stack:** FastAPI (Python logging, HTTPException), Next.js 14 App Router, Tailwind CSS, `lucide-react`, `usePathname` (next/navigation)

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `backend/app/api/v1/endpoints/missions.py` | Modify | Add logger + try/except around RAG and LLM calls in `get_daily_missions` |
| `frontend/app/(student)/layout.tsx` | Modify | Add nav links (Home/Chat/Missions) + Logout button |
| `frontend/app/(student)/play/avatar-select.tsx` | Modify | Change post-login redirect from `/missions` to `/home` |
| `frontend/app/(student)/home/page.tsx` | **Create** | Full gamified student dashboard |
| `frontend/app/(student)/missions/page.tsx` | Modify | Enhanced loading screen + bubbly button polish |
| `AI_CONTEXT.md` | Modify | Full rewrite to reflect actual current state + future roadmap |

---

## Task 1: Fix `/missions/daily` — Add Logger and Try/Except

**Files:**
- Modify: `backend/app/api/v1/endpoints/missions.py`

- [ ] **Step 1: Add `logging` import and create module logger**

Open `backend/app/api/v1/endpoints/missions.py`. After the existing imports block (after line 26, before `router = APIRouter()`), add:

```python
import logging

logger = logging.getLogger(__name__)
```

- [ ] **Step 2: Wrap RAG retrieval in try/except**

Replace the Step 2 block in `get_daily_missions` (currently lines 135–140):

```python
    # ------------------------------------------------------------------
    # Step 2: Retrieve grade-filtered SNC context chunks
    # ------------------------------------------------------------------
    try:
        context_chunks = await retrieve_grade_filtered_chunks(
            query=_SEED_PHRASE,
            grade_level=grade_level,
            supabase_admin_client=supabase,
            match_count=5,
        )
        logger.info("RAG retrieval succeeded: %d chunks for grade %d", len(context_chunks), grade_level)
    except Exception as exc:
        logger.error(
            "RAG retrieval failed for classroom %s grade %d: %s",
            classroom_id, grade_level, exc, exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not retrieve curriculum content. Please try again shortly.",
        )
```

- [ ] **Step 3: Wrap LLM generation in try/except and guard None result**

Replace the Step 3 block in `get_daily_missions` (currently lines 144–148):

```python
    # ------------------------------------------------------------------
    # Step 3: Generate missions via LLM
    # ------------------------------------------------------------------
    try:
        missions: DailyMissions = await generate_daily_missions(
            grade_level=grade_level,
            context_chunks=context_chunks,
        )
        if missions is None:
            raise ValueError("generate_daily_missions returned None (structured output parse failure)")
        logger.info("Mission generation succeeded for grade %d, topic: %s", grade_level, missions.topic)
    except HTTPException:
        raise  # re-raise any HTTP exceptions unchanged
    except Exception as exc:
        logger.error(
            "LLM mission generation failed for classroom %s grade %d: %s",
            classroom_id, grade_level, exc, exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not generate missions right now. Please try again shortly.",
        )
```

- [ ] **Step 4: Verify the final shape of `get_daily_missions`**

The function body should now read (in order):
1. Classroom DB lookup → 404 guard (unchanged)
2. RAG retrieval wrapped in try/except → 503 on failure
3. LLM generation wrapped in try/except + None guard → 503 on failure
4. Strip answer and return (unchanged)

- [ ] **Step 5: Commit**

```bash
git add backend/app/api/v1/endpoints/missions.py
git commit -m "fix: add logger and try/except to get_daily_missions (RAG + LLM zones)"
```

---

## Task 2: Update Student Layout — Nav Links + Logout

**Files:**
- Modify: `frontend/app/(student)/layout.tsx`

- [ ] **Step 1: Replace the entire file with the new layout**

```tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

interface StudentProfile {
  student_id: string;
  student_name: string;
  avatar_url: string | null;
  points: number;
}

const NAV_LINKS = [
  { href: "/home",     label: "Home",     icon: "🏠" },
  { href: "/chat",     label: "Chat",     icon: "💬" },
  { href: "/missions", label: "Missions", icon: "🎯" },
];

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("primepal_student_token");
    if (!token) return;

    setLoading(true);
    apiFetch<StudentProfile>("/missions/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((data) => setProfile(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function handleLogout() {
    localStorage.removeItem("primepal_student_token");
    localStorage.removeItem("primepal_student_name");
    localStorage.removeItem("primepal_student_avatar");
    router.push("/play");
  }

  return (
    <div className="min-h-screen bg-yellow-50">
      {/* ── Top bar ── */}
      <header className="sticky top-0 z-20 bg-gradient-to-r from-yellow-400 to-orange-400 shadow-md">
        <div className="flex items-center justify-between px-4 py-2 gap-2">
          {/* Logo */}
          <Link href="/home" className="flex items-center gap-1.5 shrink-0">
            <span className="text-2xl leading-none">⭐</span>
            <span className="font-extrabold text-white text-lg tracking-tight drop-shadow-sm hidden sm:inline">
              PrimePal
            </span>
          </Link>

          {/* Nav links — center */}
          <nav className="flex items-center gap-1">
            {NAV_LINKS.map(({ href, label, icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={[
                    "flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-bold transition-all duration-150",
                    active
                      ? "bg-white text-orange-500 shadow-sm"
                      : "text-white hover:bg-white/20",
                  ].join(" ")}
                >
                  <span>{icon}</span>
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right: avatar + points + logout */}
          <div className="flex items-center gap-2 shrink-0">
            {loading && (
              <div className="flex items-center gap-2 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-white/40" />
                <div className="h-5 w-14 rounded-full bg-white/40" />
              </div>
            )}

            {!loading && profile && (
              <>
                {profile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatar_url}
                    alt={profile.student_name}
                    className="w-8 h-8 rounded-full border-2 border-white object-cover shadow-sm"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full border-2 border-white bg-white/30 flex items-center justify-center text-white font-bold text-sm">
                    {profile.student_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="bg-white/20 rounded-full px-2 py-0.5 text-white text-xs font-bold whitespace-nowrap">
                  ⭐ {profile.points}
                </span>
              </>
            )}

            <button
              onClick={handleLogout}
              className="bg-white/20 hover:bg-white/40 text-white text-xs font-bold px-3 py-1.5 rounded-full transition-all duration-150 border border-white/30"
              aria-label="Logout"
            >
              Out 👋
            </button>
          </div>
        </div>
      </header>

      <main className="p-4">{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/app/\(student\)/layout.tsx
git commit -m "feat: add nav links and logout button to student layout"
```

---

## Task 3: Fix Avatar-Select Redirect

**Files:**
- Modify: `frontend/app/(student)/play/avatar-select.tsx`

- [ ] **Step 1: Change the post-login redirect**

Find line 54:
```tsx
      router.push("/missions");
```

Replace with:
```tsx
      router.push("/home");
```

- [ ] **Step 2: Commit**

```bash
git add frontend/app/\(student\)/play/avatar-select.tsx
git commit -m "fix: redirect to /home after student login instead of /missions"
```

---

## Task 4: Create Student Home Dashboard

**Files:**
- Create: `frontend/app/(student)/home/page.tsx`

- [ ] **Step 1: Create the file with full content**

```tsx
"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";

// ── Types ────────────────────────────────────────────────────────────────────

interface StudentProfile {
  student_id: string;
  student_name: string;
  avatar_url: string | null;
  points: number;
}

// ── Badge definitions ────────────────────────────────────────────────────────

const BADGES = [
  { id: "first_star",    label: "First Star",    icon: "⭐", threshold: 1,   desc: "Earn your first point!" },
  { id: "on_fire",       label: "On Fire",        icon: "🔥", threshold: 50,  desc: "50 stars earned!" },
  { id: "star_learner",  label: "Star Learner",   icon: "💎", threshold: 100, desc: "100 stars — amazing!" },
  { id: "champion",      label: "Champion",       icon: "🏆", threshold: 200, desc: "200 stars — champion!" },
];

// ── Coming-soon cards ────────────────────────────────────────────────────────

const COMING_SOON = [
  { id: "leaderboard",  icon: "🏆", label: "Class Leaderboard",  tagline: "See who's on top!" },
  { id: "spelling_bee", icon: "🐝", label: "Spelling Bee",        tagline: "Can you spell it?" },
  { id: "story_time",   icon: "📖", label: "Story Time",          tagline: "Read & discover!" },
  { id: "speaking",     icon: "🎤", label: "Speaking Practice",   tagline: "Talk to PrimePal!" },
];

// ── Motivational quotes ──────────────────────────────────────────────────────

const QUOTES = [
  "Every word you learn is a superpower! 💪",
  "Keep going — you're amazing! 🌟",
  "Learning is your greatest adventure! 🚀",
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("primepal_student_token");
}

// ── Sub-components ───────────────────────────────────────────────────────────

function HeroSkeleton() {
  return (
    <div className="w-full rounded-3xl bg-gradient-to-r from-yellow-300 to-orange-300 p-6 animate-pulse flex justify-between items-center">
      <div className="space-y-2">
        <div className="h-7 w-40 bg-white/40 rounded-full" />
        <div className="h-5 w-28 bg-white/30 rounded-full" />
      </div>
      <div className="h-14 w-20 bg-white/40 rounded-2xl" />
    </div>
  );
}

function LockedCard({ icon, label, tagline }: { icon: string; label: string; tagline: string }) {
  const [shaking, setShaking] = useState(false);
  const [showTip, setShowTip] = useState(false);

  function handleClick() {
    if (shaking) return;
    setShaking(true);
    setShowTip(true);
    setTimeout(() => setShaking(false), 500);
    setTimeout(() => setShowTip(false), 2000);
  }

  return (
    <button
      onClick={handleClick}
      className={[
        "relative flex flex-col items-center justify-center gap-2 p-4 rounded-2xl",
        "bg-gray-100 border-2 border-gray-200 text-gray-400",
        "transition-all duration-150 select-none w-full",
        shaking ? "animate-[wiggle_0.4s_ease-in-out]" : "",
      ].join(" ")}
      aria-label={`${label} — coming soon`}
    >
      {/* Lock overlay */}
      <span className="absolute top-2 right-2 text-xs opacity-60">🔒</span>

      <span className="text-3xl opacity-50">{icon}</span>
      <span className="text-xs font-bold text-gray-400 text-center leading-tight">{label}</span>
      <span className="text-[11px] text-gray-300 text-center leading-tight">{tagline}</span>

      {/* Coming soon tooltip */}
      {showTip && (
        <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap z-10 animate-[fadeInDown_0.2s_ease-out]">
          Coming Soon! 🔒
        </span>
      )}
    </button>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [quoteFading, setQuoteFading] = useState(false);
  const quoteTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch profile
  useEffect(() => {
    const token = getToken();
    if (!token) { setLoadingProfile(false); return; }

    apiFetch<StudentProfile>("/missions/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(setProfile)
      .catch(() => {})
      .finally(() => setLoadingProfile(false));
  }, []);

  // Rotate quotes every 8s with a fade
  useEffect(() => {
    quoteTimer.current = setInterval(() => {
      setQuoteFading(true);
      setTimeout(() => {
        setQuoteIndex((i) => (i + 1) % QUOTES.length);
        setQuoteFading(false);
      }, 400);
    }, 8000);
    return () => { if (quoteTimer.current) clearInterval(quoteTimer.current); };
  }, []);

  const points = profile?.points ?? 0;
  const name = profile?.student_name ?? localStorage?.getItem("primepal_student_name") ?? "Champion";

  return (
    <div className="max-w-md mx-auto space-y-6 pb-10">

      {/* ① Hero strip */}
      {loadingProfile ? (
        <HeroSkeleton />
      ) : (
        <div className="w-full rounded-3xl bg-gradient-to-r from-yellow-400 to-orange-400 p-5 flex items-center justify-between shadow-lg">
          <div>
            <p className="text-white/80 text-sm font-semibold mb-0.5">Welcome back!</p>
            <h1 className="text-white text-2xl font-extrabold leading-tight drop-shadow">
              Hi {name}! 🌟
            </h1>
            <p className="text-white/80 text-sm mt-1">Ready to learn today?</p>
          </div>
          <div className="flex flex-col items-center bg-white/20 rounded-2xl px-4 py-3 border-2 border-white/30 animate-pulse">
            <span className="text-3xl leading-none">⭐</span>
            <span className="text-white font-extrabold text-2xl leading-tight">{points}</span>
            <span className="text-white/70 text-xs font-semibold">Stars</span>
          </div>
        </div>
      )}

      {/* ② Quick-launch cards */}
      <section>
        <h2 className="text-sm font-extrabold text-gray-400 uppercase tracking-wider mb-3">
          Play Now
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/missions"
            className="flex flex-col items-center gap-2 p-5 rounded-2xl bg-gradient-to-b from-orange-400 to-orange-500 border-b-4 border-orange-600 shadow-md text-white font-extrabold text-center transition-all duration-150 hover:scale-105 active:scale-95 active:border-b-0 active:translate-y-1"
          >
            <span className="text-4xl">🎯</span>
            <span className="text-base">Daily Missions</span>
            <span className="text-xs text-orange-100 font-semibold">Earn stars!</span>
          </Link>
          <Link
            href="/chat"
            className="flex flex-col items-center gap-2 p-5 rounded-2xl bg-gradient-to-b from-violet-500 to-violet-600 border-b-4 border-violet-700 shadow-md text-white font-extrabold text-center transition-all duration-150 hover:scale-105 active:scale-95 active:border-b-0 active:translate-y-1"
          >
            <span className="text-4xl">💬</span>
            <span className="text-base">Chat with PrimePal</span>
            <span className="text-xs text-violet-200 font-semibold">Ask anything!</span>
          </Link>
        </div>
      </section>

      {/* ③ Achievements shelf */}
      <section>
        <h2 className="text-sm font-extrabold text-gray-400 uppercase tracking-wider mb-3">
          Your Badges
        </h2>
        <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
          {BADGES.map((badge) => {
            const earned = points >= badge.threshold;
            return (
              <div
                key={badge.id}
                className={[
                  "flex flex-col items-center gap-1 px-4 py-3 rounded-2xl border-2 shrink-0 w-24 text-center transition-all",
                  earned
                    ? "bg-yellow-50 border-yellow-300 shadow-sm"
                    : "bg-gray-50 border-gray-200 opacity-40",
                ].join(" ")}
                title={badge.desc}
              >
                <span className={["text-2xl", earned ? "" : "grayscale"].join(" ")}>
                  {badge.icon}
                </span>
                <span className={["text-xs font-bold leading-tight", earned ? "text-gray-700" : "text-gray-400"].join(" ")}>
                  {badge.label}
                </span>
                {earned && (
                  <span className="text-[10px] text-yellow-600 font-extrabold bg-yellow-100 rounded-full px-1.5">
                    ✓ Earned
                  </span>
                )}
                {!earned && (
                  <span className="text-[10px] text-gray-400 font-semibold">
                    {badge.threshold} ⭐
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ④ Coming-soon card grid */}
      <section>
        <h2 className="text-sm font-extrabold text-gray-400 uppercase tracking-wider mb-3">
          Coming Soon 🔒
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {COMING_SOON.map((card) => (
            <LockedCard key={card.id} icon={card.icon} label={card.label} tagline={card.tagline} />
          ))}
        </div>
      </section>

      {/* ⑤ Motivational footer strip */}
      <div
        className={[
          "w-full rounded-2xl bg-gradient-to-r from-pink-100 to-yellow-100 border-2 border-yellow-200 px-5 py-4 text-center transition-opacity duration-400",
          quoteFading ? "opacity-0" : "opacity-100",
        ].join(" ")}
      >
        <p className="text-sm font-bold text-orange-700">{QUOTES[quoteIndex]}</p>
      </div>

      {/* Keyframe injections */}
      <style>{`
        @keyframes wiggle {
          0%   { transform: translateX(0); }
          20%  { transform: translateX(-6px) rotate(-2deg); }
          40%  { transform: translateX(6px) rotate(2deg); }
          60%  { transform: translateX(-4px) rotate(-1deg); }
          80%  { transform: translateX(4px) rotate(1deg); }
          100% { transform: translateX(0); }
        }
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateX(-50%) translateY(-4px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/app/\(student\)/home/page.tsx
git commit -m "feat: add gamified student home dashboard with badges and coming-soon cards"
```

---

## Task 5: Enhance Missions Loading Screen + Bubbly Buttons

**Files:**
- Modify: `frontend/app/(student)/missions/page.tsx`

- [ ] **Step 1: Replace the `LoadingScreen` component**

Find and replace the existing `LoadingScreen` function (lines 40–52):

```tsx
// Loading message rotation
const LOADING_MSGS = [
  "Preparing your quest… 🗺️",
  "Gathering your stars… ⭐",
  "Your missions await… 🎯",
];

function LoadingScreen() {
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setMsgIdx((i) => (i + 1) % LOADING_MSGS.length), 1200);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="w-full max-w-sm mx-auto flex flex-col items-center gap-6 py-12">
      {/* Bouncing stars */}
      <div className="flex gap-4 text-5xl">
        <span className="animate-bounce [animation-delay:0ms]">⭐</span>
        <span className="animate-bounce [animation-delay:200ms]">🌟</span>
        <span className="animate-bounce [animation-delay:400ms]">⭐</span>
      </div>

      {/* Rotating message */}
      <p className="text-xl font-extrabold text-white drop-shadow-md text-center min-h-[2rem] transition-all duration-300">
        {LOADING_MSGS[msgIdx]}
      </p>

      {/* Shimmer progress bar */}
      <div className="w-full h-3 bg-white/30 rounded-full overflow-hidden">
        <div className="h-full w-1/2 bg-white/70 rounded-full animate-[shimmer_1.5s_ease-in-out_infinite]" />
      </div>

      <style>{`
        @keyframes shimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(250%); }
        }
      `}</style>
    </div>
  );
}
```

Because `LoadingScreen` now uses `useState`/`useEffect`, add those to the existing import at the top of the file. The file already imports `useState, useEffect, useCallback, useRef` — no change needed.

- [ ] **Step 2: Add bubbly style to the primary action buttons in the results screen**

Find the two buttons inside `{pageState === "results" && ...}` and update their `className` to add `border-b-4 border-orange-600 active:border-b-0 active:translate-y-1` to the "Play Again" button and `border-b-4 border-violet-700 active:border-b-0 active:translate-y-1` to the "Chat" link. For example the Play Again button becomes:

```tsx
<button
  onClick={fetchMissions}
  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xl py-5 rounded-2xl transition-all duration-150 shadow-lg border-b-4 border-orange-600 hover:shadow-xl hover:scale-[1.02] active:scale-95 active:border-b-0 active:translate-y-1"
>
  Play Again 🔄
</button>
```

And the Chat link:

```tsx
<Link
  href="/chat"
  className="block w-full bg-violet-500 hover:bg-violet-600 text-white font-extrabold text-xl py-5 rounded-2xl transition-all duration-150 shadow-lg border-b-4 border-violet-700 hover:shadow-xl hover:scale-[1.02] active:scale-95 active:border-b-0 active:translate-y-1 text-center"
>
  Chat with PrimePal 💬
</Link>
```

- [ ] **Step 3: Commit**

```bash
git add frontend/app/\(student\)/missions/page.tsx
git commit -m "feat: game-like loading screen and bubbly button polish on missions page"
```

---

## Task 6: Update AI_CONTEXT.md

**Files:**
- Modify: `AI_CONTEXT.md`

- [ ] **Step 1: Update the repository structure section**

In Section 3 (Repository Structure), update the `(student)` route group to reflect actual current state:

```
│   │   ├── (student)/               # Student route group
│   │   │   ├── layout.tsx           # ✅ Sticky header + nav (Home/Chat/Missions) + logout
│   │   │   ├── play/page.tsx        # ✅ Feature 1 — class code entry (Step 1)
│   │   │   ├── play/avatar-select.tsx # ✅ Feature 1 — avatar grid → redirect /home
│   │   │   ├── home/page.tsx        # ✅ Student home dashboard (hero, badges, coming-soon)
│   │   │   ├── missions/page.tsx    # ✅ Feature 6 — daily missions game UI
│   │   │   ├── chat/page.tsx        # ✅ Feature 7 — bilingual chat UI
│   │   │   └── quests/page.tsx      # Stub — future four-pillar quests
```

Also update the `(teacher)` section to note curriculum upload history is complete:

```
│   │   ├── (teacher)/               # Teacher route group
│   │   │   ├── layout.tsx           # Pass-through (no sidebar yet)
│   │   │   ├── login/page.tsx       # ✅ Feature 1 — email/password login
│   │   │   ├── dashboard/page.tsx   # ✅ Feature 10 — analytics dashboard
│   │   │   ├── dashboard/curriculum/# ✅ Upload history + grade card UI
│   │   │   └── classroom/[id]/page.tsx # ✅ Feature 2 — classroom detail with tabs
```

- [ ] **Step 2: Update the Feature Completion Status table**

Replace the table in Section 5:

```markdown
| # | Feature | Status | Notes |
|---|---|---|---|
| 1 | Smart Auth & Role Management | ✅ **Complete & Tested** | Teachers: Supabase GoTrue. Students: custom PyJWT. See §6 |
| 2 | Classroom Manager (Registry) | ✅ **Complete & Tested** | CRUD + bulk student add. See §7 |
| 3 | SNC Document Ingestion (RAG Pipeline) | ✅ **Complete & Tested** | PDF upload → chunk → embed pipeline. See §8 |
| 4 | Vector Storage & Curricular Tagging | ✅ **Complete & Tested** | pgvector + snc_knowledge_base. See §9 |
| 5 | Guardrailed Tutor (Student AI Chatbot) | ✅ **Complete & Tested** | RAG chat with grade filter. See §10 |
| 6 | Gamified Missions (Daily Questions UI) | ✅ **Complete & Tested** | 3 questions/day, points system, home dashboard. See §11 |
| 7 | Bilingual Code-Switching Chatbot | ✅ **Complete & Tested** | Roman Urdu → English translation + bilingual reply. See §12 |
| 8 | Multi-Modal Interaction Logger | ✅ **Complete & Tested** | BackgroundTasks logging to student_interactions. See §13 |
| 9 | NLP Insight Generator | ✅ **Complete & Tested** | Evaluator agent producing teacher-facing insights. See §14 |
| 10 | Four-Skill Action Plan Dashboard | ✅ **Complete** | Analytics tab in classroom detail page |
| — | Upload History | ✅ **Complete** | snc_uploads table + curriculum history page |
| — | Student Home Dashboard | ✅ **Complete** | /home — hero, badges, coming-soon cards, nav |
```

- [ ] **Step 3: Add a new Section 17 — Future Features Roadmap**

Append at the end of `AI_CONTEXT.md`:

```markdown
---

## 17. Future Features Roadmap

These features are designed and stubbed in the student home dashboard as locked "Coming Soon" cards. They are the next implementation priorities in order.

### F-A: Class Leaderboard
- **What:** Weekly/all-time ranking of students by points within a classroom.
- **Backend:** `GET /api/v1/missions/leaderboard` — queries `students` table filtered by `classroom_id`, ordered by `points DESC`, returns top 10 with rank, name, avatar, points.
- **Frontend:** `/leaderboard` page. Podium UI for top 3, ranked list for 4–10. Updates on mission complete.
- **DB:** No new table needed — uses existing `students.points`.

### F-B: Spelling Bee
- **What:** Audio-first game: student hears a word (TTS), types the spelling, gets immediate feedback.
- **Backend:** `GET /api/v1/spelling/daily` — picks 5 grade-appropriate words from `snc_knowledge_base`, returns `{word, definition, audio_url}`. Audio via OpenAI TTS (`tts-1`).
- **Frontend:** `/spelling` page. "Play" button triggers audio, input box, submit, reveal.
- **DB:** New `spelling_attempts` table (student_id, word, correct, created_at).

### F-C: Story Time
- **What:** LLM-generated short stories using grade-appropriate SNC vocabulary. Student reads and answers 1 comprehension question.
- **Backend:** `GET /api/v1/story/daily` — retrieves 3 SNC chunks, generates a 100-word illustrated story with 1 MC comprehension question via structured LLM output.
- **Frontend:** `/story` page. Story card with large text, then question card. Awards 15 points on correct answer.
- **DB:** No new table — reuse `student_interactions` with `interaction_type='story'`.

### F-D: Speaking Practice
- **What:** Student holds a button to record speech, Whisper transcribes it, PrimePal gives feedback.
- **Backend:** `POST /api/v1/speak` — accepts audio blob, calls Whisper, grades pronunciation via LLM comparison with target phrase.
- **Frontend:** `/speaking` page. Hold-to-record mic button. Shows transcript + feedback.
- **DB:** New `speaking_attempts` table (student_id, target_phrase, transcript, score, created_at).

### Technical Debt / Known Issues
- `missions.py:get_daily_missions` — previously had no error handling around RAG + LLM calls (fixed 2026-04-17).
- `AI_CONTEXT.md` section 3 previously showed Qdrant as the vector DB; project uses **pgvector via Supabase** (migrated, Qdrant ref removed).
- Student post-login redirect previously went to `/missions`; now correctly routes to `/home` (fixed 2026-04-17).
```

- [ ] **Step 4: Fix the tech stack table — remove Qdrant reference**

In Section 2, update the Vector DB row:

```markdown
| **Vector DB** | Supabase pgvector (`snc_knowledge_base` table, `VECTOR(1536)`) |
```

Remove the `QDRANT_URL` line from the backend `.env` example in Section 4 since the project uses pgvector, not Qdrant.

- [ ] **Step 5: Commit**

```bash
git add AI_CONTEXT.md
git commit -m "docs: update AI_CONTEXT with current state, fix Qdrant ref, add future roadmap"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Backend 500 fix: Task 1 covers all three try/except zones + logger
- ✅ Nav links + logout: Task 2 covers layout.tsx replacement
- ✅ Redirect fix: Task 3
- ✅ Student home dashboard (hero, badges, coming-soon with wiggle, quote rotation): Task 4
- ✅ Enhanced loading screen + bubbly buttons: Task 5
- ✅ AI_CONTEXT.md update: Task 6

**Placeholder scan:** No TBD/TODO in code blocks. All code is complete and runnable.

**Type consistency:**
- `StudentProfile` interface defined identically in `layout.tsx` and `home/page.tsx` — both use the same `/missions/me` endpoint shape.
- `LOADING_MSGS` array referenced in `LoadingScreen` — defined in the same code block above it.
- `LockedCard` props (`icon`, `label`, `tagline`) match the `COMING_SOON` array shape.
- `BADGES[].threshold` compared against `points` (number) — both numbers.
