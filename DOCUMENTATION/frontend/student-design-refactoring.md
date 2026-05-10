# Student UI Design Refactoring

## Overview

Redesigned all student-facing pages from a purple/space theme to a warm amber/brown design language matching the mockups in `frontend/Studentdesigns/`.

## Design System

| Token | Value | Usage |
|-------|-------|-------|
| Background | `#f5f0e8` (cream) | Page backgrounds |
| Primary | `#78350f` (amber-950) | Navbar, headings, buttons |
| Accent | `#fbbf24` / `#f59e0b` | Stars, highlights, active states |
| Heading font | Baloo 2 | All headings, buttons, labels |
| Body font | Nunito | Body text, descriptions |

**Card style:** Gradient backgrounds with `box-shadow` 3D offset and white shine overlay.

## Files Changed

### Theme & Config
- `frontend/app/globals.css` — Added Baloo 2 + Nunito Google Fonts import
- `frontend/tailwind.config.ts` — Added cream color, font families, custom keyframes (floatUp, popIn, slideUp, shake, pulse2, starBurst, confettiFall)

### Student Pages
- `frontend/app/student/layout.tsx` — Brown navbar, mobile hamburger menu, streak/points display
- `frontend/app/student/home/page.tsx` — Amber hero banner, gradient activity cards with 3D shadows, badges shelf
- `frontend/app/student/play/page.tsx` — Star mascot SVG, floating dots background, warm login flow
- `frontend/app/student/play/pin-entry.tsx` — Amber keypad, green submit button, shake animation on error

### Student Components
- `frontend/components/student/PillarCard.tsx` — Deep gradient per pillar (blue/emerald/amber/rose) with shine overlay
- `frontend/components/student/MissionsDashboard.tsx` — Performance banner with pillar chips, 2-column grid
- `frontend/components/student/MissionGameplay.tsx` — Warm task cards, CSS confetti, summary screen with stat cards

### Lint Fixes (pre-existing)
- Removed unused `Image` import from 4 teacher components
- Removed unused `getStudentClassroomId` import from `lib/hooks/queries.ts`

## Responsive Breakpoints

All pages use mobile-first design:
- **Mobile** (default): Single column, compact spacing, hamburger nav
- **sm (640px+)**: 2-column grids, expanded card padding
- **md/lg**: Full desktop layout

## No Functionality Changes

All data fetching hooks, auth logic, game mechanics, and routing are unchanged.
