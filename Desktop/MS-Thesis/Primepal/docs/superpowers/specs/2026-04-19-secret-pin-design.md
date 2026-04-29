# Secret PIN System — Design Spec
**Date:** 2026-04-19
**Status:** Approved

## Overview

Add a 4-digit Secret PIN to the student login flow so students cannot tap each other's avatars and log in. Teachers can view and reset a student's PIN from the classroom roster.

Teacher login is **not changed**.

---

## Scope

| Component | Change |
|-----------|--------|
| DB `students` table | Add `secret_pin VARCHAR(4) NOT NULL DEFAULT '1234'` |
| `POST /auth/student/login` | Require `secret_pin`; return 401 if wrong |
| `PATCH /auth/student/{student_id}/pin` | New endpoint — teacher resets a student's PIN |
| `GET /classroom/{id}` | Include `secret_pin` in student response (teacher only) |
| `play/page.tsx` + `avatar-select.tsx` | Add `"enter-pin"` step with numeric keypad |
| `classroom/[id]/page.tsx` | Add view/reset PIN to roster rows |

---

## Database

Migration `011_secret_pin.sql`:

```sql
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS secret_pin VARCHAR(4) NOT NULL DEFAULT '1234';
```

**Storage:** Plaintext. This is a child-safety convenience PIN, not a password. The teacher must be able to read it to relay it to a child who forgets, which requires plaintext. No bcrypt elsewhere in the project.

---

## Backend — `auth.py`

### Updated `StudentLoginRequest`
```python
class StudentLoginRequest(BaseModel):
    student_id: str
    class_code: str
    secret_pin: str

    @field_validator("secret_pin")
    @classmethod
    def validate_pin(cls, v):
        if not re.fullmatch(r"\d{4}", v):
            raise ValueError("secret_pin must be exactly 4 digits")
        return v
```

### Updated `student_login`
- Fetch `id, secret_pin` from students table
- Compare `request.secret_pin == student_res.data["secret_pin"]`
- Raise `HTTP 401 Unauthorized` with detail `"Incorrect PIN"` on mismatch

### New endpoint: `PATCH /auth/student/{student_id}/pin`
- Protected by `get_current_teacher`
- Verifies the student belongs to a classroom owned by the teacher
- Body: `{ "secret_pin": "XXXX" }` (validated 4 digits)
- Returns: `{ "student_id": "...", "secret_pin": "..." }`

---

## Backend — `classroom.py`

### `GET /classroom/{id}` student select
- Include `secret_pin` in the student fields returned (teacher-authenticated endpoint, so safe to expose)

---

## Student Frontend

### `play/page.tsx`
Add `"enter-pin"` to the `Step` type. Track `selectedAvatar: Avatar | null`. When `AvatarSelect` signals an avatar tap, transition to `"enter-pin"` without calling the API. Pass the `selectedAvatar` and a `onPinConfirm` callback down.

### `PinEntry` component (new file: `play/pin-entry.tsx`)
- Shows selected avatar (small, centered) with student name — confirmation of who they're logging in as
- 4 dot-indicators: empty circles → filled indigo circles as digits are entered
- 0–9 numeric keypad: 3×3 grid + `0` + backspace, using chunky 3D buttons (`shadow-[0_5px_0_...]`)
- Auto-submits login when 4th digit is entered
- On `401`: shake animation on the dot row + "Oops! Wrong PIN. Try again 🔐" message, reset digits
- Back button returns to character select

---

## Teacher Frontend

### `classroom/[id]/page.tsx` — roster tab
Each student row gains:
- A small lock icon button labelled "PIN"
- On click: opens an inline modal showing:
  - Current PIN (e.g. `1234`)
  - A 4-digit input to set a new PIN
  - "Save PIN" button calling `PATCH /auth/student/{student_id}/pin`
- Success shows brief "Saved ✓" confirmation

---

## Error Handling

| Scenario | Response |
|----------|----------|
| Wrong PIN | `401 Unauthorized` — "Incorrect PIN" |
| PIN not 4 digits (client) | Field validator rejects before API call |
| Student not in teacher's classroom (PIN reset) | `403 Forbidden` |

---

## What Is NOT Changed

- Teacher login flow (`/login` page, Supabase auth)
- Class code entry step in `play/page.tsx`
- Avatar roster fetch (`GET /auth/classroom/{code}/avatars`) — PIN is not exposed here
