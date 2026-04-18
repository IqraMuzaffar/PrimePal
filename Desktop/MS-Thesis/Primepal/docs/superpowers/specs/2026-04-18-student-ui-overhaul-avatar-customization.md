# Design Spec: Student UI Overhaul + Avatar Customization
**Date:** 2026-04-18
**Status:** Approved

---

## 1. Goals

1. Replace the current pastel/babyish student UI with a modern, vibrant light-gaming aesthetic (Duolingo-light energy — white/indigo, clean, tactile).
2. Add a persistent Avatar Customization feature: students pick their DiceBear style and a personal theme color that saves to the DB and persists across logins.

---

## 2. Color & Design System

### Global palette
| Role | Value |
|------|-------|
| Page background | `bg-gradient-to-br from-slate-50 to-indigo-50` |
| Navbar | `bg-white` with `shadow-sm` + `border-b border-slate-100` |
| Primary accent | `indigo-600` / `#4f46e5` |
| Secondary accent | `violet-500` / `#8b5cf6` |
| Hero gradient | `from-indigo-500 to-violet-600` |
| Card surface | `bg-white rounded-2xl ring-1 ring-slate-200` |
| Coming-soon surface | `bg-slate-100` |

### 3D button system (all primary actions)
```
bg-indigo-600 text-white font-extrabold rounded-2xl
shadow-[0_4px_0_#3730a3]
hover:brightness-110
active:translate-y-1 active:shadow-none
transition-all duration-100
```
Secondary (violet):
```
bg-violet-500 shadow-[0_4px_0_#5b21b6]
```
Success (green):
```
bg-emerald-500 shadow-[0_4px_0_#065f46]
```

---

## 3. Task 1 — DB Migration (`010_avatar_customization.sql`)

Add two columns to `students` table (idempotent):

```sql
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS avatar_style TEXT NOT NULL DEFAULT 'adventurer',
  ADD COLUMN IF NOT EXISTS theme_color  TEXT NOT NULL DEFAULT '#6366f1';
```

No RLS changes needed — existing policies cover these columns.

---

## 4. Task 2 — Backend Updates

### 4a. Update `GET /auth/classroom/{class_code}/avatars`
Return `avatar_style` and `theme_color` alongside existing fields.

**Updated `AvatarResponse` schema:**
```python
class AvatarResponse(BaseModel):
    id: str
    student_name: str
    avatar_url: str
    avatar_style: str
    theme_color: str
```

**Updated Supabase query:** `select("id, student_name, avatar_url, avatar_style, theme_color")`

### 4b. New `PATCH /auth/student/profile`
Student-JWT-protected endpoint in `auth.py`.

**Request schema:**
```python
class UpdateProfileRequest(BaseModel):
    avatar_style: str | None = None
    theme_color:  str | None = None
```

**Validation:**
- `avatar_style` must be one of: `adventurer`, `bottts`, `fun-emoji`, `pixel-art`, `lorelei` (whitelist)
- `theme_color` must match regex `^#[0-9a-fA-F]{6}$`
- Both fields are optional — partial updates allowed

**Logic:**
1. Resolve `student_id` from JWT (`student["sub"]`)
2. Validate fields
3. `UPDATE students SET ... WHERE id = student_id` via `get_supabase_admin()`
4. Return updated `{avatar_style, theme_color}`

**Response schema:**
```python
class UpdateProfileResponse(BaseModel):
    avatar_style: str
    theme_color: str
```

### 4c. Update `GET /missions/me`
Return `avatar_style` and `theme_color` in the profile response so the navbar and home page can use them.

**Updated `StudentProfileResponse`:**
```python
class StudentProfileResponse(BaseModel):
    student_id: str
    student_name: str
    avatar_url: str | None
    points: int
    avatar_style: str
    theme_color: str
```

**Updated Supabase query:** `select("student_name, avatar_url, avatar_style, theme_color, points")`

---

## 5. Task 3 — Overhaul `layout.tsx`

Replace entire file. Key changes:
- `<header>` → white bg, `shadow-sm border-b border-slate-100`, indigo logo text
- Nav active pill: `bg-indigo-600 text-white` (was `bg-white text-orange-500`)
- Nav inactive: `text-slate-600 hover:bg-slate-100 hover:text-indigo-600`
- Logout button: 3D indigo style (`shadow-[0_3px_0_#3730a3]`)
- Points badge: `bg-indigo-100 text-indigo-700`
- Page bg: `min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50`

---

## 6. Task 4 — Redesign `play/page.tsx` (Class Code Entry)

Replace:
- `🏫` emoji + two Star icons → `<Gamepad2 size={48}>` in an `bg-indigo-100 rounded-2xl p-4` icon box, icon colored `text-indigo-600`
- Heading: "Enter Your Class Code" (drop the exclamation)
- Subtext: "Get the code from your teacher"
- Input: `text-center text-4xl font-black tracking-[0.3em] uppercase border-4 border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 rounded-2xl py-5 bg-white`
- Submit button: 3D indigo system button
- Card: `bg-white rounded-3xl shadow-xl ring-1 ring-slate-100 p-8`
- Page bg: `min-h-screen bg-gradient-to-br from-indigo-500 to-violet-600` (vivid gradient behind the white card — like Duolingo login)

---

## 7. Task 5 — Redesign `play/avatar-select.tsx` → Character Select

Replace "Who are you?" header section with:
- Title: "Choose Your Character" in bold dark slate
- Subtitle: "Tap yourself to enter!"

Each avatar card becomes a **player profile card**:
- White card, `rounded-2xl shadow-md ring-1 ring-slate-200`
- Top color strip: 4px, uses the student's `theme_color`
- Avatar: `w-20 h-20` centered, `rounded-full ring-4` in `theme_color`
- Name below avatar, `font-bold text-slate-700`
- Small `<Pencil size={14}>` gear icon button (top-right corner of card, `bg-white rounded-full shadow p-1`) → opens `AvatarCustomizeModal` for that student
- Hover: `hover:shadow-lg hover:scale-[1.04] active:scale-95`
- Selected/loading: indigo ring overlay

**Post-login flow:** The customization modal can be opened before OR after login tap. If opened before login, saves to DB (requires student to be pre-identified by card). Since we don't have a token yet at this point, customization requires login first — the edit button on the Character Select card triggers login AND then immediately opens the modal.

Simpler approach: the edit button on the card is only shown AFTER login (i.e., it appears on the `/home` page profile section, not on the select screen). On the character select, cards are tap-to-login only with the pencil icon as a teaser that becomes active on home.

**Decision:** Edit button on `/home` hero section only. Character Select is tap-to-login. This avoids the "not-logged-in patch" problem.

---

## 8. Task 6 — Build `AvatarCustomizeModal.tsx`

Location: `frontend/components/student/AvatarCustomizeModal.tsx`

**Props:**
```tsx
interface Props {
  studentName: string;
  currentStyle: string;
  currentColor: string;
  onSave: (style: string, color: string) => void;
  onClose: () => void;
}
```

**Layout:** Full-screen modal with white centered panel (`max-w-sm rounded-3xl shadow-2xl p-6`).

**Section 1 — Avatar Style Picker:**
5 style option cards in a horizontal scroll row. Each card:
- Shows live DiceBear preview: `<Image src={\`https://api.dicebear.com/7.x/${style}/svg?seed=${studentName}\`} width={64} height={64} />`
- Style label below
- Selected: `ring-4 ring-indigo-500 bg-indigo-50`
- Unselected: `ring-1 ring-slate-200`

Styles: `adventurer`, `bottts`, `fun-emoji`, `pixel-art`, `lorelei`
Labels: `Adventurer`, `Robots`, `Fun Emoji`, `Pixel Art`, `Lorelei`

**Section 2 — Color Picker:**
8 color swatch buttons in a flex-wrap row:

| Color | Hex | Tailwind |
|-------|-----|---------|
| Indigo | `#6366f1` | `bg-indigo-500` |
| Violet | `#8b5cf6` | `bg-violet-500` |
| Rose | `#f43f5e` | `bg-rose-500` |
| Amber | `#f59e0b` | `bg-amber-400` |
| Emerald | `#10b981` | `bg-emerald-500` |
| Sky | `#0ea5e9` | `bg-sky-500` |
| Orange | `#f97316` | `bg-orange-500` |
| Pink | `#ec4899` | `bg-pink-500` |

Selected swatch: `ring-4 ring-offset-2 ring-slate-700 scale-110`

**Save button:** 3D indigo system button. On click:
1. `PATCH /auth/student/profile` with `{avatar_style, theme_color}`
2. Compute new avatar URL: `https://api.dicebear.com/7.x/${style}/svg?seed=${studentName}`
3. Update `localStorage`: `primepal_student_avatar` to new URL
4. Call `onSave(style, color)` to update parent state
5. Close modal

**Error state:** inline red banner if PATCH fails.

---

## 9. Task 7 — Update Home + Missions Pages

### `home/page.tsx`
- Hero: change from `from-yellow-400 to-orange-400` → `from-indigo-500 to-violet-600`
- Hero text: white (unchanged)
- Points badge: white bg, `text-indigo-700 font-extrabold`
- Quick-launch cards: 3D button system (indigo for Missions, violet for Chat)
- Badge chips: `bg-indigo-50 border-indigo-200` for earned, `bg-slate-50 border-slate-200` for not-earned
- Quote footer: `bg-indigo-50 border border-indigo-100 text-indigo-700`
- Add **Edit Character** button on the hero strip (small `<Pencil size={14}>` + "Edit Character" text, opens `AvatarCustomizeModal`)
- `AvatarCustomizeModal` wired with profile state; on save, updates `profile` state so avatar + color refresh in-place

### `missions/page.tsx`
- Page bg: `from-indigo-500 via-violet-500 to-purple-600` (replaces yellow-orange-pink)
- Answer option buttons: indigo ring on hover, `active:scale-95`
- "Check!" button: 3D indigo system
- Results screen buttons: 3D indigo + 3D violet

---

## 10. localStorage Keys (unchanged)
- `primepal_student_token` — JWT
- `primepal_student_name` — display name
- `primepal_student_avatar` — avatar URL (updated by customization flow)

No new keys needed. `avatar_style` and `theme_color` are fetched fresh from `/missions/me` on each session mount.

---

## 11. Files Changed

| File | Action |
|------|--------|
| `supabase/migrations/010_avatar_customization.sql` | **Create** |
| `backend/app/api/v1/endpoints/auth.py` | Modify — add PATCH + update GET avatar response |
| `backend/app/api/v1/endpoints/missions.py` | Modify — update `/me` response schema |
| `frontend/app/(student)/layout.tsx` | Modify — white nav, indigo palette |
| `frontend/app/(student)/play/page.tsx` | Modify — modern login card |
| `frontend/app/(student)/play/avatar-select.tsx` | Modify — character select design |
| `frontend/app/(student)/home/page.tsx` | Modify — indigo palette + Edit Character button |
| `frontend/app/(student)/missions/page.tsx` | Modify — indigo palette |
| `frontend/components/student/AvatarCustomizeModal.tsx` | **Create** |
