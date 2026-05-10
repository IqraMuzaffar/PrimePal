# Secret PIN Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 4-digit Secret PIN to the student login flow so students cannot access each other's accounts; teachers can view and reset any student's PIN from the classroom roster.

**Architecture:** A `secret_pin VARCHAR(4)` column is added to the `students` table (default `'1234'`). The existing `POST /auth/student/login` endpoint is extended to require and verify the PIN. A new teacher-only `PATCH /auth/student/{student_id}/pin` endpoint handles resets. On the student side, avatar tap transitions to a kid-friendly numeric keypad before the API call is made. The teacher roster gains a lock-icon button per student that opens a PIN management modal.

**Tech Stack:** PostgreSQL / Supabase, FastAPI + Pydantic v2, Next.js 14 App Router, Tailwind CSS

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `supabase/migrations/011_secret_pin.sql` | Create | Add `secret_pin` column with default `'1234'` |
| `backend/app/api/v1/endpoints/auth.py` | Modify | Extend login to verify PIN; add teacher PIN reset endpoint |
| `backend/app/schemas/classroom.py` | Modify | Add `secret_pin: str` to `StudentResponse` |
| `backend/app/api/v1/endpoints/classroom.py` | Modify | Select `secret_pin` in `get_classroom` query |
| `frontend/types/index.ts` | Modify | Add `secret_pin: string` to `Student` interface |
| `frontend/app/(student)/play/avatar-select.tsx` | Modify | Remove direct login call; emit `onAvatarSelect(avatar)` |
| `frontend/app/(student)/play/pin-entry.tsx` | Create | Numeric keypad PIN component with shake-on-failure |
| `frontend/app/(student)/play/page.tsx` | Modify | Add `"enter-pin"` step; wire `selectedAvatar` + `PinEntry` |
| `frontend/app/(teacher)/classroom/[id]/page.tsx` | Modify | Add PIN view/reset modal in roster tab |

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/011_secret_pin.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/011_secret_pin.sql
-- Add secret_pin to students table for child-safe login authentication
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS secret_pin VARCHAR(4) NOT NULL DEFAULT '1234';
```

- [ ] **Step 2: Apply the migration**

Open the Supabase project dashboard → SQL Editor → paste the file contents → Run.

Expected: "Success. No rows returned."

- [ ] **Step 3: Verify**

In the Supabase Table Editor, open the `students` table. Confirm `secret_pin` column exists with value `1234` on all existing rows.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/011_secret_pin.sql
git commit -m "feat: add secret_pin column to students table (default 1234)"
```

---

## Task 2: Backend — Student Login PIN Verification

**Files:**
- Modify: `backend/app/api/v1/endpoints/auth.py`

- [ ] **Step 1: Write the failing test**

Open `backend/tests/test_ingestion.py` to understand the test pattern, then add to `backend/tests/test_ingestion.py` (or a dedicated `test_auth.py` if it exists):

```python
# In backend/tests/test_ingestion.py (or create backend/tests/test_auth_pin.py)
def test_student_login_wrong_pin_returns_401(client, seed_classroom):
    """Login with a valid student_id + class_code but wrong PIN returns 401."""
    response = client.post(
        "/api/v1/auth/student/login",
        json={
            "student_id": seed_classroom["student_id"],
            "class_code": seed_classroom["class_code"],
            "secret_pin": "9999",
        },
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect PIN"


def test_student_login_correct_pin_returns_token(client, seed_classroom):
    """Login with correct PIN returns access_token."""
    response = client.post(
        "/api/v1/auth/student/login",
        json={
            "student_id": seed_classroom["student_id"],
            "class_code": seed_classroom["class_code"],
            "secret_pin": "1234",
        },
    )
    assert response.status_code == 200
    assert "access_token" in response.json()


def test_student_login_missing_pin_returns_422(client, seed_classroom):
    """Login without secret_pin returns 422 validation error."""
    response = client.post(
        "/api/v1/auth/student/login",
        json={
            "student_id": seed_classroom["student_id"],
            "class_code": seed_classroom["class_code"],
        },
    )
    assert response.status_code == 422
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd backend
pytest tests/ -k "pin" -v
```

Expected: 3 FAILs — `student_login` doesn't accept `secret_pin` yet.

- [ ] **Step 3: Update `StudentLoginRequest` and `student_login` in `auth.py`**

Replace the existing `StudentLoginRequest` class and `student_login` function:

```python
# Add this import at the top of auth.py (alongside existing imports):
from app.core.security import create_student_token, get_current_student, get_current_teacher

# Replace StudentLoginRequest:
class StudentLoginRequest(BaseModel):
    student_id: str
    class_code: str
    secret_pin: str

    @field_validator("secret_pin")
    @classmethod
    def validate_pin(cls, v: str) -> str:
        if not re.fullmatch(r"\d{4}", v):
            raise ValueError("secret_pin must be exactly 4 digits")
        return v


# Replace the student_login endpoint body:
@router.post(
    "/student/login",
    response_model=TokenResponse,
    summary="Validate student avatar selection and issue JWT",
)
async def student_login(request: StudentLoginRequest) -> TokenResponse:
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
        .select("id, secret_pin")
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

    if student_res.data["secret_pin"] != request.secret_pin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect PIN",
        )

    token = create_student_token(
        student_id=request.student_id,
        classroom_id=classroom_id,
    )
    return TokenResponse(access_token=token)
```

- [ ] **Step 4: Run tests — expect pass**

```bash
cd backend
pytest tests/ -k "pin" -v
```

Expected: 3 PASSes.

- [ ] **Step 5: Commit**

```bash
git add backend/app/api/v1/endpoints/auth.py
git commit -m "feat: require and verify secret_pin in student login endpoint"
```

---

## Task 3: Backend — Teacher PIN Reset Endpoint

**Files:**
- Modify: `backend/app/api/v1/endpoints/auth.py`

- [ ] **Step 1: Write the failing test**

```python
def test_teacher_can_reset_student_pin(client, seed_classroom, teacher_auth_headers):
    """Authenticated teacher can reset a student's PIN."""
    response = client.patch(
        f"/api/v1/auth/student/{seed_classroom['student_id']}/pin",
        json={"secret_pin": "5678"},
        headers=teacher_auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["student_id"] == seed_classroom["student_id"]
    assert data["secret_pin"] == "5678"


def test_pin_reset_invalid_format_returns_422(client, seed_classroom, teacher_auth_headers):
    """PIN reset with non-4-digit value is rejected."""
    response = client.patch(
        f"/api/v1/auth/student/{seed_classroom['student_id']}/pin",
        json={"secret_pin": "12"},
        headers=teacher_auth_headers,
    )
    assert response.status_code == 422
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd backend
pytest tests/ -k "reset" -v
```

Expected: 2 FAILs — endpoint doesn't exist yet.

- [ ] **Step 3: Add schemas and endpoint to `auth.py`**

Add after the existing schema classes:

```python
class ResetPinRequest(BaseModel):
    secret_pin: str

    @field_validator("secret_pin")
    @classmethod
    def validate_pin(cls, v: str) -> str:
        if not re.fullmatch(r"\d{4}", v):
            raise ValueError("secret_pin must be exactly 4 digits")
        return v


class ResetPinResponse(BaseModel):
    student_id: str
    secret_pin: str
```

Add after the `update_student_profile` endpoint:

```python
@router.patch(
    "/student/{student_id}/pin",
    response_model=ResetPinResponse,
    summary="Reset a student's secret PIN (teacher only)",
)
async def reset_student_pin(
    student_id: str,
    body: ResetPinRequest,
    teacher: dict = Depends(get_current_teacher),
) -> ResetPinResponse:
    """
    Allows an authenticated teacher to reset any student's PIN,
    provided the student belongs to one of that teacher's classrooms.
    """
    supabase = get_supabase_admin()

    student_res = (
        supabase.table("students")
        .select("id, classroom_id")
        .eq("id", student_id)
        .maybe_single()
        .execute()
    )
    if not student_res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found",
        )

    classroom_res = (
        supabase.table("classrooms")
        .select("teacher_id")
        .eq("id", student_res.data["classroom_id"])
        .maybe_single()
        .execute()
    )
    if not classroom_res.data or classroom_res.data["teacher_id"] != teacher["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not your student",
        )

    supabase.table("students").update({"secret_pin": body.secret_pin}).eq("id", student_id).execute()
    return ResetPinResponse(student_id=student_id, secret_pin=body.secret_pin)
```

- [ ] **Step 4: Run tests — expect pass**

```bash
cd backend
pytest tests/ -k "reset" -v
```

Expected: 2 PASSes.

- [ ] **Step 5: Commit**

```bash
git add backend/app/api/v1/endpoints/auth.py
git commit -m "feat: add teacher-only PATCH /auth/student/{id}/pin endpoint"
```

---

## Task 4: Backend — Expose `secret_pin` in Teacher Classroom Roster

**Files:**
- Modify: `backend/app/schemas/classroom.py`
- Modify: `backend/app/api/v1/endpoints/classroom.py`

*The teacher-facing `GET /classroom/{id}` response needs to include `secret_pin` so the teacher roster can display and manage it. The public avatar roster (`GET /auth/classroom/{code}/avatars`) is intentionally unchanged — PIN is never exposed to unauthenticated callers.*

- [ ] **Step 1: Update `StudentResponse` schema**

In `backend/app/schemas/classroom.py`, replace `StudentResponse`:

```python
class StudentResponse(BaseModel):
    id: str
    student_name: str
    avatar_url: str
    secret_pin: str
```

- [ ] **Step 2: Update the DB query in `get_classroom`**

In `backend/app/api/v1/endpoints/classroom.py`, find the `get_classroom` function's students query (around line 107) and change the `select` string:

```python
    students_res = (
        supabase.table("students")
        .select("id, student_name, avatar_url, secret_pin")
        .eq("classroom_id", classroom_id)
        .execute()
    )
```

- [ ] **Step 3: Run the full backend test suite**

```bash
cd backend
pytest tests/ -v
```

Expected: all existing tests still pass (the schema change adds an optional field so existing fixtures that include `secret_pin` will now pass through).

- [ ] **Step 4: Commit**

```bash
git add backend/app/schemas/classroom.py backend/app/api/v1/endpoints/classroom.py
git commit -m "feat: include secret_pin in teacher classroom roster response"
```

---

## Task 5: Frontend — Types Update

**Files:**
- Modify: `frontend/types/index.ts`

- [ ] **Step 1: Add `secret_pin` to the `Student` interface**

In `frontend/types/index.ts`, replace the `Student` interface:

```typescript
export interface Student {
  id: string;
  student_name: string;
  avatar_url: string;
  secret_pin: string;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend
npx tsc --noEmit
```

Expected: no errors (the classroom page currently doesn't reference `secret_pin` yet, so no breakage).

- [ ] **Step 3: Commit**

```bash
git add frontend/types/index.ts
git commit -m "feat: add secret_pin to Student type"
```

---

## Task 6: Student Frontend — Refactor `avatar-select.tsx`

**Files:**
- Modify: `frontend/app/(student)/play/avatar-select.tsx`

Currently, tapping an avatar immediately calls `POST /auth/student/login`. We need to stop that and instead signal to the parent that an avatar was selected. The parent (`page.tsx`) will then show the PIN screen.

- [ ] **Step 1: Replace `AvatarSelect` with the refactored version**

Replace the entire contents of `frontend/app/(student)/play/avatar-select.tsx`:

```tsx
"use client";

import Image from "next/image";

interface Avatar {
  id: string;
  student_name: string;
  avatar_url: string;
  avatar_style: string;
  theme_color: string;
}

interface Props {
  avatars: Avatar[];
  onBack: () => void;
  onAvatarSelect: (avatar: Avatar) => void;
}

export default function AvatarSelect({ avatars, onBack, onAvatarSelect }: Props) {
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
        {avatars.map((avatar) => (
          <button
            key={avatar.id}
            onClick={() => onAvatarSelect(avatar)}
            className="relative flex flex-col items-center pt-4 pb-4 px-3
                       bg-white rounded-2xl ring-1 ring-slate-200 shadow-md
                       hover:shadow-xl hover:scale-[1.04] active:scale-95
                       transition-all duration-150 focus:outline-none
                       focus-visible:ring-2 focus-visible:ring-indigo-500
                       overflow-hidden"
            aria-label={`Select ${avatar.student_name}`}
          >
            {/* Theme color top strip */}
            <div
              className="absolute top-0 left-0 right-0 h-1.5"
              style={{ backgroundColor: avatar.theme_color }}
            />

            <div
              className="w-20 h-20 rounded-full ring-4 ring-offset-2 overflow-hidden bg-slate-50"
              style={{ "--tw-ring-color": avatar.theme_color } as React.CSSProperties}
            >
              <Image
                src={avatar.avatar_url}
                alt={avatar.student_name}
                width={80}
                height={80}
                className="w-full h-full object-cover"
              />
            </div>

            <span className="mt-3 text-sm font-bold text-slate-700 text-center leading-tight">
              {avatar.student_name}
            </span>
          </button>
        ))}
      </div>

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

- [ ] **Step 2: Commit (TypeScript will error until page.tsx is updated — that's fine)**

```bash
git add frontend/app/(student)/play/avatar-select.tsx
git commit -m "refactor: avatar-select emits onAvatarSelect instead of calling login"
```

---

## Task 7: Student Frontend — `PinEntry` Component

**Files:**
- Create: `frontend/app/(student)/play/pin-entry.tsx`

- [ ] **Step 1: Create the file**

```tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2, Delete } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface Avatar {
  id: string;
  student_name: string;
  avatar_url: string;
  theme_color: string;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
}

interface Props {
  avatar: Avatar;
  classCode: string;
  onBack: () => void;
}

export default function PinEntry({ avatar, classCode, onBack }: Props) {
  const router = useRouter();
  const [digits, setDigits] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  // Auto-submit when 4 digits entered
  useEffect(() => {
    if (digits.length === 4 && !loading) {
      submitPin(digits.join(""));
    }
  }, [digits]);

  async function submitPin(pin: string) {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<TokenResponse>("/auth/student/login", {
        method: "POST",
        body: JSON.stringify({
          student_id: avatar.id,
          class_code: classCode,
          secret_pin: pin,
        }),
      });
      localStorage.setItem("primepal_student_token", data.access_token);
      localStorage.setItem("primepal_student_name", avatar.student_name);
      localStorage.setItem("primepal_student_avatar", avatar.avatar_url);
      router.push("/home");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      const isWrongPin = msg === "Incorrect PIN";
      setError(isWrongPin ? "Oops! Wrong PIN. Try again 🔐" : msg);
      setShake(true);
      setDigits([]);
      setTimeout(() => setShake(false), 500);
    } finally {
      setLoading(false);
    }
  }

  function pressDigit(d: string) {
    if (digits.length < 4 && !loading) {
      setDigits((prev) => [...prev, d]);
      setError(null);
    }
  }

  function backspace() {
    if (!loading) {
      setDigits((prev) => prev.slice(0, -1));
      setError(null);
    }
  }

  const keypadKeys = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    ["back", "0", "⌫"],
  ];

  return (
    <div className="w-full flex flex-col items-center gap-6">
      {/* Avatar + name */}
      <div className="flex flex-col items-center gap-2">
        <div
          className="w-20 h-20 rounded-full ring-4 ring-offset-2 overflow-hidden bg-slate-50"
          style={{ "--tw-ring-color": avatar.theme_color } as React.CSSProperties}
        >
          <Image
            src={avatar.avatar_url}
            alt={avatar.student_name}
            width={80}
            height={80}
            className="w-full h-full object-cover"
          />
        </div>
        <p className="text-base font-bold text-slate-800">{avatar.student_name}</p>
        <p className="text-sm text-slate-500">Enter your Secret PIN</p>
      </div>

      {/* 4 dot indicators */}
      <style>{`
        @keyframes pin-shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
        .pin-shake { animation: pin-shake 0.4s ease-in-out; }
      `}</style>

      {loading ? (
        <Loader2 size={28} className="animate-spin text-indigo-500" />
      ) : (
        <div className={`flex gap-4 ${shake ? "pin-shake" : ""}`}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-5 h-5 rounded-full border-2 transition-all duration-150 ${
                i < digits.length
                  ? "bg-indigo-600 border-indigo-600"
                  : "bg-white border-slate-300"
              }`}
            />
          ))}
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="text-center text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-2xl px-4 py-2 w-full">
          {error}
        </p>
      )}

      {/* Numeric keypad */}
      <div className="grid grid-cols-3 gap-3 w-full">
        {keypadKeys.flat().map((key) => {
          if (key === "back") {
            return (
              <button
                key="back"
                onClick={onBack}
                disabled={loading}
                className="h-14 rounded-2xl bg-slate-100 text-slate-500 font-semibold text-sm
                           shadow-[0_4px_0_#cbd5e1] hover:brightness-95
                           active:translate-y-[4px] active:shadow-none
                           disabled:opacity-50 disabled:cursor-not-allowed
                           transition-all duration-75"
                aria-label="Go back"
              >
                ←
              </button>
            );
          }
          if (key === "⌫") {
            return (
              <button
                key="backspace"
                onClick={backspace}
                disabled={loading}
                className="h-14 rounded-2xl bg-slate-100 text-slate-600 font-semibold
                           shadow-[0_4px_0_#cbd5e1] hover:brightness-95
                           active:translate-y-[4px] active:shadow-none
                           disabled:opacity-50 disabled:cursor-not-allowed
                           transition-all duration-75 flex items-center justify-center"
                aria-label="Delete digit"
              >
                <Delete size={20} />
              </button>
            );
          }
          return (
            <button
              key={key}
              onClick={() => pressDigit(key)}
              disabled={loading || digits.length >= 4}
              className="h-14 rounded-2xl bg-indigo-600 text-white font-extrabold text-xl
                         shadow-[0_4px_0_#3730a3] hover:brightness-110
                         active:translate-y-[4px] active:shadow-none
                         disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0
                         transition-all duration-75"
            >
              {key}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/app/(student)/play/pin-entry.tsx
git commit -m "feat: add PinEntry numeric keypad component with shake-on-failure"
```

---

## Task 8: Student Frontend — Wire Everything in `page.tsx`

**Files:**
- Modify: `frontend/app/(student)/play/page.tsx`

- [ ] **Step 1: Replace the file contents**

```tsx
"use client";

import { useState, FormEvent } from "react";
import { Loader2, Gamepad2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import AvatarSelect from "./avatar-select";
import PinEntry from "./pin-entry";

interface Avatar {
  id: string;
  student_name: string;
  avatar_url: string;
  avatar_style: string;
  theme_color: string;
}

type Step = "enter-code" | "pick-avatar" | "enter-pin";

export default function StudentPlayPage() {
  const [step, setStep] = useState<Step>("enter-code");
  const [classCode, setClassCode] = useState("");
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar | null>(null);
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

  function handleAvatarSelect(avatar: Avatar) {
    setSelectedAvatar(avatar);
    setStep("enter-pin");
  }

  function handleBackToCode() {
    setStep("enter-code");
    setAvatars([]);
    setSelectedAvatar(null);
    setError(null);
  }

  function handleBackToAvatars() {
    setSelectedAvatar(null);
    setStep("pick-avatar");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-violet-600 flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl ring-1 ring-white/20 p-8">

        {step === "enter-code" && (
          <div>
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
            avatars={avatars}
            onBack={handleBackToCode}
            onAvatarSelect={handleAvatarSelect}
          />
        )}

        {step === "enter-pin" && selectedAvatar && (
          <PinEntry
            avatar={selectedAvatar}
            classCode={classCode.trim().toUpperCase()}
            onBack={handleBackToAvatars}
          />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd frontend
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Manual smoke test**

1. Run `npm run dev` in `frontend/`
2. Navigate to `/play`
3. Enter a valid class code → see character grid
4. Tap a character → see PIN keypad with that student's avatar
5. Enter `1234` → redirected to `/home`
6. Tap a character → enter wrong PIN `9999` → dots shake + "Oops! Wrong PIN" message
7. Back arrow (←) on keypad → returns to character select
8. Back button on character select → returns to code entry

- [ ] **Step 4: Commit**

```bash
git add frontend/app/(student)/play/page.tsx
git commit -m "feat: add enter-pin step to student login flow"
```

---

## Task 9: Teacher Frontend — PIN Management in Roster

**Files:**
- Modify: `frontend/app/(teacher)/classroom/[id]/page.tsx`

The teacher roster tab already has add/remove student functionality. We add a lock-icon "PIN" button per student that opens a small inline modal showing the current PIN and allowing reset.

- [ ] **Step 1: Add PIN state variables and the reset function**

Near the top of the `ClassroomDetailPage` component (after `removeError` state), add:

```tsx
// PIN management state
const [pinStudent, setPinStudent] = useState<Student | null>(null);
const [pinValue, setPinValue] = useState("");
const [pinSaving, setPinSaving] = useState(false);
const [pinSaveError, setPinSaveError] = useState<string | null>(null);
const [pinSaved, setPinSaved] = useState(false);
```

Add the reset function after `removeStudent`:

```tsx
async function savePin(studentId: string, pin: string) {
  if (!/^\d{4}$/.test(pin)) {
    setPinSaveError("PIN must be exactly 4 digits.");
    return;
  }
  setPinSaving(true);
  setPinSaveError(null);
  setPinSaved(false);
  try {
    const headers = await getTeacherHeaders();
    await apiFetch(`/auth/student/${studentId}/pin`, {
      method: "PATCH",
      body: JSON.stringify({ secret_pin: pin }),
      headers,
    });
    // Update local state so PIN shows the new value without re-fetch
    setClassroom((prev) =>
      prev
        ? {
            ...prev,
            students: prev.students.map((s) =>
              s.id === studentId ? { ...s, secret_pin: pin } : s
            ),
          }
        : prev
    );
    setPinSaved(true);
    setTimeout(() => {
      setPinStudent(null);
      setPinSaved(false);
    }, 1200);
  } catch (err: unknown) {
    setPinSaveError(err instanceof Error ? err.message : "Failed to save PIN.");
  } finally {
    setPinSaving(false);
  }
}
```

- [ ] **Step 2: Add the Lock icon import**

In the imports at the top of the file, add `Lock` to the existing lucide-react import:

```tsx
import { Copy, Check, UserPlus, Trash2, Lock } from "lucide-react";
```

- [ ] **Step 3: Add PIN button to each student row**

In the student row `<li>` (inside the `{classroom.students.map(...)}` section), add a PIN button between the student name and the remove button:

```tsx
<button
  onClick={() => {
    setPinStudent(s);
    setPinValue(s.secret_pin ?? "1234");
    setPinSaveError(null);
    setPinSaved(false);
  }}
  className="p-1.5 rounded text-gray-300 hover:text-indigo-500 transition-colors"
  title={`Manage PIN for ${s.student_name}`}
>
  <Lock size={15} />
</button>
```

The full student row `<li>` then looks like:

```tsx
<li key={s.id} className="flex items-center gap-3 px-5 py-3">
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
    onClick={() => {
      setPinStudent(s);
      setPinValue(s.secret_pin ?? "1234");
      setPinSaveError(null);
      setPinSaved(false);
    }}
    className="p-1.5 rounded text-gray-300 hover:text-indigo-500 transition-colors"
    title={`Manage PIN for ${s.student_name}`}
  >
    <Lock size={15} />
  </button>
  <button
    onClick={() => removeStudent(s.id)}
    className="p-1.5 rounded text-gray-300 hover:text-red-500 transition-colors"
    title={`Remove ${s.student_name}`}
  >
    <Trash2 size={15} />
  </button>
</li>
```

- [ ] **Step 4: Add the PIN modal**

Add this modal at the bottom of the component's JSX, just before the closing `</div>` of the outer wrapper and after the `{showBulkAdd && ...}` block:

```tsx
{/* PIN Management Modal */}
{pinStudent && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
      <h3 className="text-base font-semibold text-gray-900 mb-1">
        Secret PIN — {pinStudent.student_name}
      </h3>
      <p className="text-sm text-gray-500 mb-5">
        Share this PIN with the student so they can log in.
      </p>

      <label className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1 block">
        PIN (4 digits)
      </label>
      <input
        type="text"
        inputMode="numeric"
        maxLength={4}
        value={pinValue}
        onChange={(e) => {
          setPinValue(e.target.value.replace(/\D/g, "").slice(0, 4));
          setPinSaveError(null);
          setPinSaved(false);
        }}
        className="w-full text-center text-3xl font-black tracking-[0.4em] border-2 border-gray-200
                   rounded-xl px-4 py-3 mb-4 focus:outline-none focus:border-indigo-500
                   focus:ring-2 focus:ring-indigo-100 transition-all"
      />

      {pinSaveError && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">
          {pinSaveError}
        </p>
      )}

      {pinSaved && (
        <p className="text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2 mb-3">
          ✓ PIN saved!
        </p>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => setPinStudent(null)}
          className="flex-1 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => savePin(pinStudent.id, pinValue)}
          disabled={pinSaving || pinValue.length !== 4}
          className="flex-1 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl
                     hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {pinSaving ? "Saving…" : "Save PIN"}
        </button>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 5: TypeScript check**

```bash
cd frontend
npx tsc --noEmit
```

Expected: no errors. (The `Student` type now includes `secret_pin: string` from Task 5.)

- [ ] **Step 6: Manual smoke test**

1. Log in as a teacher and open a classroom
2. On the Roster tab, each student row should have a lock icon
3. Click the lock → PIN modal opens with the current PIN shown
4. Change the PIN to `5678` → click Save PIN → "✓ PIN saved!" flash → modal closes
5. Re-open the lock → confirm PIN shows `5678`
6. On the student `/play` page, enter the classroom code → tap that student → try old PIN `1234` → should fail with "Oops! Wrong PIN"
7. Try new PIN `5678` → login succeeds

- [ ] **Step 7: Commit**

```bash
git add frontend/app/(teacher)/classroom/[id]/page.tsx
git commit -m "feat: add PIN view/reset modal to teacher classroom roster"
```

---

## Self-Review

**Spec coverage:**
- ✅ DB migration — Task 1
- ✅ Backend login PIN verification — Task 2
- ✅ Backend teacher PIN reset endpoint — Task 3
- ✅ Expose PIN in teacher roster response — Task 4
- ✅ Frontend types — Task 5
- ✅ Avatar select refactor (no immediate login) — Task 6
- ✅ PinEntry numeric keypad with shake — Task 7
- ✅ page.tsx "enter-pin" step wiring — Task 8
- ✅ Teacher PIN management UI — Task 9

**PIN not exposed in public avatar roster** — `GET /auth/classroom/{code}/avatars` still only returns `id, student_name, avatar_url, avatar_style, theme_color`. Confirmed: `AvatarResponse` schema in `auth.py` is not modified.

**Type consistency:**
- `Avatar` interface defined identically in `avatar-select.tsx`, `pin-entry.tsx`, and `page.tsx` (all local, consistent)
- `Student` in `types/index.ts` gains `secret_pin: string`, matched by `StudentResponse` in `schemas/classroom.py`
- `ResetPinRequest` / `ResetPinResponse` defined in Task 3, used in Task 9 frontend call — endpoint is `PATCH /auth/student/{student_id}/pin`, correctly called as `/auth/student/${studentId}/pin` in Task 9
