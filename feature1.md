
# PrimePal Implementation Guide: Feature 1 - Smart Auth & Role Management

## 1. System Overview & Context
You are building Feature 1 of "PrimePal", an AI-powered ESL education platform for Pakistani primary schools. 
We need to implement a **Dual-Login Authentication System**:
1.  **Teachers (Web Dashboard):** Standard Email/Password authentication using Supabase Auth.
2.  **Students (Mobile-First UI):** A password-free, frictionless login. Students enter a 6-digit `class_code`, view a list of avatars in that class, and tap their specific avatar to log in. This generates a custom JWT.

## 2. Tech Stack
* **Database & Auth:** Supabase (PostgreSQL, GoTrue).
* **Backend:** Python 3.11+ with FastAPI.
* **Frontend:** Next.js 14+ (App Router) with Tailwind CSS and `lucide-react` for icons.

---

## 3. Database Schema (Supabase PostgreSQL)
Execute this SQL in the Supabase SQL Editor to set up the foundation.

```sql
-- 1. Teachers Table (Linked to Supabase Auth)
CREATE TABLE teachers (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Classrooms Table
CREATE TABLE classrooms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
    class_name VARCHAR(100) NOT NULL,
    class_code VARCHAR(10) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Students Table (Profiles, NOT Supabase Auth users)
CREATE TABLE students (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    classroom_id UUID REFERENCES classrooms(id) ON DELETE CASCADE,
    student_name VARCHAR(100) NOT NULL,
    avatar_url VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Row Level Security (RLS) Policies
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Teachers can only read/write their own data
CREATE POLICY "Teachers can manage own profile" ON teachers FOR ALL USING (auth.uid() = id);
CREATE POLICY "Teachers can manage own classrooms" ON classrooms FOR ALL USING (auth.uid() = teacher_id);
CREATE POLICY "Teachers can manage own students" ON students FOR ALL USING (
    classroom_id IN (SELECT id FROM classrooms WHERE teacher_id = auth.uid())
);

-- Allow public read access to students by classroom for the visual login screen
CREATE POLICY "Public read students for login" ON students FOR SELECT USING (true);
CREATE POLICY "Public read classrooms for login" ON classrooms FOR SELECT USING (true);
```

---

## 4. FastAPI Backend Implementation

### File: `app/core/security.py`
**Goal:** Create dependencies to verify both Teacher (Supabase) and Student (Custom PyJWT) tokens.
* Install: `pip install pyjwt supabase fastapi pydantic`
* Logic: Write a function `create_student_token(student_id: str, classroom_id: str)` using a secret `STUDENT_JWT_SECRET` from `.env`.
* Logic: Write `get_current_student(token)` dependency that decodes this token.

### File: `app/api/routes/auth.py`
**Goal:** The endpoints for the student visual login flow.
```python
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List
# ... imports for db and security

router = APIRouter(prefix="/api/v1/auth", tags=["Auth"])

class AvatarResponse(BaseModel):
    id: str
    student_name: str
    avatar_url: str

class StudentLoginRequest(BaseModel):
    student_id: str
    class_code: str

@router.get("/classroom/{class_code}/avatars", response_model=List[AvatarResponse])
async def get_classroom_avatars(class_code: str):
    """Fetch all student profiles for a given class code so the frontend can render the Avatar grid."""
    # 1. Query DB: SELECT id FROM classrooms WHERE class_code = class_code
    # 2. Query DB: SELECT id, student_name, avatar_url FROM students WHERE classroom_id = result.id
    # 3. Return the list. Raise 404 if class_code is invalid.
    pass

@router.post("/student/login")
async def student_login(request: StudentLoginRequest):
    """Validates the student selection and issues a custom JWT."""
    # 1. Verify student_id actually belongs to the classroom linked to class_code.
    # 2. Generate token: token = create_student_token(request.student_id, classroom_id)
    # 3. Return {"access_token": token, "token_type": "bearer"}
    pass
```

---

## 5. Next.js Frontend Implementation

### Folder Structure Setup:
Use Route Groups to separate the Teacher and Student layouts.
* `app/(teacher)/login/page.tsx`
* `app/(student)/play/page.tsx`

### File: `app/(teacher)/login/page.tsx`
**Goal:** Standard Teacher Login.
* **UI:** A clean, professional form with Email and Password inputs.
* **Logic:** Use `@supabase/ssr` or `@supabase/supabase-js` to call `supabase.auth.signInWithPassword()`.
* **Routing:** On success, redirect to `/dashboard`.

### File: `app/(student)/play/page.tsx`
**Goal:** Step 1 of Student Login (Enter Code).
* **UI:** A highly gamified, child-friendly screen. Big text, bright colors. A single large input field for the 6-digit `class_code`.
* **Logic:** On submit, hit the FastAPI endpoint `/api/v1/auth/classroom/{code}/avatars`.
* **State:** If successful, save the `class_code` and the fetched list of avatars to a React state or Context, and transition the view to Step 2.

### File: `app/(student)/play/avatar-select.tsx` (Component)
**Goal:** Step 2 of Student Login (Tap Avatar).
* **UI:** Display a responsive CSS Grid of the avatars fetched in Step 1. Under each avatar image, display the `student_name`.
* **Logic:** When a child taps their avatar, call `POST /api/v1/auth/student/login` with the `student_id` and `class_code`.
* **Auth Persistence:** Save the returned JWT in `localStorage` (e.g., `primepal_student_token`). 
* **Routing:** Redirect the child to `/missions` (The Mission Hub).

## 6. Execution Instructions for AI
1. Please start by initializing the Next.js and FastAPI directory structures.
2. Create the Supabase utility clients for both the frontend and backend.
3. Implement the FastAPI routes and security dependencies first, ensuring the JWT logic works.
4. Implement the Next.js UI components, prioritizing a highly accessible, touch-friendly UI for the student `/play` route.
