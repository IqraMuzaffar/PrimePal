# Design Spec: Student UX Overhaul + Backend Mission Fix
**Date:** 2026-04-17
**Status:** Approved

---

## 1. Backend — Mission 500 Error Fix

### Problem
`GET /api/v1/missions/daily` crashes with HTTP 500 when:
- pgvector RPC (`retrieve_grade_filtered_chunks`) throws a network/DB exception
- OpenAI/LangChain `chain.ainvoke()` fails (bad API key, timeout, structured-output parse failure returning `None`)

### Solution
Add a Python `logging.getLogger(__name__)` logger and three explicit try/except zones in `missions.py:get_daily_missions`:

| Zone | What it wraps | On failure |
|------|--------------|------------|
| RAG | `retrieve_grade_filtered_chunks(...)` | `logger.error(...)` → HTTP 503 |
| LLM | `generate_daily_missions(...)` | `logger.error(...)` → HTTP 503 |
| None-result guard | `if missions is None` after LLM call | `logger.error(...)` → HTTP 503 |

- Classroom 404 guard already exists — no change.
- `mission_generator.py` fallback (empty chunks → simpler prompt) is kept intact.
- No changes to `/complete` or `/me` endpoints.

---

## 2. Frontend — Updated Student Layout (`layout.tsx`)

### Navbar additions to existing header
- **Center:** Three pill nav links — `🏠 Home` · `💬 Chat` · `🎯 Missions`
  - Active route gets white background pill (use `usePathname()`)
  - Below `sm:` breakpoint: icon-only labels
- **Right:** Existing avatar + points badge kept; add `Logout` button
  - Logout: clears `primepal_student_token`, `primepal_student_name`, `primepal_student_avatar` from localStorage → `router.push("/play")`

### Avatar-select redirect fix
`avatar-select.tsx` line 54: `router.push("/missions")` → `router.push("/home")`

---

## 3. Frontend — New Student Home Page (`/home/page.tsx`)

Route: `app/(student)/home/page.tsx`

Fetches `/missions/me` on mount (student JWT) for `{ student_name, avatar_url, points }`.

### Section ① — Hero Strip
Full-width gradient card (yellow-400 → orange-400).
- Left: `"Hi {name}! 🌟"` heading + `"Ready to learn today?"` subtext
- Right: large `⭐ {points}` badge with CSS `animate-pulse`
- If profile not loaded yet: skeleton placeholder

### Section ② — Quick-Launch Cards (2-col grid)
Active, bubbly cards — `rounded-2xl`, heavy bottom border (`border-b-4`), `hover:scale-105 active:scale-95`:
- `🎯 Daily Missions` → `href="/missions"`, orange gradient
- `💬 Chat with PrimePal` → `href="/chat"`, violet gradient

### Section ③ — Achievements Shelf
Horizontal scroll row. Badges computed from `points` value (no extra API call):

| Badge | Threshold | Icon |
|-------|-----------|------|
| First Star | ≥ 1 | ⭐ |
| On Fire | ≥ 50 | 🔥 |
| Star Learner | ≥ 100 | 💎 |
| Champion | ≥ 200 | 🏆 |

- Earned: full color chip with `✓` checkmark
- Not earned: greyed out + `🔒` lock icon + 40% opacity

### Section ④ — Coming-Soon Card Grid (2×2)
Locked feature cards. Each: grey background, lock icon overlay, feature name + tagline.

| Card | Icon | Tagline |
|------|------|---------|
| Class Leaderboard | 🏆 | "See who's on top!" |
| Spelling Bee | 🐝 | "Can you spell it?" |
| Story Time | 📖 | "Read & discover!" |
| Speaking Practice | 🎤 | "Talk to PrimePal!" |

**onClick behavior:**
- Trigger CSS `@keyframes wiggle` (shake animation, ~0.4s)
- Show inline tooltip banner: `"Coming Soon! 🔒"` that fades in then out
- No navigation

### Section ⑤ — Motivational Footer Strip
Static rotating quote (array of 3, cycles every 8s with fade transition):
- `"Every word you learn is a superpower! 💪"`
- `"Keep going — you're amazing! 🌟"`
- `"Learning is your greatest adventure! 🚀"`

---

## 4. Frontend — Enhanced Missions Loading Screen

Replace plain spinner in `missions/page.tsx:LoadingScreen` with a mini-game loading experience:
- 3 bouncing star emojis (staggered `animation-delay`)
- Rotating loading messages (cycles every 1.2s): `"Preparing your quest…"` / `"Gathering your stars…"` / `"Your missions await…"`
- Progress-bar shimmer strip at bottom of card

---

## 5. Frontend — Bubbly Button System (global student style)

Applied across all student routes (`missions`, `chat`, `home`):
- Primary action buttons: `rounded-2xl border-b-4 border-[darker-shade] active:border-b-0 active:translate-y-1` (tactile press effect)
- Colors: orange primary, violet secondary, green success
- `transition-all duration-150` on all interactive elements

---

## 6. AI_CONTEXT.md Update

Update the project context file to reflect:
- Features 1–8 completed status
- New student home page as post-login destination
- Future features roadmap (Leaderboard, Spelling Bee, Story Time, Speaking Practice)

---

## Files Changed

| File | Change |
|------|--------|
| `backend/app/api/v1/endpoints/missions.py` | Add try/except + logger |
| `frontend/app/(student)/layout.tsx` | Add nav links + logout |
| `frontend/app/(student)/play/avatar-select.tsx` | Change redirect to `/home` |
| `frontend/app/(student)/home/page.tsx` | **NEW** — student dashboard |
| `frontend/app/(student)/missions/page.tsx` | Enhanced loading screen + bubbly buttons |
| `AI_CONTEXT.md` | Update project status + roadmap |
