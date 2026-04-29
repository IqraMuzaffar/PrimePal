# Student UI Overhaul + Avatar Customization — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the pastel/childish student UI with a modern light-gaming aesthetic (Duolingo-light energy) and add persistent avatar customization (DiceBear style + theme color saved to DB).

**Architecture:** DB gets two new columns (`avatar_style`, `theme_color`) on `students`. Backend gets a new PATCH endpoint plus updated GET schemas. Frontend gets a full color/button overhaul across all student routes plus a new `AvatarCustomizeModal` component wired to the home dashboard. No new tables, no auth changes.

**Tech Stack:** FastAPI + Supabase (Python), Next.js 14 App Router + Tailwind CSS + `lucide-react` + `next/image`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `supabase/migrations/010_avatar_customization.sql` | **Create** | Add `avatar_style` + `theme_color` columns to `students` |
| `backend/app/api/v1/endpoints/auth.py` | Modify | Add PATCH `/student/profile`; expand GET avatars response |
| `backend/app/api/v1/endpoints/missions.py` | Modify | Expand `StudentProfileResponse` + `/me` query |
| `backend/tests/test_auth.py` | Modify | Add tests for PATCH endpoint + updated GET |
| `backend/tests/test_missions.py` | Modify | Add test for expanded `/me` response |
| `frontend/app/(student)/layout.tsx` | Modify | White nav + indigo palette overhaul |
| `frontend/app/(student)/play/page.tsx` | Modify | Modern Gamepad2 icon + 3D button + vivid bg |
| `frontend/app/(student)/play/avatar-select.tsx` | Modify | Character Select design + pencil icon → login flow |
| `frontend/components/student/AvatarCustomizeModal.tsx` | **Create** | Style picker + color picker + PATCH save |
| `frontend/app/(student)/home/page.tsx` | Modify | Indigo palette + Edit Character button + modal wiring |
| `frontend/app/(student)/missions/page.tsx` | Modify | Indigo palette + 3D buttons |

---

## Task 1: DB Migration — Add `avatar_style` and `theme_color`

**Files:**
- Create: `supabase/migrations/010_avatar_customization.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- ============================================================
-- PrimePal: Avatar Customization Columns
-- Run in Supabase SQL Editor
-- ============================================================

-- Add avatar_style and theme_color to students table (idempotent)
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS avatar_style TEXT NOT NULL DEFAULT 'adventurer',
  ADD COLUMN IF NOT EXISTS theme_color  TEXT NOT NULL DEFAULT '#6366f1';
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/010_avatar_customization.sql
git commit -m "feat: add avatar_style and theme_color columns to students table"
```

---

## Task 2: Backend — Update `auth.py` (GET avatars + PATCH profile)

**Files:**
- Modify: `backend/app/api/v1/endpoints/auth.py`
- Test: `backend/tests/test_auth.py`

### Context
- `auth.py` currently has `GET /classroom/{class_code}/avatars` and `POST /student/login`.
- `GET /classroom/{class_code}/avatars` needs to return `avatar_style` and `theme_color`.
- New `PATCH /auth/student/profile` requires `get_current_student` (student JWT dependency, imported from `app.core.security`) and `get_supabase_admin` (service-role client, imported from `app.core.supabase_client`).

- [ ] **Step 1: Write failing tests**

Open `backend/tests/test_auth.py`. Add these test classes at the end of the file:

```python
# ── New tests for Task 2 ──────────────────────────────────────────────────────

from app.core.security import create_student_token


class TestGetAvatarsReturnsCustomizationFields:
    """GET /auth/classroom/{code}/avatars now includes avatar_style + theme_color."""

    def test_avatars_include_style_and_color(self, client):
        import asyncio
        mock_classroom = MagicMock()
        mock_classroom.data = {"id": "cls-1"}
        mock_students = MagicMock()
        mock_students.data = [
            {
                "id": "stu-1",
                "student_name": "Ali",
                "avatar_url": "https://api.dicebear.com/7.x/adventurer/svg?seed=Ali",
                "avatar_style": "adventurer",
                "theme_color": "#6366f1",
            }
        ]
        mock_sb = MagicMock()
        (mock_sb.table.return_value.select.return_value
         .eq.return_value.maybe_single.return_value.execute.return_value) = mock_classroom
        (mock_sb.table.return_value.select.return_value
         .eq.return_value.execute.return_value) = mock_students

        with patch("app.api.v1.endpoints.auth.get_supabase", return_value=mock_sb):
            response = asyncio.get_event_loop().run_until_complete(
                client.get("/api/v1/auth/classroom/ABC123/avatars")
            )

        assert response.status_code == 200
        data = response.json()
        assert data[0]["avatar_style"] == "adventurer"
        assert data[0]["theme_color"] == "#6366f1"


class TestPatchStudentProfile:
    """PATCH /auth/student/profile — update avatar_style and theme_color."""

    def _token(self):
        return create_student_token(student_id="stu-1", classroom_id="cls-1")

    def test_update_avatar_style_and_color(self, client):
        import asyncio
        mock_sb = MagicMock()
        mock_sb.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock()
        mock_result = MagicMock()
        mock_result.data = {"avatar_style": "bottts", "theme_color": "#8b5cf6"}
        (mock_sb.table.return_value.select.return_value
         .eq.return_value.maybe_single.return_value.execute.return_value) = mock_result

        with patch("app.api.v1.endpoints.auth.get_supabase_admin", return_value=mock_sb):
            response = asyncio.get_event_loop().run_until_complete(
                client.patch(
                    "/api/v1/auth/student/profile",
                    json={"avatar_style": "bottts", "theme_color": "#8b5cf6"},
                    headers={"Authorization": f"Bearer {self._token()}"},
                )
            )

        assert response.status_code == 200
        data = response.json()
        assert data["avatar_style"] == "bottts"
        assert data["theme_color"] == "#8b5cf6"

    def test_rejects_invalid_style(self, client):
        import asyncio
        with patch("app.api.v1.endpoints.auth.get_supabase_admin", return_value=MagicMock()):
            response = asyncio.get_event_loop().run_until_complete(
                client.patch(
                    "/api/v1/auth/student/profile",
                    json={"avatar_style": "hacker-style"},
                    headers={"Authorization": f"Bearer {self._token()}"},
                )
            )
        assert response.status_code == 422

    def test_rejects_invalid_hex_color(self, client):
        import asyncio
        with patch("app.api.v1.endpoints.auth.get_supabase_admin", return_value=MagicMock()):
            response = asyncio.get_event_loop().run_until_complete(
                client.patch(
                    "/api/v1/auth/student/profile",
                    json={"theme_color": "red"},
                    headers={"Authorization": f"Bearer {self._token()}"},
                )
            )
        assert response.status_code == 422

    def test_requires_auth(self, client):
        import asyncio
        response = asyncio.get_event_loop().run_until_complete(
            client.patch("/api/v1/auth/student/profile", json={"avatar_style": "bottts"})
        )
        assert response.status_code == 403
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd backend && python -m pytest tests/test_auth.py::TestGetAvatarsReturnsCustomizationFields tests/test_auth.py::TestPatchStudentProfile -v
```

Expected: FAIL (endpoint and fields don't exist yet)

- [ ] **Step 3: Update `auth.py`**

Replace the full contents of `backend/app/api/v1/endpoints/auth.py` with:

```python
"""
Feature 1: Smart Auth & Role Management

Endpoints:
  GET   /api/v1/auth/classroom/{class_code}/avatars  — fetch student roster for visual login
  POST  /api/v1/auth/student/login                   — validate avatar tap and issue JWT
  PATCH /api/v1/auth/student/profile                 — update avatar_style and theme_color
"""
import re
import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, field_validator

from app.core.security import create_student_token, get_current_student
from app.core.supabase_client import get_supabase, get_supabase_admin

logger = logging.getLogger(__name__)

router = APIRouter()

_VALID_STYLES = {"adventurer", "bottts", "fun-emoji", "pixel-art", "lorelei"}
_HEX_RE = re.compile(r"^#[0-9a-fA-F]{6}$")


# ── Schemas ──────────────────────────────────────────────────────────────────

class AvatarResponse(BaseModel):
    id: str
    student_name: str
    avatar_url: str
    avatar_style: str
    theme_color: str


class StudentLoginRequest(BaseModel):
    student_id: str
    class_code: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UpdateProfileRequest(BaseModel):
    avatar_style: str | None = None
    theme_color: str | None = None

    @field_validator("avatar_style")
    @classmethod
    def validate_style(cls, v):
        if v is not None and v not in _VALID_STYLES:
            raise ValueError(f"avatar_style must be one of {sorted(_VALID_STYLES)}")
        return v

    @field_validator("theme_color")
    @classmethod
    def validate_color(cls, v):
        if v is not None and not _HEX_RE.match(v):
            raise ValueError("theme_color must be a valid 6-digit hex color (e.g. #6366f1)")
        return v


class UpdateProfileResponse(BaseModel):
    avatar_style: str
    theme_color: str


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get(
    "/classroom/{class_code}/avatars",
    response_model=List[AvatarResponse],
    summary="Fetch avatar roster for a classroom",
)
async def get_classroom_avatars(class_code: str) -> List[AvatarResponse]:
    """
    Step 1 of the student visual login flow.
    Returns all student profiles (id, name, avatar_url, avatar_style, theme_color)
    for the given class code so the frontend can render the character select grid.
    """
    supabase = get_supabase()

    classroom_res = (
        supabase.table("classrooms")
        .select("id")
        .eq("class_code", class_code)
        .maybe_single()
        .execute()
    )
    if not classroom_res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No classroom found for class code '{class_code}'",
        )

    classroom_id: str = classroom_res.data["id"]

    students_res = (
        supabase.table("students")
        .select("id, student_name, avatar_url, avatar_style, theme_color")
        .eq("classroom_id", classroom_id)
        .execute()
    )

    return students_res.data or []


@router.post(
    "/student/login",
    response_model=TokenResponse,
    summary="Validate student avatar selection and issue JWT",
)
async def student_login(request: StudentLoginRequest) -> TokenResponse:
    """
    Step 2 of the student visual login flow.
    Verifies the selected student belongs to the classroom and issues a signed JWT.
    """
    supabase = get_supabase()

    classroom_res = (
        supabase.table("classrooms")
        .select("id")
        .eq("class_code", request.class_code)
        .maybe_single()
        .execute()
    )
    if not classroom_res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No classroom found for class code '{request.class_code}'",
        )

    classroom_id: str = classroom_res.data["id"]

    student_res = (
        supabase.table("students")
        .select("id")
        .eq("id", request.student_id)
        .eq("classroom_id", classroom_id)
        .maybe_single()
        .execute()
    )
    if not student_res.data:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Student does not belong to this classroom",
        )

    token = create_student_token(
        student_id=request.student_id,
        classroom_id=classroom_id,
    )
    return TokenResponse(access_token=token)


@router.patch(
    "/student/profile",
    response_model=UpdateProfileResponse,
    summary="Update student avatar style and theme color",
)
async def update_student_profile(
    body: UpdateProfileRequest,
    student: dict = Depends(get_current_student),
) -> UpdateProfileResponse:
    """
    Updates the authenticated student's avatar_style and/or theme_color.
    Both fields are optional — send only what changed.
    """
    student_id: str = student["sub"]
    supabase = get_supabase_admin()

    updates: dict = {}
    if body.avatar_style is not None:
        updates["avatar_style"] = body.avatar_style
    if body.theme_color is not None:
        updates["theme_color"] = body.theme_color

    if not updates:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Provide at least one field to update (avatar_style or theme_color)",
        )

    supabase.table("students").update(updates).eq("id", student_id).execute()

    result = (
        supabase.table("students")
        .select("avatar_style, theme_color")
        .eq("id", student_id)
        .maybe_single()
        .execute()
    )
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found",
        )

    return UpdateProfileResponse(
        avatar_style=result.data["avatar_style"],
        theme_color=result.data["theme_color"],
    )
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd backend && python -m pytest tests/test_auth.py -v
```

Expected: all auth tests pass (including the new ones)

- [ ] **Step 5: Commit**

```bash
git add backend/app/api/v1/endpoints/auth.py backend/tests/test_auth.py
git commit -m "feat: add PATCH /student/profile and return avatar_style/theme_color in GET avatars"
```

---

## Task 3: Backend — Expand `/missions/me` Response

**Files:**
- Modify: `backend/app/api/v1/endpoints/missions.py`
- Test: `backend/tests/test_missions.py`

### Context
`StudentProfileResponse` is at line 74 in `missions.py`. The `/me` endpoint queries `"student_name, avatar_url, points"`. Both need `avatar_style` and `theme_color` added.

- [ ] **Step 1: Write failing test**

Open `backend/tests/test_missions.py`. Find the existing `/me` test class and add one test to it:

```python
def test_me_includes_customization_fields(self, client):
    """GET /missions/me returns avatar_style and theme_color."""
    import asyncio
    token = _make_student_token()
    mock_sb = MagicMock()
    mock_result = MagicMock()
    mock_result.data = {
        "student_name": "Ali",
        "avatar_url": "https://api.dicebear.com/7.x/adventurer/svg?seed=Ali",
        "avatar_style": "bottts",
        "theme_color": "#8b5cf6",
        "points": 50,
    }
    (mock_sb.table.return_value.select.return_value
     .eq.return_value.maybe_single.return_value.execute.return_value) = mock_result

    with patch("app.api.v1.endpoints.missions.get_supabase_admin", return_value=mock_sb):
        response = asyncio.get_event_loop().run_until_complete(
            client.get(
                "/api/v1/missions/me",
                headers={"Authorization": f"Bearer {token}"},
            )
        )

    assert response.status_code == 200
    data = response.json()
    assert data["avatar_style"] == "bottts"
    assert data["theme_color"] == "#8b5cf6"
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd backend && python -m pytest tests/test_missions.py -v -k "test_me_includes_customization"
```

Expected: FAIL (fields missing from response)

- [ ] **Step 3: Update `missions.py`**

Find `StudentProfileResponse` (around line 74) and replace it:

```python
class StudentProfileResponse(BaseModel):
    student_id: str
    student_name: str
    avatar_url: str | None
    points: int
    avatar_style: str
    theme_color: str
```

Find the `get_student_profile` endpoint. Update the Supabase `.select()` call from:
```python
.select("student_name, avatar_url, points")
```
to:
```python
.select("student_name, avatar_url, avatar_style, theme_color, points")
```

Update the return statement from:
```python
    return StudentProfileResponse(
        student_id=student_id,
        student_name=data["student_name"],
        avatar_url=data.get("avatar_url"),
        points=data.get("points") or 0,
    )
```
to:
```python
    return StudentProfileResponse(
        student_id=student_id,
        student_name=data["student_name"],
        avatar_url=data.get("avatar_url"),
        points=data.get("points") or 0,
        avatar_style=data.get("avatar_style") or "adventurer",
        theme_color=data.get("theme_color") or "#6366f1",
    )
```

- [ ] **Step 4: Run all backend tests**

```bash
cd backend && python -m pytest tests/ -v
```

Expected: 94+ tests pass, only the 3 pre-existing `TestRetrieveGradeFilteredChunks` failures remain (pre-existing, unrelated to this change)

- [ ] **Step 5: Commit**

```bash
git add backend/app/api/v1/endpoints/missions.py backend/tests/test_missions.py
git commit -m "feat: return avatar_style and theme_color from GET /missions/me"
```

---

## Task 4: Frontend — Overhaul `layout.tsx`

**Files:**
- Modify: `frontend/app/(student)/layout.tsx`

Replace the entire file:

- [ ] **Step 1: Replace `layout.tsx`**

```tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";
import { apiFetch } from "@/lib/api";

interface StudentProfile {
  student_id: string;
  student_name: string;
  avatar_url: string | null;
  avatar_style: string;
  theme_color: string;
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("primepal_student_token");
    if (!token) { setLoading(false); return; }

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
      {/* ── Top bar ── */}
      <header className="sticky top-0 z-20 bg-white border-b border-slate-100 shadow-sm">
        <div className="flex items-center justify-between px-4 py-2 gap-2 max-w-2xl mx-auto">
          {/* Logo */}
          <Link href="/home" className="flex items-center gap-1.5 shrink-0">
            <span className="text-2xl leading-none">⭐</span>
            <span className="font-extrabold text-indigo-600 text-lg tracking-tight hidden sm:inline">
              PrimePal
            </span>
          </Link>

          {/* Nav links */}
          <nav className="flex items-center gap-1">
            {NAV_LINKS.map(({ href, label, icon }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  className={[
                    "flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-bold transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                    active
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 hover:text-indigo-600",
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
                <div className="w-8 h-8 rounded-full bg-slate-200" />
                <div className="h-5 w-14 rounded-full bg-slate-200" />
              </div>
            )}

            {!loading && profile && (
              <>
                {profile.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt={profile.student_name}
                    width={32}
                    height={32}
                    className="rounded-full border-2 border-indigo-200 shadow-sm"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full border-2 border-indigo-200 bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
                    {profile.student_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="bg-indigo-100 text-indigo-700 rounded-full px-2 py-0.5 text-xs font-bold whitespace-nowrap">
                  ⭐ {profile.points}
                </span>
              </>
            )}

            <button
              onClick={handleLogout}
              className="bg-indigo-600 text-white text-xs font-bold px-3 py-1.5 rounded-full
                         shadow-[0_3px_0_#3730a3] hover:brightness-110
                         active:translate-y-[3px] active:shadow-none
                         transition-all duration-100 border-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              aria-label="Logout"
            >
              Out 👋
            </button>
          </div>
        </div>
      </header>

      <main className="p-4 max-w-2xl mx-auto">{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "frontend/app/(student)/layout.tsx"
git commit -m "feat: overhaul student layout to white/indigo gaming palette"
```

---

## Task 5: Frontend — Redesign `play/page.tsx` (Class Code Entry)

**Files:**
- Modify: `frontend/app/(student)/play/page.tsx`

- [ ] **Step 1: Replace `play/page.tsx`**

```tsx
"use client";

import { useState, FormEvent } from "react";
import { Loader2, Gamepad2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import AvatarSelect from "./avatar-select";

interface Avatar {
  id: string;
  student_name: string;
  avatar_url: string;
  avatar_style: string;
  theme_color: string;
}

type Step = "enter-code" | "pick-avatar";

export default function StudentPlayPage() {
  const [step, setStep] = useState<Step>("enter-code");
  const [classCode, setClassCode] = useState("");
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCodeSubmit(e: FormEvent) {
    e.preventDefault();
    const code = classCode.trim().toUpperCase();
    if (!code) return;
    setError(null);
    setLoading(true);
    try {
      const data = await apiFetch<Avatar[]>(`/auth/classroom/${code}/avatars`);
      if (data.length === 0) {
        setError("No students found in this class. Ask your teacher!");
      } else {
        setAvatars(data);
        setStep("pick-avatar");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again!");
    } finally {
      setLoading(false);
    }
  }

  function handleBack() {
    setStep("enter-code");
    setAvatars([]);
    setError(null);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-violet-600 flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl ring-1 ring-white/20 p-8">
        {step === "enter-code" && (
          <div>
            {/* Icon + heading */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-100 rounded-2xl mb-4">
                <Gamepad2 size={44} className="text-indigo-600" />
              </div>
              <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">
                Enter Your Class Code
              </h2>
              <p className="text-slate-500 text-base mt-2 font-medium">
                Get the code from your teacher.
              </p>
            </div>

            <form onSubmit={handleCodeSubmit} className="space-y-5">
              <input
                type="text"
                value={classCode}
                onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                maxLength={10}
                required
                placeholder="ABC123"
                className="w-full text-center text-4xl font-black tracking-[0.3em] uppercase
                           px-4 py-5 rounded-2xl border-4 border-slate-200 bg-white
                           text-slate-800 placeholder-slate-300
                           focus:outline-none focus:border-indigo-500
                           focus:ring-4 focus:ring-indigo-100
                           transition-all shadow-inner"
                aria-label="Class code"
              />

              {error && (
                <p className="text-center text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
                  😬 {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || classCode.trim().length === 0}
                className="w-full bg-indigo-600 text-white font-extrabold text-2xl py-5 rounded-2xl
                           shadow-[0_5px_0_#3730a3] hover:brightness-110
                           active:translate-y-[5px] active:shadow-none
                           disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0
                           transition-all duration-100 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={28} className="animate-spin" /> : "Let's Go! 🚀"}
              </button>
            </form>

            <p className="text-center text-xs text-slate-400 mt-6">
              Are you a teacher?{" "}
              <a href="/login" className="text-indigo-500 hover:underline font-medium">
                Sign in here
              </a>
            </p>
          </div>
        )}

        {step === "pick-avatar" && (
          <AvatarSelect
            classCode={classCode.trim().toUpperCase()}
            avatars={avatars}
            onBack={handleBack}
          />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "frontend/app/(student)/play/page.tsx"
git commit -m "feat: redesign class code entry page with Gamepad2 icon and 3D button"
```

---

## Task 6: Frontend — Redesign `avatar-select.tsx` → Character Select

**Files:**
- Modify: `frontend/app/(student)/play/avatar-select.tsx`

- [ ] **Step 1: Replace `avatar-select.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import { apiFetch } from "@/lib/api";

interface Avatar {
  id: string;
  student_name: string;
  avatar_url: string;
  avatar_style: string;
  theme_color: string;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
}

interface Props {
  classCode: string;
  avatars: Avatar[];
  onBack: () => void;
}

export default function AvatarSelect({ classCode, avatars, onBack }: Props) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAvatarTap(avatar: Avatar) {
    setError(null);
    setLoadingId(avatar.id);
    try {
      const data = await apiFetch<TokenResponse>("/auth/student/login", {
        method: "POST",
        body: JSON.stringify({ student_id: avatar.id, class_code: classCode }),
      });
      localStorage.setItem("primepal_student_token", data.access_token);
      localStorage.setItem("primepal_student_name", avatar.student_name);
      localStorage.setItem("primepal_student_avatar", avatar.avatar_url);
      router.push("/home");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed. Please try again.");
      setLoadingId(null);
    }
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">
          Choose Your Character
        </h2>
        <p className="text-slate-500 mt-1 text-sm font-medium">
          Tap yourself to enter!
        </p>
      </div>

      {/* Character grid */}
      <div className="grid grid-cols-2 gap-3">
        {avatars.map((avatar) => {
          const isLoading = loadingId === avatar.id;
          return (
            <button
              key={avatar.id}
              onClick={() => handleAvatarTap(avatar)}
              disabled={!!loadingId}
              className="relative flex flex-col items-center pt-4 pb-4 px-3
                         bg-white rounded-2xl ring-1 ring-slate-200 shadow-md
                         hover:shadow-xl hover:scale-[1.04] active:scale-95
                         disabled:opacity-60 disabled:cursor-not-allowed
                         transition-all duration-150 focus:outline-none
                         focus-visible:ring-2 focus-visible:ring-indigo-500
                         overflow-hidden"
              aria-label={`Login as ${avatar.student_name}`}
            >
              {/* Theme color top strip */}
              <div
                className="absolute top-0 left-0 right-0 h-1.5"
                style={{ backgroundColor: avatar.theme_color }}
              />

              {isLoading ? (
                <div className="w-20 h-20 flex items-center justify-center">
                  <Loader2 size={36} className="animate-spin text-indigo-500" />
                </div>
              ) : (
                <div
                  className="w-20 h-20 rounded-full ring-4 ring-offset-2 overflow-hidden bg-slate-50"
                  style={{ ringColor: avatar.theme_color }}
                >
                  <Image
                    src={avatar.avatar_url}
                    alt={avatar.student_name}
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <span className="mt-3 text-sm font-bold text-slate-700 text-center leading-tight">
                {avatar.student_name}
              </span>
            </button>
          );
        })}
      </div>

      {error && (
        <p className="mt-4 text-center text-sm font-medium text-red-600 bg-red-50 rounded-2xl px-4 py-3 border border-red-200">
          😬 {error}
        </p>
      )}

      <button
        onClick={onBack}
        className="mt-6 w-full text-sm font-semibold text-slate-400 hover:text-slate-700 transition-colors"
      >
        ← Wrong class? Go back
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "frontend/app/(student)/play/avatar-select.tsx"
git commit -m "feat: redesign avatar select as Character Select with player profile cards"
```

---

## Task 7: Frontend — Create `AvatarCustomizeModal.tsx`

**Files:**
- Create: `frontend/components/student/AvatarCustomizeModal.tsx`

- [ ] **Step 1: Create the directory and file**

Create `frontend/components/student/` directory (if it doesn't exist) and write:

```tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface Props {
  studentName: string;
  currentStyle: string;
  currentColor: string;
  onSave: (style: string, color: string) => void;
  onClose: () => void;
}

const STYLES = [
  { id: "adventurer", label: "Adventurer" },
  { id: "bottts",     label: "Robots" },
  { id: "fun-emoji",  label: "Fun Emoji" },
  { id: "pixel-art",  label: "Pixel Art" },
  { id: "lorelei",    label: "Lorelei" },
];

const COLORS = [
  { hex: "#6366f1", label: "Indigo" },
  { hex: "#8b5cf6", label: "Violet" },
  { hex: "#f43f5e", label: "Rose" },
  { hex: "#f59e0b", label: "Amber" },
  { hex: "#10b981", label: "Emerald" },
  { hex: "#0ea5e9", label: "Sky" },
  { hex: "#f97316", label: "Orange" },
  { hex: "#ec4899", label: "Pink" },
];

function dicebearUrl(style: string, seed: string) {
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}`;
}

export default function AvatarCustomizeModal({
  studentName,
  currentStyle,
  currentColor,
  onSave,
  onClose,
}: Props) {
  const [selectedStyle, setSelectedStyle] = useState(currentStyle);
  const [selectedColor, setSelectedColor] = useState(currentColor);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("primepal_student_token")
        : null;
    try {
      await apiFetch("/auth/student/profile", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token ?? ""}` },
        body: JSON.stringify({
          avatar_style: selectedStyle,
          theme_color: selectedColor,
        }),
      });
      // Update cached avatar URL in localStorage
      const newAvatarUrl = dicebearUrl(selectedStyle, studentName);
      if (typeof window !== "undefined") {
        localStorage.setItem("primepal_student_avatar", newAvatarUrl);
      }
      onSave(selectedStyle, selectedColor);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not save. Try again.");
      setSaving(false);
    }
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-slate-800">Edit Character</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <X size={16} className="text-slate-600" />
          </button>
        </div>

        {/* Live preview */}
        <div className="flex justify-center">
          <div
            className="w-24 h-24 rounded-full ring-4 ring-offset-2 overflow-hidden bg-slate-50 transition-all duration-300"
            style={{ ringColor: selectedColor }}
          >
            <Image
              src={dicebearUrl(selectedStyle, studentName)}
              alt="Avatar preview"
              width={96}
              height={96}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Style picker */}
        <div>
          <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2">
            Avatar Style
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {STYLES.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedStyle(s.id)}
                className={[
                  "flex flex-col items-center gap-1 p-2 rounded-xl shrink-0 border-2 transition-all duration-150",
                  selectedStyle === s.id
                    ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-300"
                    : "border-slate-200 bg-white hover:border-slate-300",
                ].join(" ")}
              >
                <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-100">
                  <Image
                    src={dicebearUrl(s.id, studentName)}
                    alt={s.label}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="text-[10px] font-bold text-slate-600 whitespace-nowrap">
                  {s.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Color picker */}
        <div>
          <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2">
            Profile Color
          </p>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                key={c.hex}
                onClick={() => setSelectedColor(c.hex)}
                className={[
                  "w-9 h-9 rounded-full border-2 transition-all duration-150",
                  selectedColor === c.hex
                    ? "border-slate-700 ring-4 ring-offset-2 ring-slate-400 scale-110"
                    : "border-white shadow-sm hover:scale-105",
                ].join(" ")}
                style={{ backgroundColor: c.hex }}
                aria-label={c.label}
              />
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2 border border-red-200">
            😬 {error}
          </p>
        )}

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-indigo-600 text-white font-extrabold text-lg py-4 rounded-2xl
                     shadow-[0_4px_0_#3730a3] hover:brightness-110
                     active:translate-y-1 active:shadow-none
                     disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0
                     transition-all duration-100"
        >
          {saving ? "Saving…" : "Save Character ✓"}
        </button>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/student/AvatarCustomizeModal.tsx
git commit -m "feat: add AvatarCustomizeModal with style picker and color swatches"
```

---

## Task 8: Frontend — Update `home/page.tsx` (Indigo palette + Edit Character)

**Files:**
- Modify: `frontend/app/(student)/home/page.tsx`

The home page needs 4 targeted changes:
1. Import `AvatarCustomizeModal` and `Pencil` from `lucide-react`
2. Add modal state (`showModal`) and wire Edit Character button in hero
3. Update hero gradient from yellow/orange to indigo/violet
4. Update badge, card, and button colors to indigo palette

- [ ] **Step 1: Replace `home/page.tsx`**

```tsx
"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import Image from "next/image";
import { apiFetch } from "@/lib/api";
import AvatarCustomizeModal from "@/components/student/AvatarCustomizeModal";

// ── Types ────────────────────────────────────────────────────────────────────

interface StudentProfile {
  student_id: string;
  student_name: string;
  avatar_url: string | null;
  avatar_style: string;
  theme_color: string;
  points: number;
}

// ── Constants ────────────────────────────────────────────────────────────────

const BADGES = [
  { id: "first_star",   label: "First Star",   icon: "⭐", threshold: 1,   desc: "Earn your first point!" },
  { id: "on_fire",      label: "On Fire",       icon: "🔥", threshold: 50,  desc: "50 stars earned!" },
  { id: "star_learner", label: "Star Learner",  icon: "💎", threshold: 100, desc: "100 stars — amazing!" },
  { id: "champion",     label: "Champion",      icon: "🏆", threshold: 200, desc: "200 stars — champion!" },
];

const COMING_SOON = [
  { id: "leaderboard",  icon: "🏆", label: "Class Leaderboard",  tagline: "See who's on top!" },
  { id: "spelling_bee", icon: "🐝", label: "Spelling Bee",        tagline: "Can you spell it?" },
  { id: "story_time",   icon: "📖", label: "Story Time",          tagline: "Read & discover!" },
  { id: "speaking",     icon: "🎤", label: "Speaking Practice",   tagline: "Talk to PrimePal!" },
];

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

function dicebearUrl(style: string, seed: string) {
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}`;
}

// ── Sub-components ───────────────────────────────────────────────────────────

function HeroSkeleton() {
  return (
    <div className="w-full rounded-3xl bg-gradient-to-r from-indigo-300 to-violet-300 p-6 animate-pulse flex justify-between items-center">
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
        "relative flex flex-col items-center justify-center gap-2 p-4 rounded-2xl w-full",
        "bg-slate-100 border-2 border-slate-200 text-slate-400",
        "transition-all duration-150 select-none",
        shaking ? "animate-[wiggle_0.4s_ease-in-out]" : "",
      ].join(" ")}
      aria-label={`${label} — coming soon`}
    >
      <span className="absolute top-2 right-2 text-xs opacity-50">🔒</span>
      <span className="text-3xl opacity-40">{icon}</span>
      <span className="text-xs font-bold text-slate-400 text-center leading-tight">{label}</span>
      <span className="text-[11px] text-slate-300 text-center leading-tight">{tagline}</span>
      {showTip && (
        <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap z-10 animate-[fadeInDown_0.2s_ease-out]">
          Coming Soon! 🔒
        </span>
      )}
    </button>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function HomePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [quoteFading, setQuoteFading] = useState(false);
  const quoteTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) { router.push("/play"); return; }

    apiFetch<StudentProfile>("/missions/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(setProfile)
      .catch(() => {})
      .finally(() => setLoadingProfile(false));
  }, [router]);

  useEffect(() => {
    const t = setInterval(() => {
      setQuoteFading(true);
      setTimeout(() => { setQuoteIndex((i) => (i + 1) % QUOTES.length); setQuoteFading(false); }, 400);
    }, 8000);
    return () => clearInterval(t);
  }, []);

  function handleCustomizeSave(style: string, color: string) {
    if (!profile) return;
    const newUrl = dicebearUrl(style, profile.student_name);
    setProfile({ ...profile, avatar_style: style, theme_color: color, avatar_url: newUrl });
    setShowModal(false);
  }

  const points = profile?.points ?? 0;
  const name = profile?.student_name
    ?? (typeof window !== "undefined" ? localStorage.getItem("primepal_student_name") : null)
    ?? "Champion";

  return (
    <div className="max-w-md mx-auto space-y-6 pb-10">

      {/* ① Hero strip */}
      {loadingProfile ? <HeroSkeleton /> : (
        <div className="w-full rounded-3xl bg-gradient-to-r from-indigo-500 to-violet-600 p-5 flex items-center justify-between shadow-lg relative overflow-hidden">
          <div>
            <p className="text-white/80 text-sm font-semibold mb-0.5">Welcome back!</p>
            <h1 className="text-white text-2xl font-extrabold leading-tight drop-shadow">
              Hi {name}! 🌟
            </h1>
            <p className="text-white/80 text-sm mt-1">Ready to level up?</p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-2 flex items-center gap-1 bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3 py-1 rounded-full transition-all duration-150"
            >
              <Pencil size={11} />
              Edit Character
            </button>
          </div>
          <div className="flex flex-col items-center bg-white/20 rounded-2xl px-4 py-3 border-2 border-white/30">
            {profile?.avatar_url ? (
              <Image src={profile.avatar_url} alt={name} width={48} height={48} className="rounded-full border-2 border-white/60 mb-1" />
            ) : (
              <span className="text-3xl leading-none mb-1">⭐</span>
            )}
            <span className="text-white font-extrabold text-2xl leading-tight">{points}</span>
            <span className="text-white/70 text-xs font-semibold">Stars</span>
          </div>
        </div>
      )}

      {/* ② Quick-launch cards */}
      <section>
        <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3">Play Now</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/missions"
            className="flex flex-col items-center gap-2 p-5 rounded-2xl bg-indigo-600 border-b-4 border-indigo-800
                       shadow-[0_4px_0_#3730a3] hover:brightness-110
                       active:translate-y-1 active:shadow-none
                       text-white font-extrabold text-center transition-all duration-100"
          >
            <span className="text-4xl">🎯</span>
            <span className="text-base">Daily Missions</span>
            <span className="text-xs text-indigo-200 font-semibold">Earn stars!</span>
          </Link>
          <Link
            href="/chat"
            className="flex flex-col items-center gap-2 p-5 rounded-2xl bg-violet-500 border-b-4 border-violet-700
                       shadow-[0_4px_0_#5b21b6] hover:brightness-110
                       active:translate-y-1 active:shadow-none
                       text-white font-extrabold text-center transition-all duration-100"
          >
            <span className="text-4xl">💬</span>
            <span className="text-base">Chat with PrimePal</span>
            <span className="text-xs text-violet-200 font-semibold">Ask anything!</span>
          </Link>
        </div>
      </section>

      {/* ③ Achievements shelf */}
      <section>
        <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3">Your Badges</h2>
        <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
          {BADGES.map((badge) => {
            const earned = points >= badge.threshold;
            return (
              <div
                key={badge.id}
                className={[
                  "flex flex-col items-center gap-1 px-4 py-3 rounded-2xl border-2 shrink-0 w-24 text-center transition-all",
                  earned ? "bg-indigo-50 border-indigo-200 shadow-sm" : "bg-slate-50 border-slate-200 opacity-40",
                ].join(" ")}
                title={badge.desc}
              >
                <span className={["text-2xl", earned ? "" : "grayscale"].join(" ")}>{badge.icon}</span>
                <span className={["text-xs font-bold leading-tight", earned ? "text-slate-700" : "text-slate-400"].join(" ")}>{badge.label}</span>
                {earned
                  ? <span className="text-[10px] text-indigo-600 font-extrabold bg-indigo-100 rounded-full px-1.5">✓ Earned</span>
                  : <span className="text-[10px] text-slate-400 font-semibold">{badge.threshold} ⭐</span>
                }
              </div>
            );
          })}
        </div>
      </section>

      {/* ④ Coming-soon card grid */}
      <section>
        <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3">Coming Soon 🔒</h2>
        <div className="grid grid-cols-2 gap-3">
          {COMING_SOON.map((card) => (
            <LockedCard key={card.id} icon={card.icon} label={card.label} tagline={card.tagline} />
          ))}
        </div>
      </section>

      {/* ⑤ Motivational footer */}
      <div className={["w-full rounded-2xl bg-indigo-50 border border-indigo-100 px-5 py-4 text-center transition-opacity duration-[400ms]", quoteFading ? "opacity-0" : "opacity-100"].join(" ")}>
        <p className="text-sm font-bold text-indigo-700">{QUOTES[quoteIndex]}</p>
      </div>

      {/* Customization modal */}
      {showModal && profile && (
        <AvatarCustomizeModal
          studentName={profile.student_name}
          currentStyle={profile.avatar_style}
          currentColor={profile.theme_color}
          onSave={handleCustomizeSave}
          onClose={() => setShowModal(false)}
        />
      )}

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
git add "frontend/app/(student)/home/page.tsx"
git commit -m "feat: update home dashboard to indigo palette and wire Edit Character modal"
```

---

## Task 9: Frontend — Update `missions/page.tsx` (Indigo palette + 3D buttons)

**Files:**
- Modify: `frontend/app/(student)/missions/page.tsx`

Four targeted changes only — do NOT rewrite the whole file:

- [ ] **Step 1: Update page background gradient**

Find:
```tsx
<div className="min-h-screen bg-gradient-to-b from-yellow-300 via-orange-300 to-pink-300 flex flex-col items-center px-4 py-8">
```
Replace with:
```tsx
<div className="min-h-screen bg-gradient-to-b from-indigo-500 via-violet-500 to-purple-600 flex flex-col items-center px-4 py-8">
```

- [ ] **Step 2: Update "Play Again" button to 3D indigo**

Find the Play Again button in the results section:
```tsx
className="w-full bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xl py-5 rounded-2xl transition-all duration-150 shadow-lg border-b-4 border-orange-600 hover:shadow-xl hover:scale-[1.02] active:scale-95 active:border-b-0 active:translate-y-1"
```
Replace with:
```tsx
className="w-full bg-indigo-600 text-white font-extrabold text-xl py-5 rounded-2xl shadow-[0_5px_0_#3730a3] hover:brightness-110 active:translate-y-[5px] active:shadow-none transition-all duration-100"
```

- [ ] **Step 3: Update "Chat with PrimePal" link to 3D violet**

Find the Chat link in the results section:
```tsx
className="block w-full bg-violet-500 hover:bg-violet-600 text-white font-extrabold text-xl py-5 rounded-2xl transition-all duration-150 shadow-lg border-b-4 border-violet-700 hover:shadow-xl hover:scale-[1.02] active:scale-95 active:border-b-0 active:translate-y-1 text-center"
```
Replace with:
```tsx
className="block w-full bg-violet-500 text-white font-extrabold text-xl py-5 rounded-2xl shadow-[0_5px_0_#5b21b6] hover:brightness-110 active:translate-y-[5px] active:shadow-none transition-all duration-100 text-center"
```

- [ ] **Step 4: Update "Check!" submit button to 3D indigo**

Find:
```tsx
className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-extrabold text-xl py-4 rounded-2xl transition-all duration-150 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95"
```
Replace with:
```tsx
className="w-full bg-indigo-600 text-white font-extrabold text-xl py-4 rounded-2xl shadow-[0_4px_0_#3730a3] hover:brightness-110 active:translate-y-1 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0 transition-all duration-100"
```

- [ ] **Step 5: Commit**

```bash
git add "frontend/app/(student)/missions/page.tsx"
git commit -m "feat: update missions page to indigo/violet palette and 3D buttons"
```

---

## Self-Review

**Spec coverage:**
- ✅ DB migration: Task 1
- ✅ PATCH /student/profile + validation: Task 2
- ✅ GET avatars returns avatar_style/theme_color: Task 2
- ✅ GET /missions/me returns avatar_style/theme_color: Task 3
- ✅ Layout white nav + indigo palette: Task 4
- ✅ Play page Gamepad2 + 3D button + vivid bg: Task 5
- ✅ Character select redesign: Task 6
- ✅ AvatarCustomizeModal (style + color + PATCH save): Task 7
- ✅ Home page indigo palette + Edit Character button + modal wiring: Task 8
- ✅ Missions page indigo palette + 3D buttons: Task 9

**Placeholder scan:** No TBDs or TODOs. All code blocks are complete.

**Type consistency:**
- `StudentProfile` interface in `layout.tsx`, `home/page.tsx` both include `avatar_style: string` and `theme_color: string` — consistent.
- `Avatar` interface in `play/page.tsx` and `play/avatar-select.tsx` both include `avatar_style: string` and `theme_color: string` — consistent.
- `AvatarCustomizeModal` props: `currentStyle`, `currentColor`, `onSave(style, color)` — used consistently in Task 8 (`profile.avatar_style`, `profile.theme_color`, `handleCustomizeSave`).
- `dicebearUrl(style, seed)` utility defined identically in `home/page.tsx` and `AvatarCustomizeModal.tsx` — intentional duplication (two focused files, no shared util needed for 2 usages).
- `UpdateProfileRequest` in `auth.py` validates against `_VALID_STYLES` which matches the `STYLES` array in `AvatarCustomizeModal.tsx` exactly: `adventurer`, `bottts`, `fun-emoji`, `pixel-art`, `lorelei`.
