# Feature 2: Classroom Manager Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full classroom management system — SQL triggers, FastAPI endpoints, and Next.js teacher dashboard — so teachers can create classrooms with auto-generated class codes and manage student rosters.

**Architecture:** A PostgreSQL BEFORE INSERT trigger generates collision-free 6-char class codes automatically. FastAPI endpoints are protected by a `get_current_teacher` dependency that validates Supabase GoTrue JWTs. The Next.js teacher dashboard reads these endpoints and passes the Supabase session token as a Bearer header.

**Tech Stack:** Supabase (PostgreSQL + GoTrue), FastAPI + supabase-py, Next.js 14 App Router, Tailwind CSS, lucide-react, pytest + httpx

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `supabase/migrations/002_feature2_classroom.sql` | Add `grade_level` column + class-code trigger |
| Modify | `backend/app/schemas/classroom.py` | Aligned Pydantic schemas matching DB columns |
| Modify | `backend/app/core/security.py` | Add `get_current_teacher` dependency |
| Modify | `backend/app/api/v1/endpoints/classroom.py` | Full CRUD implementation |
| Create | `backend/tests/test_classroom.py` | 8 endpoint tests |
| Create | `frontend/lib/teacherAuth.ts` | Helper to get Supabase session Bearer headers |
| Modify | `frontend/types/index.ts` | Fix `Classroom` + `Student` interfaces |
| Create | `frontend/components/teacher/CreateClassroomModal.tsx` | Modal: class name + grade level form |
| Create | `frontend/components/teacher/BulkAddStudentsModal.tsx` | Modal: textarea → bulk add students |
| Modify | `frontend/app/(teacher)/classroom/page.tsx` | Classroom list with cards + copy-code button |
| Create | `frontend/app/(teacher)/classroom/[id]/page.tsx` | Detail page: header + roster table + remove |

---

## Task 1: SQL Migration — Add `grade_level` and class-code trigger

**Files:**
- Create: `supabase/migrations/002_feature2_classroom.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/002_feature2_classroom.sql
-- ============================================================
-- PrimePal Feature 2: Classroom Manager
-- Run AFTER 001_feature1_auth.sql in the Supabase SQL Editor.
-- ============================================================

-- 1. Add grade_level to classrooms (DEFAULT 1 handles any existing rows)
ALTER TABLE classrooms ADD COLUMN IF NOT EXISTS grade_level INTEGER NOT NULL DEFAULT 1;

-- 2. Auto-generate a unique 6-character alphanumeric class code
CREATE OR REPLACE FUNCTION generate_class_code()
RETURNS trigger AS $$
DECLARE
    new_code VARCHAR(6);
    code_exists BOOLEAN;
BEGIN
    LOOP
        -- md5 of a random float → take first 6 chars → uppercase
        new_code := upper(substring(md5(random()::text) from 1 for 6));
        SELECT EXISTS(SELECT 1 FROM classrooms WHERE class_code = new_code) INTO code_exists;
        IF NOT code_exists THEN
            NEW.class_code := new_code;
            EXIT;
        END IF;
    END LOOP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Attach trigger: fires BEFORE INSERT, once per row
DROP TRIGGER IF EXISTS set_class_code ON classrooms;
CREATE TRIGGER set_class_code
    BEFORE INSERT ON classrooms
    FOR EACH ROW
    EXECUTE FUNCTION generate_class_code();
```

- [ ] **Step 2: Apply migration**

In the Supabase dashboard → SQL Editor, paste and run the file above.
There is no automated migration runner in this project — it is applied manually.

- [ ] **Step 3: Commit the migration file**

```bash
cd /path/to/Primepal
git add supabase/migrations/002_feature2_classroom.sql
git commit -m "feat(db): add grade_level column and class-code auto-generation trigger"
```

---

## Task 2: Update Pydantic Schemas

**Files:**
- Modify: `backend/app/schemas/classroom.py`

- [ ] **Step 1: Replace the file with aligned schemas**

The existing file uses `name` but the DB column is `class_name`. Replace entirely:

```python
# backend/app/schemas/classroom.py
from typing import List
from pydantic import BaseModel, Field


class ClassroomCreate(BaseModel):
    class_name: str
    grade_level: int = Field(ge=1, le=5)


class ClassroomResponse(BaseModel):
    id: str
    class_name: str
    class_code: str
    grade_level: int
    created_at: str


class StudentResponse(BaseModel):
    id: str
    student_name: str
    avatar_url: str


class ClassroomDetail(ClassroomResponse):
    students: List[StudentResponse]


class StudentBulkCreate(BaseModel):
    names: List[str]
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/schemas/classroom.py
git commit -m "feat(schemas): update classroom schemas to match DB columns"
```

---

## Task 3: Add `get_current_teacher` to security.py

**Files:**
- Modify: `backend/app/core/security.py`

Teachers use Supabase GoTrue JWTs — validated by calling `supabase.auth.get_user(token)`.

- [ ] **Step 1: Add import and dependency to security.py**

Append to the bottom of `backend/app/core/security.py` (keep all existing code):

```python
# --- Teacher auth (Supabase GoTrue JWT) ---
# Import here to avoid circular imports at module load time.
from app.core.supabase_client import get_supabase  # noqa: E402 (already imported in callers)


def get_current_teacher(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> dict:
    """FastAPI dependency — validates a Supabase GoTrue JWT for a teacher session.

    Returns {"id": "<teacher_uuid>"} on success.
    Raises 401 if the token is invalid or expired.
    """
    supabase = get_supabase()
    response = supabase.auth.get_user(credentials.credentials)
    if not response or not response.user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired teacher session",
        )
    return {"id": str(response.user.id)}
```

Note: `_bearer`, `HTTPAuthorizationCredentials`, `Depends`, `HTTPException`, `status` are all already imported at the top of `security.py`.

- [ ] **Step 2: Verify the import chain is clean**

```bash
cd backend
python -c "from app.core.security import get_current_teacher; print('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add backend/app/core/security.py
git commit -m "feat(auth): add get_current_teacher dependency for Supabase GoTrue JWT"
```

---

## Task 4: Write Failing Tests for Classroom Endpoints

**Files:**
- Create: `backend/tests/test_classroom.py`

- [ ] **Step 1: Create the test file**

```python
# backend/tests/test_classroom.py
"""
Tests for Feature 2: Classroom Manager

Covers:
  - POST /api/v1/classroom/         — create classroom
  - GET  /api/v1/classroom/         — list classrooms
  - GET  /api/v1/classroom/{id}     — get classroom detail with roster
  - POST /api/v1/classroom/{id}/students/bulk  — bulk add students
  - DELETE /api/v1/classroom/{id}/students/{sid} — remove student
"""
from unittest.mock import MagicMock, patch

import pytest
from httpx import AsyncClient

# ── Constants ────────────────────────────────────────────────────────────────

TEACHER_ID  = "tttttttt-0000-0000-0000-000000000001"
CLASSROOM_ID = "cccccccc-0000-0000-0000-000000000001"
STUDENT_1_ID = "ssssssss-0000-0000-0000-000000000001"
STUDENT_2_ID = "ssssssss-0000-0000-0000-000000000002"

MOCK_TEACHER = {"id": TEACHER_ID}

MOCK_CLASSROOM_ROW = {
    "id": CLASSROOM_ID,
    "teacher_id": TEACHER_ID,
    "class_name": "Grade 3 — Blue",
    "class_code": "ABC123",
    "grade_level": 3,
    "created_at": "2026-04-01T10:00:00+00:00",
}

MOCK_STUDENTS = [
    {"id": STUDENT_1_ID, "student_name": "Ali", "avatar_url": "/avatars/tiger.png"},
    {"id": STUDENT_2_ID, "student_name": "Sara", "avatar_url": "/avatars/owl.png"},
]

# ── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def override_teacher_dep():
    """Bypass get_current_teacher for all tests in this module."""
    from app.main import app
    from app.core.security import get_current_teacher
    app.dependency_overrides[get_current_teacher] = lambda: MOCK_TEACHER
    yield
    app.dependency_overrides.pop(get_current_teacher, None)


def _make_admin_mock_simple(table_name: str, data):
    """Admin mock for single-table endpoints."""
    mock = MagicMock()
    result = MagicMock()
    result.data = data
    tbl = MagicMock()
    tbl.insert.return_value.execute.return_value = result
    tbl.select.return_value.eq.return_value.order.return_value.execute.return_value = result
    mock.table.return_value = tbl
    return mock


# ── POST /api/v1/classroom/ ───────────────────────────────────────────────────

class TestCreateClassroom:

    async def test_create_classroom_returns_201(self, client: AsyncClient):
        """Happy path: valid body → 201 + classroom with class_code."""
        mock_admin = MagicMock()
        result = MagicMock()
        result.data = [MOCK_CLASSROOM_ROW]
        mock_admin.table.return_value.insert.return_value.execute.return_value = result

        with patch("app.api.v1.endpoints.classroom.get_supabase_admin", return_value=mock_admin):
            resp = await client.post(
                "/api/v1/classroom/",
                json={"class_name": "Grade 3 — Blue", "grade_level": 3},
            )

        assert resp.status_code == 201
        body = resp.json()
        assert body["class_name"] == "Grade 3 — Blue"
        assert body["class_code"] == "ABC123"
        assert body["grade_level"] == 3

    async def test_create_classroom_requires_auth(self, client: AsyncClient):
        """No token → 403 (HTTPBearer raises 403 when credentials absent)."""
        from app.main import app
        from app.core.security import get_current_teacher
        # Remove the override for this test
        app.dependency_overrides.pop(get_current_teacher, None)

        resp = await client.post(
            "/api/v1/classroom/",
            json={"class_name": "Test", "grade_level": 1},
        )
        assert resp.status_code == 403

        # Restore for autouse teardown
        app.dependency_overrides[get_current_teacher] = lambda: MOCK_TEACHER


# ── GET /api/v1/classroom/ ────────────────────────────────────────────────────

class TestListClassrooms:

    async def test_list_classrooms_returns_owned(self, client: AsyncClient):
        """Teacher gets back their classrooms."""
        mock_admin = MagicMock()
        result = MagicMock()
        result.data = [MOCK_CLASSROOM_ROW]
        mock_admin.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value = result

        with patch("app.api.v1.endpoints.classroom.get_supabase_admin", return_value=mock_admin):
            resp = await client.get("/api/v1/classroom/")

        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["class_code"] == "ABC123"

    async def test_list_classrooms_empty(self, client: AsyncClient):
        """No classrooms → empty list, not an error."""
        mock_admin = MagicMock()
        result = MagicMock()
        result.data = []
        mock_admin.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value = result

        with patch("app.api.v1.endpoints.classroom.get_supabase_admin", return_value=mock_admin):
            resp = await client.get("/api/v1/classroom/")

        assert resp.status_code == 200
        assert resp.json() == []


# ── GET /api/v1/classroom/{id} ────────────────────────────────────────────────

class TestGetClassroomDetail:

    def _make_detail_mock(self, classroom_data=MOCK_CLASSROOM_ROW, students=MOCK_STUDENTS):
        mock_admin = MagicMock()

        def _table(name):
            tbl = MagicMock()
            if name == "classrooms":
                r = MagicMock()
                r.data = classroom_data
                tbl.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = r
            elif name == "students":
                r = MagicMock()
                r.data = students
                tbl.select.return_value.eq.return_value.execute.return_value = r
            return tbl

        mock_admin.table.side_effect = _table
        return mock_admin

    async def test_get_classroom_detail_with_students(self, client: AsyncClient):
        """Returns classroom + full student roster."""
        mock_admin = self._make_detail_mock()

        with patch("app.api.v1.endpoints.classroom.get_supabase_admin", return_value=mock_admin):
            resp = await client.get(f"/api/v1/classroom/{CLASSROOM_ID}")

        assert resp.status_code == 200
        body = resp.json()
        assert body["class_code"] == "ABC123"
        assert len(body["students"]) == 2
        assert body["students"][0]["student_name"] == "Ali"

    async def test_get_classroom_wrong_teacher_returns_403(self, client: AsyncClient):
        """Classroom owned by different teacher → 403."""
        other_teacher_row = {**MOCK_CLASSROOM_ROW, "teacher_id": "different-teacher-uuid"}
        mock_admin = self._make_detail_mock(classroom_data=other_teacher_row)

        with patch("app.api.v1.endpoints.classroom.get_supabase_admin", return_value=mock_admin):
            resp = await client.get(f"/api/v1/classroom/{CLASSROOM_ID}")

        assert resp.status_code == 403


# ── POST /api/v1/classroom/{id}/students/bulk ────────────────────────────────

class TestBulkAddStudents:

    def _make_bulk_mock(self):
        mock_admin = MagicMock()

        def _table(name):
            tbl = MagicMock()
            if name == "classrooms":
                r = MagicMock()
                r.data = {"teacher_id": TEACHER_ID}
                tbl.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = r
            elif name == "students":
                r = MagicMock()
                r.data = []
                tbl.insert.return_value.execute.return_value = r
            return tbl

        mock_admin.table.side_effect = _table
        return mock_admin

    async def test_bulk_add_students_success(self, client: AsyncClient):
        """3 names → {"added": 3}."""
        mock_admin = self._make_bulk_mock()

        with patch("app.api.v1.endpoints.classroom.get_supabase_admin", return_value=mock_admin):
            resp = await client.post(
                f"/api/v1/classroom/{CLASSROOM_ID}/students/bulk",
                json={"names": ["Ali", "Sara", "Umar"]},
            )

        assert resp.status_code == 200
        assert resp.json()["added"] == 3

    async def test_bulk_add_filters_empty_names(self, client: AsyncClient):
        """Empty strings and whitespace-only entries are stripped before counting."""
        mock_admin = self._make_bulk_mock()

        with patch("app.api.v1.endpoints.classroom.get_supabase_admin", return_value=mock_admin):
            resp = await client.post(
                f"/api/v1/classroom/{CLASSROOM_ID}/students/bulk",
                json={"names": ["Ali", "", "  ", "Sara"]},
            )

        assert resp.status_code == 200
        assert resp.json()["added"] == 2  # only "Ali" and "Sara" are valid
```

- [ ] **Step 2: Run tests — expect failures (classroom.py is still a stub)**

```bash
cd backend
python -m pytest tests/test_classroom.py -v
```

Expected: all tests **FAIL** — `NotImplementedError` raised by the stub endpoints.

---

## Task 5: Implement Classroom Endpoints

**Files:**
- Modify: `backend/app/api/v1/endpoints/classroom.py`

- [ ] **Step 1: Replace the stub with the full implementation**

```python
# backend/app/api/v1/endpoints/classroom.py
"""
Feature 2: Classroom Manager (The "Registry")

Endpoints (all require a valid teacher Supabase session):
  POST   /api/v1/classroom/                           — create classroom
  GET    /api/v1/classroom/                           — list teacher's classrooms
  GET    /api/v1/classroom/{id}                       — get classroom + roster
  POST   /api/v1/classroom/{id}/students/bulk         — bulk-add student ghost profiles
  DELETE /api/v1/classroom/{id}/students/{student_id} — remove a student
"""
import random
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import get_current_teacher
from app.core.supabase_client import get_supabase_admin
from app.schemas.classroom import (
    ClassroomCreate,
    ClassroomDetail,
    ClassroomResponse,
    StudentBulkCreate,
    StudentResponse,
)

router = APIRouter()

# Local avatar assets served from Next.js /public/avatars/
DEFAULT_AVATARS = [
    "/avatars/tiger.png",
    "/avatars/owl.png",
    "/avatars/panda.png",
    "/avatars/fox.png",
    "/avatars/monkey.png",
    "/avatars/rabbit.png",
]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _verify_classroom_ownership(supabase, classroom_id: str, teacher_id: str) -> dict:
    """Fetch the classroom and verify teacher_id matches. Returns the classroom row."""
    res = (
        supabase.table("classrooms")
        .select("teacher_id")
        .eq("id", classroom_id)
        .maybe_single()
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")
    if res.data["teacher_id"] != teacher_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your classroom")
    return res.data


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/", response_model=ClassroomResponse, status_code=201)
async def create_classroom(
    request: ClassroomCreate,
    teacher: dict = Depends(get_current_teacher),
):
    """Creates a new classroom. The PostgreSQL trigger auto-generates class_code."""
    supabase = get_supabase_admin()
    result = (
        supabase.table("classrooms")
        .insert({
            "teacher_id": teacher["id"],
            "class_name": request.class_name,
            "grade_level": request.grade_level,
        })
        .execute()
    )
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create classroom",
        )
    return result.data[0]


@router.get("/", response_model=List[ClassroomResponse])
async def list_classrooms(teacher: dict = Depends(get_current_teacher)):
    """Returns all classrooms owned by the authenticated teacher, newest first."""
    supabase = get_supabase_admin()
    result = (
        supabase.table("classrooms")
        .select("*")
        .eq("teacher_id", teacher["id"])
        .order("created_at", desc=True)
        .execute()
    )
    return result.data or []


@router.get("/{classroom_id}", response_model=ClassroomDetail)
async def get_classroom(
    classroom_id: str,
    teacher: dict = Depends(get_current_teacher),
):
    """Returns classroom details plus the full student roster."""
    supabase = get_supabase_admin()

    classroom_res = (
        supabase.table("classrooms")
        .select("*")
        .eq("id", classroom_id)
        .maybe_single()
        .execute()
    )
    if not classroom_res.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")
    if classroom_res.data["teacher_id"] != teacher["id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your classroom")

    students_res = (
        supabase.table("students")
        .select("id, student_name, avatar_url")
        .eq("classroom_id", classroom_id)
        .execute()
    )
    return {**classroom_res.data, "students": students_res.data or []}


@router.post("/{classroom_id}/students/bulk")
async def bulk_add_students(
    classroom_id: str,
    request: StudentBulkCreate,
    teacher: dict = Depends(get_current_teacher),
):
    """Bulk-creates student ghost profiles with randomly assigned avatars."""
    supabase = get_supabase_admin()
    _verify_classroom_ownership(supabase, classroom_id, teacher["id"])

    names = [n.strip() for n in request.names if n.strip()]
    if not names:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No valid student names provided",
        )

    rows = [
        {
            "classroom_id": classroom_id,
            "student_name": name,
            "avatar_url": random.choice(DEFAULT_AVATARS),
        }
        for name in names
    ]
    supabase.table("students").insert(rows).execute()
    return {"added": len(rows)}


@router.delete("/{classroom_id}/students/{student_id}", status_code=204)
async def remove_student(
    classroom_id: str,
    student_id: str,
    teacher: dict = Depends(get_current_teacher),
):
    """Removes a student ghost profile from the roster."""
    supabase = get_supabase_admin()
    _verify_classroom_ownership(supabase, classroom_id, teacher["id"])

    supabase.table("students").delete().eq("id", student_id).eq("classroom_id", classroom_id).execute()
```

- [ ] **Step 2: Run tests — expect all to pass**

```bash
cd backend
python -m pytest tests/test_classroom.py -v
```

Expected output:
```
tests/test_classroom.py::TestCreateClassroom::test_create_classroom_returns_201 PASSED
tests/test_classroom.py::TestCreateClassroom::test_create_classroom_requires_auth PASSED
tests/test_classroom.py::TestListClassrooms::test_list_classrooms_returns_owned PASSED
tests/test_classroom.py::TestListClassrooms::test_list_classrooms_empty PASSED
tests/test_classroom.py::TestGetClassroomDetail::test_get_classroom_detail_with_students PASSED
tests/test_classroom.py::TestGetClassroomDetail::test_get_classroom_wrong_teacher_returns_403 PASSED
tests/test_classroom.py::TestBulkAddStudents::test_bulk_add_students_success PASSED
tests/test_classroom.py::TestBulkAddStudents::test_bulk_add_filters_empty_names PASSED
8 passed
```

- [ ] **Step 3: Run full test suite to confirm Feature 1 tests still pass**

```bash
python -m pytest tests/ -v
```

Expected: all 22 tests (14 old + 8 new) pass.

- [ ] **Step 4: Commit**

```bash
git add backend/app/api/v1/endpoints/classroom.py backend/tests/test_classroom.py
git commit -m "feat(api): implement classroom CRUD endpoints with tests"
```

---

## Task 6: Frontend — Auth Helper + Type Updates

**Files:**
- Create: `frontend/lib/teacherAuth.ts`
- Modify: `frontend/types/index.ts`

- [ ] **Step 1: Create `frontend/lib/teacherAuth.ts`**

```typescript
// frontend/lib/teacherAuth.ts
import { supabase } from "@/lib/supabase/client";

/**
 * Returns an Authorization header object containing the teacher's Supabase
 * session token. Throws if the session has expired or doesn't exist.
 */
export async function getTeacherHeaders(): Promise<HeadersInit> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated — please sign in again.");
  return { Authorization: `Bearer ${session.access_token}` };
}
```

- [ ] **Step 2: Update `frontend/types/index.ts`**

Replace the `Classroom` and `Student` interfaces to match the DB columns and new schemas. Keep all other interfaces unchanged:

```typescript
// frontend/types/index.ts
// Shared TypeScript types matching backend Pydantic schemas

export type UserRole = "teacher" | "student";

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

// Updated: class_name (was "name"), grade_level is number (was string | null)
export interface Classroom {
  id: string;
  class_name: string;
  class_code: string;
  grade_level: number;
  created_at: string;
}

// Updated: student_name + avatar_url matching DB columns
export interface Student {
  id: string;
  student_name: string;
  avatar_url: string;
}

export type Pillar = "reading" | "writing" | "listening" | "speaking";

export interface Quest {
  id: string;
  week: number;
  grade: number;
  reading: QuestTask;
  writing: QuestTask;
  listening: QuestTask;
  speaking: QuestTask;
}

export interface QuestTask {
  pillar: Pillar;
  prompt: string;
  audio_url?: string;
}

export interface PillarScore {
  pillar: Pillar;
  score: number;
  feedback: string;
}

export interface StudentReport {
  student_id: string;
  scores: PillarScore[];
}

export interface ClassroomReport {
  classroom_id: string;
  pillar_averages: Record<Pillar, number>;
  incomplete_students: string[];
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/teacherAuth.ts frontend/types/index.ts
git commit -m "feat(frontend): add teacher auth helper and fix Classroom/Student types"
```

---

## Task 7: CreateClassroomModal Component

**Files:**
- Create: `frontend/components/teacher/CreateClassroomModal.tsx`

- [ ] **Step 1: Create the directory and file**

```bash
mkdir -p frontend/components/teacher
```

- [ ] **Step 2: Write the component**

```tsx
// frontend/components/teacher/CreateClassroomModal.tsx
"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { getTeacherHeaders } from "@/lib/teacherAuth";
import type { Classroom } from "@/types";

interface Props {
  onClose: () => void;
  onCreated: (classroom: Classroom) => void;
}

export default function CreateClassroomModal({ onClose, onCreated }: Props) {
  const [className, setClassName] = useState("");
  const [gradeLevel, setGradeLevel] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const headers = await getTeacherHeaders();
      const classroom = await apiFetch<Classroom>("/classroom/", {
        method: "POST",
        headers,
        body: JSON.stringify({ class_name: className, grade_level: gradeLevel }),
      });
      onCreated(classroom);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">New Classroom</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Class Name
            </label>
            <input
              type="text"
              required
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              placeholder="e.g. Grade 3 — Blue Section"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Grade Level
            </label>
            <select
              value={gradeLevel}
              onChange={(e) => setGradeLevel(Number(e.target.value))}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              {[1, 2, 3, 4, 5].map((g) => (
                <option key={g} value={g}>
                  Grade {g}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/components/teacher/CreateClassroomModal.tsx
git commit -m "feat(ui): add CreateClassroomModal component"
```

---

## Task 8: BulkAddStudentsModal Component

**Files:**
- Create: `frontend/components/teacher/BulkAddStudentsModal.tsx`

- [ ] **Step 1: Write the component**

```tsx
// frontend/components/teacher/BulkAddStudentsModal.tsx
"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { getTeacherHeaders } from "@/lib/teacherAuth";

interface Props {
  classroomId: string;
  onClose: () => void;
  onAdded: () => void; // parent re-fetches roster on success
}

export default function BulkAddStudentsModal({
  classroomId,
  onClose,
  onAdded,
}: Props) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  /** Split on newlines and commas, trim whitespace, remove empties. */
  function parseNames(raw: string): string[] {
    return raw
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const names = parseNames(text);
    if (names.length === 0) {
      setError("Please enter at least one student name.");
      return;
    }

    setLoading(true);
    try {
      const headers = await getTeacherHeaders();
      const res = await apiFetch<{ added: number }>(
        `/classroom/${classroomId}/students/bulk`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ names }),
        }
      );
      setSuccessMsg(
        `${res.added} student${res.added !== 1 ? "s" : ""} added successfully.`
      );
      setText("");
      onAdded();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">Add Students</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Student Names{" "}
              <span className="font-normal text-gray-400">
                (comma or line separated)
              </span>
            </label>
            <textarea
              rows={6}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={"Ali Hassan\nSara Khan\nUmar, Bilal, Fatima"}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
              {error}
            </p>
          )}
          {successMsg && (
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
              {successMsg}
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Done
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              Add Students
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/teacher/BulkAddStudentsModal.tsx
git commit -m "feat(ui): add BulkAddStudentsModal component"
```

---

## Task 9: Classroom List Page

**Files:**
- Modify: `frontend/app/(teacher)/classroom/page.tsx`

- [ ] **Step 1: Replace the stub**

```tsx
// frontend/app/(teacher)/classroom/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Copy, Check, BookOpen } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { getTeacherHeaders } from "@/lib/teacherAuth";
import CreateClassroomModal from "@/components/teacher/CreateClassroomModal";
import type { Classroom } from "@/types";

export default function ClassroomPage() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  async function fetchClassrooms() {
    try {
      const headers = await getTeacherHeaders();
      const data = await apiFetch<Classroom[]>("/classroom/", { headers });
      setClassrooms(data);
    } catch {
      // Session expired or unauthenticated — show empty state
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchClassrooms();
  }, []);

  async function copyCode(e: React.MouseEvent, code: string) {
    e.preventDefault(); // don't navigate to classroom detail
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">

        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Classroom Manager</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Manage your classes and student rosters
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
          >
            <Plus size={16} />
            New Classroom
          </button>
        </div>

        {/* Loading skeletons */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-gray-200 p-5 h-36 animate-pulse"
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && classrooms.length === 0 && (
          <div className="text-center py-24 text-gray-400">
            <BookOpen size={40} className="mx-auto mb-3 opacity-40" />
            <p className="font-medium text-gray-500">No classrooms yet</p>
            <p className="text-sm mt-1">
              Create your first classroom to get started.
            </p>
          </div>
        )}

        {/* Classroom card grid */}
        {!loading && classrooms.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {classrooms.map((c) => (
              <Link
                key={c.id}
                href={`/classroom/${c.id}`}
                className="block bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md hover:border-indigo-200 transition-all"
              >
                <div className="mb-3">
                  <span className="text-xs font-medium bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                    Grade {c.grade_level}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-4 leading-tight">
                  {c.class_name}
                </h3>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg flex-1 text-center">
                    {c.class_code}
                  </span>
                  <button
                    onClick={(e) => copyCode(e, c.class_code)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                    title="Copy class code"
                  >
                    {copiedCode === c.class_code ? (
                      <Check size={16} className="text-green-500" />
                    ) : (
                      <Copy size={16} />
                    )}
                  </button>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateClassroomModal
          onClose={() => setShowCreate(false)}
          onCreated={(newClassroom) => {
            setClassrooms((prev) => [newClassroom, ...prev]);
            setShowCreate(false);
          }}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "frontend/app/(teacher)/classroom/page.tsx"
git commit -m "feat(ui): implement classroom list page with card grid and create modal"
```

---

## Task 10: Classroom Detail Page

**Files:**
- Create: `frontend/app/(teacher)/classroom/[id]/page.tsx`

- [ ] **Step 1: Create the page file**

```tsx
// frontend/app/(teacher)/classroom/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Copy, Check, UserPlus, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { getTeacherHeaders } from "@/lib/teacherAuth";
import BulkAddStudentsModal from "@/components/teacher/BulkAddStudentsModal";
import type { Student } from "@/types";

interface ClassroomDetail {
  id: string;
  class_name: string;
  class_code: string;
  grade_level: number;
  students: Student[];
}

type Tab = "roster" | "missions" | "analytics";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export default function ClassroomDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [classroom, setClassroom] = useState<ClassroomDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("roster");
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  async function fetchClassroom() {
    try {
      const headers = await getTeacherHeaders();
      const data = await apiFetch<ClassroomDetail>(
        `/classroom/${params.id}`,
        { headers }
      );
      setClassroom(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchClassroom();
  }, [params.id]);

  async function copyCode() {
    if (!classroom) return;
    await navigator.clipboard.writeText(classroom.class_code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  }

  async function removeStudent(studentId: string) {
    if (!confirm("Remove this student from the roster?")) return;
    setRemoveError(null);
    try {
      const headers = await getTeacherHeaders();
      // DELETE returns 204 No Content — use fetch directly to avoid apiFetch's res.json()
      const res = await fetch(
        `${BASE_URL}/classroom/${params.id}/students/${studentId}`,
        { method: "DELETE", headers: headers as HeadersInit }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail ?? `Error ${res.status}`);
      }
      // Optimistic update: remove from local state without re-fetch
      setClassroom((prev) =>
        prev
          ? { ...prev, students: prev.students.filter((s) => s.id !== studentId) }
          : prev
      );
    } catch (err: unknown) {
      setRemoveError(
        err instanceof Error ? err.message : "Failed to remove student."
      );
    }
  }

  // ── Loading / error states ──────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400 text-sm">
        Loading…
      </div>
    );
  }

  if (!classroom) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-red-500 text-sm">
        Classroom not found.
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">

        {/* Back link */}
        <Link
          href="/classroom"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-5"
        >
          <ArrowLeft size={15} /> All Classrooms
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {classroom.class_name}
            </h1>
            <span className="mt-1 inline-block text-xs font-medium bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
              Grade {classroom.grade_level}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold tracking-widest text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl">
              {classroom.class_code}
            </span>
            <button
              onClick={copyCode}
              className="p-2 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
              title="Copy class code"
            >
              {codeCopied ? (
                <Check size={18} className="text-green-500" />
              ) : (
                <Copy size={18} />
              )}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
          {(["roster", "missions", "analytics"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ── Roster Tab ── */}
        {activeTab === "roster" && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <p className="text-sm font-medium text-gray-700">
                {classroom.students.length} student
                {classroom.students.length !== 1 ? "s" : ""}
              </p>
              <button
                onClick={() => setShowBulkAdd(true)}
                className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                <UserPlus size={16} /> Add Students
              </button>
            </div>

            {/* Remove error banner */}
            {removeError && (
              <p className="text-sm text-red-600 bg-red-50 px-5 py-2 border-b border-red-100">
                {removeError}
              </p>
            )}

            {/* Empty state */}
            {classroom.students.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-12">
                No students yet. Click &quot;Add Students&quot; to build your
                roster.
              </p>
            )}

            {/* Student rows */}
            {classroom.students.length > 0 && (
              <ul className="divide-y divide-gray-50">
                {classroom.students.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center gap-3 px-5 py-3"
                  >
                    <Image
                      src={s.avatar_url}
                      alt={s.student_name}
                      width={32}
                      height={32}
                      className="rounded-full bg-gray-100 shrink-0"
                    />
                    <span className="flex-1 text-sm font-medium text-gray-800">
                      {s.student_name}
                    </span>
                    <button
                      onClick={() => removeStudent(s.id)}
                      className="p-1.5 rounded text-gray-300 hover:text-red-500 transition-colors"
                      title={`Remove ${s.student_name}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* ── Coming Soon Tabs ── */}
        {activeTab !== "roster" && (
          <div className="bg-white rounded-2xl border border-gray-200 flex flex-col items-center justify-center py-20 text-gray-400">
            <p className="font-medium capitalize text-gray-500">{activeTab}</p>
            <p className="text-sm mt-1">Coming soon in a future feature.</p>
          </div>
        )}
      </div>

      {/* Bulk Add Modal */}
      {showBulkAdd && (
        <BulkAddStudentsModal
          classroomId={params.id}
          onClose={() => setShowBulkAdd(false)}
          onAdded={fetchClassroom}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "frontend/app/(teacher)/classroom/[id]/page.tsx"
git commit -m "feat(ui): add classroom detail page with roster table and bulk-add modal"
```

---

## Task 11: Final Verification

- [ ] **Step 1: Run full backend test suite**

```bash
cd backend
python -m pytest tests/ -v
```

Expected: **22 tests pass** (14 from test_auth.py + 8 from test_classroom.py), 0 failures.

- [ ] **Step 2: Start the backend and check API docs**

```bash
cd backend
uvicorn app.main:app --reload
```

Open http://localhost:8000/docs — confirm these routes appear under the `classroom` tag:
- `POST /api/v1/classroom/`
- `GET /api/v1/classroom/`
- `GET /api/v1/classroom/{classroom_id}`
- `POST /api/v1/classroom/{classroom_id}/students/bulk`
- `DELETE /api/v1/classroom/{classroom_id}/students/{student_id}`

- [ ] **Step 3: Start the frontend**

```bash
cd frontend
npm run dev
```

Open http://localhost:3000/classroom — classroom list page should render (empty state if no classrooms in DB yet).

- [ ] **Step 4: Update AI_CONTEXT.md to mark Feature 2 complete**

In `AI_CONTEXT.md`, update the Feature Completion Status table row for Feature 2:

Change:
```
| 2 | Classroom Manager (Registry) | 🔲 Stub only | Endpoint + page scaffolded |
```
To:
```
| 2 | Classroom Manager (Registry) | ✅ **Complete & Tested** | See sections below |
```

Also add a new section **8. Feature 2 — Detailed Summary (Complete)** (after the Feature 1 section) describing what was built, following the same format as the Feature 1 section.

- [ ] **Step 5: Final commit**

```bash
git add AI_CONTEXT.md
git commit -m "docs: mark Feature 2 Classroom Manager as complete in AI_CONTEXT.md"
```
