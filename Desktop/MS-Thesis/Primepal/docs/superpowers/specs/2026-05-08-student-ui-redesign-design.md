# Student UI Redesign — Design Spec

**Date:** 2026-05-08
**Author:** Iqra (with Claude)
**Branch target:** `student-design-refactoring-branch`
**Scope:** Visual & UX overhaul of all student-facing pages.

---

## 1. Problem

Today's student pages have several UX issues:

- Content capped at `max-w-2xl` (~672px) inside a `max-w-5xl` shell → big empty side bands on desktop.
- Headlines (e.g. "Hi Horain!") are 24–30px — small for 7–11 year-old readers.
- Visual hierarchy is flat — hero, cards, badges, footer all carry similar weight.
- Low-payoff sections occupy prime real estate (generic motivational quote, "0 Stars", "No badges yet").
- Navbar is dark amber-950, inconsistent with the otherwise warm/cream palette and feels heavy.
- Per-page styling is fragmented — pages improvise their own backgrounds, container widths, and shadow systems.

## 2. Goals

1. Remove the empty-side-band problem on every page (consistent container width + content density).
2. Increase legibility for primary-school readers (headline & icon scale-up, minimum body 14px).
3. Establish one visual system that all student pages share, so future pages "just look right."
4. Add tasteful motion (entrance, hover, idle ambient) to make the app feel alive.
5. Replace low-value sections with concrete, motivating content (e.g., Today's Adventure progress bar).

## 3. Non-goals

- Information-architecture changes (no renaming/moving sections).
- Backend changes — no new endpoints or data shapes.
- Teacher / admin UI changes — only `app/student/**` and shared student components.
- Mobile-only redesign — desktop is the primary target; mobile stays usable but is not redesigned.
- Replacing emoji with custom illustrations.

---

## 4. Visual System

### 4.1 Personality

**"C + a touch of B"** — Soft Pastel Modern with Candy Pop accents.

- **Pastel base:** pink → lavender → mint hero gradient, soft tinted page background (cream → fuchsia-50 → cyan-50).
- **Saturated accents:** activity cards use vivid gradients (purple/pink/amber/cyan/emerald) for energy and pillar identity.
- **Light navbar:** white background, pastel pill for active item, replacing today's dark amber-950 bar.
- **Decorative motion:** glow blobs behind hero, floating mascot, animated section badges.

### 4.2 Color tokens (Tailwind class names; new tokens added to `tailwind.config.ts`)

| Token              | Value                             | Use                                  |
|--------------------|-----------------------------------|--------------------------------------|
| `student-bg`       | `linear-gradient(180deg, #fafaf9 0%, #fdf4ff 60%, #ecfeff 100%)` | Page background |
| `student-hero`     | `linear-gradient(135deg, #fce7f3 0%, #ddd6fe 50%, #cffafe 100%)` | Hero & welcome cards |
| `student-card-purple` | `from-violet-400 to-violet-600` | Missions card |
| `student-card-pink`   | `from-pink-400 to-pink-600`     | Chat card |
| `student-card-amber`  | `from-amber-400 to-amber-600`   | Spelling Bee card |
| `student-card-cyan`   | `from-cyan-400 to-cyan-600`     | Scores card |
| `student-card-emerald`| `from-emerald-400 to-emerald-600` | Story Time card |
| `student-pill-active` | `from-pink-200 to-violet-200`   | Active nav link |

Existing amber/cream tokens stay (used by Streak, Stars, achievements) but are demoted from page-level chrome.

### 4.3 Type scale

| Element            | Old → New          | Tailwind                            |
|--------------------|--------------------|-------------------------------------|
| Page hero name     | 24-30px → **48-54px** | `text-5xl sm:text-6xl font-baloo font-extrabold` |
| Page hero label    | 12px → **14px**    | `text-sm font-baloo font-extrabold tracking-[0.2em]` |
| Section heading    | 12-16px → **18-20px** | `text-lg sm:text-xl font-baloo font-extrabold` |
| Activity card title| 16-18px → **24-26px** | `text-2xl font-baloo font-extrabold` |
| Activity card sub  | 12px → **15-16px** | `text-base font-nunito font-semibold` |
| Nav link           | 13px → **18px**    | `text-lg font-baloo font-extrabold` |
| Nav link icon      | 16px → **24px**    | (emoji span, `text-2xl`) |
| Body / paragraph   | 14px → stays **14-16px** | `text-sm sm:text-base` |

### 4.4 Spacing & geometry

- **Container:** `max-w-6xl` (1152px) for content. The current `max-w-5xl` shell stays only on layout; pages no longer over-constrain themselves with `max-w-2xl`.
- **Page padding:** `px-6 lg:px-10 py-8` (was `px-4 py-6`).
- **Card corners:** `rounded-3xl` for primary surfaces (hero, activity cards), `rounded-2xl` for secondary, `rounded-xl` for chips.
- **Card padding:** activity cards `p-7` (was `p-4`); hero `p-8 sm:p-10`.
- **Grid:** activity cards `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` with the first card spanning 2 columns on lg.

### 4.5 Shadow system

- **Soft elevation** (default): `shadow-[0_8px_24px_rgba(168,85,247,0.10)]`
- **Card hover lift:** `shadow-[0_24px_48px_rgba(0,0,0,0.18)]`
- **Pill / chip:** `shadow-[0_4px_12px_rgba(0,0,0,0.06)]`
- The current `shadow-[0_6px_0_COLOR]` 3D-offset shadows (used in play page buttons & current activity cards) are **retired** for the main shell but kept for primary action buttons (gameplay submit, spelling-bee speak, etc.) where the tactile feel is welcome.

### 4.6 Animations

Defined in `tailwind.config.ts` keyframes (some already exist — `floatUp`, `slideUp`):

| Name        | Duration   | Use                                              |
|-------------|------------|--------------------------------------------------|
| `wave`      | 2.5s ∞     | Hero hand emoji 👋                                |
| `float`     | 3.5s ∞     | Hero mascot, pillar icons                         |
| `pulse-soft`| 4-5s ∞     | Hero glow blobs, decorative dots                  |
| `pulse2`    | 1.6s ∞     | "NEW" badge, streak chip when freshly incremented |
| `spin-slow` | 8s ∞ linear| Logo star                                         |
| `bounce-soft`| 2s ∞      | Active nav link icon, progress rocket             |
| `shimmer`   | 3s ∞ linear| Progress bar fill                                 |
| `slideUp`   | 0.5s once  | Section entrance (with stagger delays 50/100/150…) |

**Hover affordances** (CSS transitions, not JS):

- Activity card: `translateY(-6px) rotate(-0.3deg)` + box shadow grow + icon `scale(1.15) rotate(-8deg)`.
- Badge tile: `translateY(-3px)`, border `pink-300`, icon `scale(1.15) rotate(8deg)`.
- Nav link (inactive): `translateY(-1px)`, `bg-slate-50`.

`prefers-reduced-motion` disables all infinite animations and entrance staggers (one global media query in `globals.css`).

---

## 5. Layout Changes

### 5.1 `app/student/layout.tsx`

**Navbar:**

- Background changes from `bg-amber-950` → `bg-white border-b border-slate-100`.
- Height grows from 56px → **88px**.
- Logo: 20px → 26px text, with 36px ⭐ that slowly rotates.
- Nav links centered (`flex-1 justify-center`), each link `px-5 py-3.5 rounded-2xl text-lg font-baloo font-extrabold` with 24px icon.
- Active link uses `bg-gradient-to-br from-pink-200 to-violet-200 text-pink-900 shadow-[0_4px_14px_rgba(236,72,153,0.18)]` — its icon has `bounce-soft` animation.
- Inactive link hover: `bg-slate-50 -translate-y-0.5`.
- Right-side chips (streak, points, Out) match nav-link height with `px-4 py-3 rounded-2xl`. Streak gets `from-orange-200 to-orange-300`, points `from-amber-200 to-amber-300`, Out `from-red-200 to-red-300`.
- Mobile: hamburger collapses links into a vertical drawer with the same styling.

**Main:**

- Background changes from `bg-cream` → applies the `student-bg` gradient.
- Container changes from `max-w-5xl` → **`max-w-6xl`**, padding `px-6 lg:px-10 py-8`.

**Exemption:** `/student/play` keeps its custom layout (no nav, decorative bg) — but adopts the new color tokens for gradient buttons.

**Exemption:** `/student/chat` keeps its full-height layout (`h-[calc(100vh-88px)]`) — chat page handles its own background.

### 5.2 New shared components

Three small atoms, all in `frontend/components/student/`:

1. **`PageHero.tsx`** — hero band with glow blobs, label, large name, subtitle, optional pill row, optional mascot. Used by Home, Missions index, Scores, Achievements, Evaluation intro.
2. **`SectionHeading.tsx`** — colored badge icon + uppercase tracked label + flex rule + optional right link. Replaces ~8 ad-hoc inline section headers.
3. **`ActivityCard.tsx`** — gradient activity card with blob, icon, title, sub, optional badge. Used by Home; reused as a generic gradient card on Missions index.

`PillarCard.tsx` is updated in place (not replaced) to match the new system.

---

## 6. Per-Page Treatment

### 6.1 Home (`student/home/page.tsx`)

The reference design (covered in detail during brainstorm). Sections in order:

1. `PageHero` — name, roll/grade, ⭐ pill + "+N today" pill, 🦄 mascot.
2. `PLAY NOW` section — `ActivityCard` × 5 in a 3+2 grid (Missions spans 2 on lg, badge="NEW").
3. **Today's Adventure** — new component replacing the motivational quote: white card with 🚀 icon, title "Today's Adventure", subtitle, shimmer progress bar (uses existing `dailySummary` data + `pointsBreakdown`).
4. `YOUR BADGES` section — 5 always-visible tiles (locked-by-default with grayscale icon + progress count, unlocked tile with gradient border).
5. Streak-reset banner stays at top, restyled to pink/lavender.

### 6.2 Missions index (`student/missions/page.tsx` → `MissionsDashboard.tsx`)

- Add `PageHero` ("Daily Missions" / "Pick a pillar to explore!").
- Pillar cards become `ActivityCard`-styled with the four pillar gradients (reading=blue, writing=violet, listening=cyan, speaking=emerald).
- Performance banner restyled to a soft white card with the new shadow system, accuracy chip uses pastel green/amber/rose.

### 6.3 Mission gameplay (`student/missions/[pillar]/page.tsx`)

- Loading state: pastel gradient bg matching new tokens (replaces slate gradient).
- `MissionGameplay` internals (question rendering, offline queue) **unchanged** — visual polish only at the wrapper level: rounded-3xl card, new shadow, pastel header bar with pillar gradient.

### 6.4 Chat (`student/chat/page.tsx`)

- Header: white pill bar with PrimePal avatar (uses gradient mascot bubble from new system).
- Background: replace `bg-yellow-50` with the `student-bg` gradient (still full-height).
- Message bubbles: student bubble = pink-200 to pink-300, PrimePal bubble = white with violet-100 border. Bigger type (16px from 14px).
- Composer footer: rounded-3xl, larger send button (ActivityCard-style mini gradient).
- Streaming token renderer & Urdu toggle behavior **unchanged**.

### 6.5 Spelling Bee (`student/spelling-bee/page.tsx`)

- Container `max-w-2xl` → `max-w-3xl`; pad up to new system.
- Header → `SectionHeading` style; score chip in new amber gradient.
- Word display card: white, `rounded-3xl`, soft shadow; emoji hint floats.
- Speak button: keep tactile 3D-offset shadow (the existing `shadow-[0_6px_0_#…]` family) — the tactile feel suits a primary action.
- Speech synthesis logic **unchanged**.

### 6.6 Story Time (`student/story-time/page.tsx`)

- Container `max-w-2xl` → `max-w-3xl`.
- Story card: white with emerald accent border (kept), new pastel page bg.
- Phase transitions reuse `slideUp` keyframe.
- 10-point scoring & state machine **unchanged**.

### 6.7 Scores (`student/scores/page.tsx`)

- Add `PageHero` ("My Scores" / "See how you're doing!").
- 3 stat cards: keep their gradients but use the new card geometry (rounded-3xl, p-7, soft elevation, slideUp stagger).
- Pillar breakdown: pillar-color borders kept, but card surfaces switch to white with pastel left-edge accent.

### 6.8 Achievements (`student/achievements/page.tsx`)

- Container `max-w-md` → `max-w-6xl` (matches the rest of the system).
- Add `PageHero` ("Your Badges" / "Collect them all!").
- Earned section: 4-col grid of large badge tiles with tier-colored gradient backs (bronze/silver/gold).
- Locked section: same grid, grayscale icons, progress chip on each.

### 6.9 Evaluation (`student/evaluation/page.tsx`)

- Container `max-w-lg` → `max-w-3xl`.
- Question card: `rounded-3xl`, soft shadow, larger question text (24px from 18px).
- Likert emoji grid: each option becomes a tactile pastel card matching student-card-purple/pink/etc.
- Keep `shadow-[0_3px_0_…]` button style — it works.

### 6.10 Play (`student/play/page.tsx` + `avatar-select.tsx` + `pin-entry.tsx`)

- Keep its **separate layout** (it's pre-auth, no nav).
- Update color tokens: backgrounds use new gradient, mascot uses the new float animation, gradient buttons use `student-card-*` palette.
- Wizard steps (enter-code → select-student → enter-pin) keep their state machine; only visual polish.

---

## 7. Implementation Notes

### 7.1 File-by-file impact (read-mostly summary)

| File                                     | Change scope          |
|------------------------------------------|------------------------|
| `tailwind.config.ts`                     | Add tokens & keyframes |
| `app/globals.css`                        | Reduced-motion query   |
| `app/student/layout.tsx`                 | Navbar, container, bg  |
| `app/student/home/page.tsx`              | Full restyle           |
| `app/student/missions/page.tsx`          | Wrapper restyle        |
| `app/student/missions/[pillar]/page.tsx` | Wrapper bg only        |
| `app/student/chat/page.tsx`              | Restyle (logic same)   |
| `app/student/spelling-bee/page.tsx`      | Restyle (logic same)   |
| `app/student/story-time/page.tsx`        | Restyle (logic same)   |
| `app/student/scores/page.tsx`            | Restyle                |
| `app/student/achievements/page.tsx`      | Restyle + bigger grid  |
| `app/student/evaluation/page.tsx`        | Restyle                |
| `app/student/play/page.tsx`              | Color tokens only      |
| `app/student/play/avatar-select.tsx`     | Color tokens only      |
| `app/student/play/pin-entry.tsx`         | Color tokens only      |
| `components/student/PageHero.tsx`        | NEW                    |
| `components/student/SectionHeading.tsx`  | NEW                    |
| `components/student/ActivityCard.tsx`    | NEW                    |
| `components/student/PillarCard.tsx`      | Updated to new system  |
| `components/student/MissionsDashboard.tsx` | Updated to new system |
| `components/student/MissionGameplay.tsx` | Wrapper styling only   |

### 7.2 Things explicitly **not** changing

- All API endpoints, hooks, query keys, cache strategy.
- Auth flow (student PIN, JWT in localStorage).
- Mission offline-queue behavior.
- Chat streaming + Urdu translation logic.
- Speech synthesis in Spelling Bee.
- Game state machines in Spelling Bee, Story Time, Mission Gameplay.
- Scoring rules (points-per-attempt, accuracy thresholds, achievement tier logic).
- Achievement popup & streak counter behaviors.
- `OfflineBanner`, `QuestionTimer`, `AchievementPopup`, `AnimatedBackground`, `DynamicBackground` — kept as-is.

### 7.3 Risks & mitigations

| Risk                                                | Mitigation                                                                 |
|-----------------------------------------------------|----------------------------------------------------------------------------|
| Visual regressions on small screens                 | All grids use `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` — tested at 360, 768, 1280, 1920. |
| Animations cause motion sickness for some kids      | Global `prefers-reduced-motion` rule in globals.css disables infinite loops. |
| Color contrast on pastel backgrounds                | Hero text always slate-900 / pink-900 (≥ 7:1 contrast); white on saturated cards. |
| Bigger type pushes content below the fold           | Container width grows to `max-w-6xl`, mascot scales by viewport, sections collapse padding on mobile. |
| Performance from many gradients / animated blobs    | All gradients are CSS (GPU-friendly); blobs use `pointer-events-none` and don't block input; total ≤ 8 infinite animations on home (CPU < 1% on Chrome desktop in dev test estimate). |

### 7.4 Testing surface

Manual smoke tests after implementation:

1. Home page renders with all sections at 360 / 768 / 1280 / 1920 widths.
2. Tab through nav — focus rings visible, active styling correct.
3. Mission pillar selection still navigates to `/student/missions/[pillar]`.
4. Chat sends/receives messages, Urdu toggle still works.
5. Spelling Bee plays audio and accepts answers.
6. Story Time progresses through all states.
7. Achievement popup still triggers on unlock.
8. Streak chip increments on first daily activity.
9. Logout flow still clears tokens & redirects to /student/play.
10. `prefers-reduced-motion: reduce` disables animations.

No new automated tests are required — this is presentation-layer only and existing E2E/integration tests cover behavior.

---

## 8. Sequencing (high level — full plan in writing-plans output)

1. **Tokens first** — `tailwind.config.ts` keyframes + color tokens, `globals.css` reduced-motion.
2. **Shared atoms** — `PageHero`, `SectionHeading`, `ActivityCard`.
3. **Layout shell** — navbar redesign in `student/layout.tsx`.
4. **Home page** — wire up the atoms.
5. **Missions index + gameplay wrapper** — pillar cards, performance banner.
6. **Each remaining page** — chat, spelling-bee, story-time, scores, achievements, evaluation. (Can run in parallel by different sub-agents in implementation phase.)
7. **Play page** — color-token swap only.
8. **Final QA pass** — smoke tests at each viewport, contrast check, reduced-motion check.

---

## 9. Open questions

None at this time. Direction was locked during brainstorming after v3 mockup approval.
