# Admin Role System Design

**Date:** 2026-04-22
**Feature:** System Admin Role with overarching platform management
**Approach:** Hybrid (RLS reads + service role writes), Auth Hook for role claims, Option B admin login (invite code)

---

## Overview

Elevate PrimePal into a production-ready School Management System by introducing a **System Admin** role who can manage the entire platform (Teachers, Classrooms, and Global Curriculum) without being tied to a specific classroom.

Admins are:
- **Exclusive** (role is either 'teacher' or 'admin', not both)
- **Self-service after bootstrap** (first admin created manually, can then invite others)
- **Restricted by intent** (manage staff, view/delete curriculum, reassign classrooms — no classroom editing)

---

## Architecture Overview

### Authentication & Role Management

**JWT Role Claims:**
- When an admin logs in, Supabase Auth Hook queries the `teachers` table
- Hook adds `role` claim to the JWT: `{..., "role": "admin"}`
- RLS policies check this claim for read access
- Teachers get `role: "teacher"` claim
- All subsequent requests carry their role in the JWT

**Data Access Pattern (Hybrid):**
- **Reads** (admin dashboards): GoTrue JWT + RLS policies
  - Admin queries `SELECT * FROM teachers` → RLS allows because JWT.role='admin'
  - Direct Supabase client queries (fast, scales well)
- **Writes** (sensitive ops): Service role key from backend
  - Admin invites, teacher deletes with cascading reassignment, curriculum deletion
  - Backend validates admin role, uses service role to execute, logs action
  - No RLS restrictions for service role (controlled by backend logic)

### Three Core Admin Dashboards

1. **Staff Directory** — Manage all teachers
   - Add new teachers via invite code
   - Edit teacher email/name
   - Delete teacher (triggers cascading classroom reassignment modal)
   - View role (teacher/admin) for each staff member

2. **Global Curriculum** — Oversight of all knowledge
   - View all uploaded curriculum chunks (PDFs, embeddings)
   - Delete any curriculum chunk (with confirmation)
   - Cleanup associated vector DB entries

3. **School Hierarchy** — Classroom oversight
   - View all classrooms (ignoring RLS teacher restrictions)
   - View weekly topics per classroom
   - Reassign classroom ownership to a different teacher
   - **Cannot** edit classroom details or delete classrooms

---

## Database Layer

### 1. Migration: Add Role Column to Teachers

**File:** `supabase/migrations/014_admin_roles.sql`

```sql
-- Add role column to teachers table
ALTER TABLE teachers
ADD COLUMN role VARCHAR(20) DEFAULT 'teacher' CHECK (role IN ('teacher', 'admin'));

-- Index for admin lookups
CREATE INDEX idx_teachers_role ON teachers(role);

-- Create admin_invite_codes table for secure admin onboarding
CREATE TABLE IF NOT EXISTS admin_invite_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code VARCHAR(32) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    created_by UUID REFERENCES teachers(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Index for invite code lookups
CREATE INDEX idx_admin_invite_codes_code ON admin_invite_codes(code);
CREATE INDEX idx_admin_invite_codes_expires_at ON admin_invite_codes(expires_at);

-- Audit log for admin actions
CREATE TABLE IF NOT EXISTS admin_audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,  -- 'delete_curriculum', 'reassign_classroom', etc.
    resource_type VARCHAR(50) NOT NULL,  -- 'teacher', 'classroom', 'curriculum'
    resource_id VARCHAR(255),
    details JSONB,  -- Flexible for various action details
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- RLS: Only admins can read admin tables
ALTER TABLE admin_invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Admins can see all invite codes
CREATE POLICY "Admins can view invite codes"
    ON admin_invite_codes FOR SELECT
    USING (auth.jwt_claims ->> 'role' = 'admin');

-- Admins can insert new invite codes
CREATE POLICY "Admins can create invite codes"
    ON admin_invite_codes FOR INSERT
    WITH CHECK (auth.jwt_claims ->> 'role' = 'admin');

-- Admins can see all audit logs
CREATE POLICY "Admins can view audit logs"
    ON admin_audit_log FOR SELECT
    USING (auth.jwt_claims ->> 'role' = 'admin');

-- Admins can insert audit logs (via backend)
CREATE POLICY "Admins can create audit logs"
    ON admin_audit_log FOR INSERT
    WITH CHECK (auth.jwt_claims ->> 'role' = 'admin');
```

### 2. Modified RLS Policies for Teachers & Classrooms

Update existing RLS to check role:

```sql
-- Teachers table: Admins see all, teachers see only self
DROP POLICY "Teachers can manage own profile" ON teachers;
CREATE POLICY "Admins see all teachers, teachers see self"
    ON teachers FOR SELECT
    USING (
        auth.jwt_claims ->> 'role' = 'admin'  -- Admins see all
        OR auth.uid() = id                      -- Teachers see only self
    );

-- Classrooms table: Admins see all, teachers see own
DROP POLICY "Teachers can manage own classrooms" ON classrooms;
CREATE POLICY "Admins see all classrooms, teachers see own"
    ON classrooms FOR SELECT
    USING (
        auth.jwt_claims ->> 'role' = 'admin'  -- Admins see all
        OR auth.uid() = teacher_id             -- Teachers see own
    );
```

### 3. Supabase Auth Hook (JWT Claims)

**Setup:**
1. Go to Supabase dashboard → Authentication → Edge Functions
2. Create a new function that runs on `auth.session_created` event
3. Function queries `teachers` table for the user's role and adds it to JWT

**Function Code:**
```typescript
// supabase/functions/auth-hook-add-role/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
);

Deno.serve(async (req) => {
  const { user } = await req.json();

  if (!user?.id) {
    return new Response(
      JSON.stringify({ error: "No user ID" }),
      { status: 400 }
    );
  }

  // Fetch user's role from teachers table
  const { data, error } = await supabase
    .from("teachers")
    .select("role")
    .eq("id", user.id)
    .single();

  if (error || !data) {
    console.error("Role lookup failed:", error);
    // Default to 'teacher' if not found
    return new Response(
      JSON.stringify({
        claims: { role: "teacher" },
      }),
      { status: 200 }
    );
  }

  return new Response(
    JSON.stringify({
      claims: { role: data.role },
    }),
    { status: 200 }
  );
});
```

**Trigger in Supabase Auth Config:**
- Event: `auth.session_created`
- Webhook URL: Your auth hook function URL
- The JWT will automatically include the `role` claim on login

---

## Backend Layer (FastAPI)

### 1. Security Dependencies

**File:** `backend/app/core/security.py`

Add a new dependency for admin verification:

```python
def get_current_admin(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> dict:
    """FastAPI dependency — validates an admin JWT.

    Returns {"id": "<admin_uuid>"} on success.
    Raises 403 if user is not admin, 401 if token is invalid.
    """
    supabase = get_supabase()
    response = supabase.auth.get_user(credentials.credentials)
    if not response or not response.user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session",
        )

    # Query DB for role
    teachers = supabase.table("teachers").select("role").eq("id", str(response.user.id)).execute()
    if not teachers.data or teachers.data[0]["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied — admin role required",
        )

    return {"id": str(response.user.id)}
```

### 2. Admin Endpoints

**File:** `backend/app/api/v1/endpoints/admin.py` (new)

```python
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from datetime import datetime, timedelta, timezone
from app.core.security import get_current_admin
from app.core.supabase_client import get_supabase
import secrets

router = APIRouter(prefix="/admin", tags=["admin"])

# ─────────────────────────────────────────────────────────────
# ADMIN INVITE CODES (Bootstrap + Self-Service)
# ─────────────────────────────────────────────────────────────

class AdminInviteRequest(BaseModel):
    email: str
    expires_in_days: int = 7

@router.post("/invite-code")
async def create_admin_invite(
    req: AdminInviteRequest,
    current_admin: dict = Depends(get_current_admin),
):
    """Create an invite code for a new admin (self-service from existing admin)."""
    supabase = get_supabase()
    supabase_admin = get_supabase_admin()

    # Generate secure code
    code = secrets.token_urlsafe(24)

    # Insert invite code (expires in N days)
    expires_at = datetime.now(tz=timezone.utc) + timedelta(days=req.expires_in_days)

    result = supabase_admin.table("admin_invite_codes").insert({
        "code": code,
        "email": req.email,
        "created_by": current_admin["id"],
        "expires_at": expires_at.isoformat(),
    }).execute()

    # Log action
    supabase_admin.table("admin_audit_log").insert({
        "admin_id": current_admin["id"],
        "action": "create_invite_code",
        "resource_type": "admin_invite",
        "resource_id": code,
        "details": {"email": req.email},
    }).execute()

    return {"code": code, "email": req.email, "expires_at": expires_at}

# ─────────────────────────────────────────────────────────────
# TEACHER MANAGEMENT
# ─────────────────────────────────────────────────────────────

class TeacherCreateRequest(BaseModel):
    email: str
    full_name: str
    invite_code: str  # From admin invite code

@router.post("/teachers")
async def create_teacher_via_invite(req: TeacherCreateRequest):
    """Create a new admin account via invite code (no login required yet)."""
    supabase_admin = get_supabase_admin()

    # Verify invite code exists and hasn't expired
    codes = supabase_admin.table("admin_invite_codes").select("*").eq("code", req.invite_code).execute()

    if not codes.data:
        raise HTTPException(status_code=400, detail="Invalid invite code")

    code_record = codes.data[0]
    if code_record["used_at"]:
        raise HTTPException(status_code=400, detail="Invite code already used")

    if datetime.fromisoformat(code_record["expires_at"]) < datetime.now(tz=timezone.utc):
        raise HTTPException(status_code=400, detail="Invite code expired")

    # Create Supabase Auth user
    auth_result = supabase_admin.auth.admin_create_user({
        "email": req.email,
        "password": secrets.token_urlsafe(16),  # Temp password, user will reset
        "email_confirm": True,
    })

    if not auth_result.user:
        raise HTTPException(status_code=500, detail="Failed to create auth user")

    # Insert into teachers table with role='admin'
    supabase_admin.table("teachers").insert({
        "id": str(auth_result.user.id),
        "email": req.email,
        "full_name": req.full_name,
        "role": "admin",
    }).execute()

    # Mark invite code as used
    supabase_admin.table("admin_invite_codes").update({
        "used_at": datetime.now(tz=timezone.utc).isoformat(),
    }).eq("code", req.invite_code).execute()

    return {"id": str(auth_result.user.id), "email": req.email, "role": "admin"}

class TeacherEditRequest(BaseModel):
    full_name: str = None
    email: str = None

@router.put("/teachers/{teacher_id}")
async def edit_teacher(
    teacher_id: str,
    req: TeacherEditRequest,
    current_admin: dict = Depends(get_current_admin),
):
    """Edit teacher details (name, email)."""
    supabase_admin = get_supabase_admin()

    update_data = {}
    if req.full_name:
        update_data["full_name"] = req.full_name
    if req.email:
        update_data["email"] = req.email

    result = supabase_admin.table("teachers").update(update_data).eq("id", teacher_id).execute()

    supabase_admin.table("admin_audit_log").insert({
        "admin_id": current_admin["id"],
        "action": "edit_teacher",
        "resource_type": "teacher",
        "resource_id": teacher_id,
        "details": update_data,
    }).execute()

    return result.data[0] if result.data else {}

class TeacherDeleteRequest(BaseModel):
    reassign_classrooms_to: str  # Teacher ID to reassign to

@router.delete("/teachers/{teacher_id}")
async def delete_teacher(
    teacher_id: str,
    req: TeacherDeleteRequest,
    current_admin: dict = Depends(get_current_admin),
):
    """Delete a teacher. All their classrooms are reassigned to the specified teacher."""
    supabase_admin = get_supabase_admin()

    # Validate target teacher exists
    target = supabase_admin.table("teachers").select("id").eq("id", req.reassign_classrooms_to).execute()
    if not target.data:
        raise HTTPException(status_code=404, detail="Target teacher not found")

    # Reassign all classrooms
    classrooms = supabase_admin.table("classrooms").select("id").eq("teacher_id", teacher_id).execute()

    for classroom in classrooms.data:
        supabase_admin.table("classrooms").update({
            "teacher_id": req.reassign_classrooms_to,
        }).eq("id", classroom["id"]).execute()

    # Delete teacher
    supabase_admin.table("teachers").delete().eq("id", teacher_id).execute()

    # Log action
    supabase_admin.table("admin_audit_log").insert({
        "admin_id": current_admin["id"],
        "action": "delete_teacher",
        "resource_type": "teacher",
        "resource_id": teacher_id,
        "details": {
            "reassigned_classrooms_to": req.reassign_classrooms_to,
            "classroom_count": len(classrooms.data),
        },
    }).execute()

    return {"deleted": True, "classrooms_reassigned": len(classrooms.data)}

# ─────────────────────────────────────────────────────────────
# CLASSROOM MANAGEMENT
# ─────────────────────────────────────────────────────────────

class ClassroomReassignRequest(BaseModel):
    teacher_id: str

@router.put("/classrooms/{classroom_id}/reassign")
async def reassign_classroom(
    classroom_id: str,
    req: ClassroomReassignRequest,
    current_admin: dict = Depends(get_current_admin),
):
    """Reassign a classroom to a different teacher."""
    supabase_admin = get_supabase_admin()

    # Validate target teacher exists
    target = supabase_admin.table("teachers").select("id").eq("id", req.teacher_id).execute()
    if not target.data:
        raise HTTPException(status_code=404, detail="Target teacher not found")

    # Reassign classroom
    result = supabase_admin.table("classrooms").update({
        "teacher_id": req.teacher_id,
    }).eq("id", classroom_id).execute()

    # Log action
    supabase_admin.table("admin_audit_log").insert({
        "admin_id": current_admin["id"],
        "action": "reassign_classroom",
        "resource_type": "classroom",
        "resource_id": classroom_id,
        "details": {"new_teacher_id": req.teacher_id},
    }).execute()

    return result.data[0] if result.data else {}

# ─────────────────────────────────────────────────────────────
# CURRICULUM MANAGEMENT
# ─────────────────────────────────────────────────────────────

@router.delete("/curriculum/{chunk_id}")
async def delete_curriculum_chunk(
    chunk_id: str,
    current_admin: dict = Depends(get_current_admin),
):
    """Delete a curriculum chunk from vector DB and knowledge base."""
    supabase_admin = get_supabase_admin()

    # Delete from snc_knowledge_base (or wherever curriculum is stored)
    supabase_admin.table("snc_knowledge_base").delete().eq("id", chunk_id).execute()

    # Log action
    supabase_admin.table("admin_audit_log").insert({
        "admin_id": current_admin["id"],
        "action": "delete_curriculum",
        "resource_type": "curriculum",
        "resource_id": chunk_id,
        "details": {},
    }).execute()

    return {"deleted": True}
```

### 3. Register Admin Router

**File:** `backend/app/api/v1/main.py`

```python
from app.api.v1.endpoints import admin

app.include_router(admin.router)
```

---

## Frontend Layer

### 1. Routes & Layout

**Directory Structure:**
```
frontend/app/admin/
  ├── layout.tsx                     # Admin layout (dark navbar)
  ├── login/
  │   └── page.tsx                   # Admin login with invite code
  └── dashboard/
      ├── page.tsx                   # Admin dashboard (main)
      ├── staff/
      │   └── page.tsx               # Staff Directory
      ├── curriculum/
      │   └── page.tsx               # Global Curriculum
      └── hierarchy/
          └── page.tsx               # School Hierarchy
```

### 2. Admin Login Page

**File:** `frontend/app/admin/login/page.tsx`

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function AdminLoginPage() {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState<"code" | "signup" | "login">("code");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleInviteCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Validate invite code on backend
      const response = await fetch("/api/v1/admin/validate-invite-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: inviteCode }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Invalid invite code");
      }

      const data = await response.json();
      setEmail(data.email);
      setStep("signup");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      // Create admin account via invite code
      const response = await fetch("/api/v1/admin/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          full_name: fullName,
          invite_code: inviteCode,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Failed to create account");
      }

      // Now sign in with the created credentials
      const signInResponse = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInResponse.error) {
        throw new Error(signInResponse.error.message);
      }

      router.push("/admin/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const signInResponse = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInResponse.error) {
        throw new Error(signInResponse.error.message);
      }

      router.push("/admin/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Login</h1>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error}
            </div>
          )}

          {step === "code" && (
            <form onSubmit={handleInviteCodeSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Invite Code
                </label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="Enter your invite code"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 text-white py-2 rounded-lg font-medium hover:bg-slate-800 disabled:opacity-50"
              >
                {loading ? "Verifying..." : "Continue"}
              </button>
            </form>
          )}

          {step === "signup" && (
            <form onSubmit={handleSignup} className="space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                Create your admin account for {email}
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 text-white py-2 rounded-lg font-medium hover:bg-slate-800 disabled:opacity-50"
              >
                {loading ? "Creating..." : "Create Admin Account"}
              </button>
            </form>
          )}

          {step === "signup" && (
            <p className="text-center text-sm text-gray-600 mt-4">
              Already have an account?{" "}
              <button
                onClick={() => setStep("login")}
                className="text-slate-900 font-medium hover:underline"
              >
                Sign in
              </button>
            </p>
          )}

          {step === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 text-white py-2 rounded-lg font-medium hover:bg-slate-800 disabled:opacity-50"
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
```

### 3. Admin Layout

**File:** `frontend/app/admin/layout.tsx`

```typescript
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    // Check if user is authenticated and is admin
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/admin/login");
        return;
      }

      // TODO: Verify admin role from JWT or backend call
      setAuthenticated(true);
      setLoading(false);
    };

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!authenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Navbar */}
      <nav className="bg-slate-800 border-b border-slate-700 text-white">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">PrimePal Admin</h1>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              router.push("/admin/login");
            }}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm"
          >
            Sign Out
          </button>
        </div>
      </nav>

      {/* Tab Navigation */}
      <div className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-8 text-white">
            <Link
              href="/admin/dashboard/staff"
              className="px-4 py-3 border-b-2 border-transparent hover:border-slate-400 transition"
            >
              Staff Directory
            </Link>
            <Link
              href="/admin/dashboard/hierarchy"
              className="px-4 py-3 border-b-2 border-transparent hover:border-slate-400 transition"
            >
              School Hierarchy
            </Link>
            <Link
              href="/admin/dashboard/curriculum"
              className="px-4 py-3 border-b-2 border-transparent hover:border-slate-400 transition"
            >
              Global Curriculum
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">{children}</div>
    </div>
  );
}
```

### 4. Admin Dashboards (Stubs)

**Staff Directory** — `frontend/app/admin/dashboard/staff/page.tsx`

```typescript
"use client";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";

export default function StaffDirectoryPage() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch all teachers
    const fetchTeachers = async () => {
      try {
        const response = await fetch("/api/v1/admin/teachers", {
          headers: {
            Authorization: `Bearer ${(await import("@/lib/teacherAuth")).getTeacherHeaders()}`,
          },
        });
        const data = await response.json();
        setTeachers(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTeachers();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Staff Directory</h2>
        <button className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">
          <Plus size={20} />
          Invite Teacher
        </button>
      </div>

      {loading ? (
        <div className="text-gray-400">Loading...</div>
      ) : (
        <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
          <table className="w-full text-sm text-gray-300">
            <thead className="bg-slate-700 border-b border-slate-600">
              <tr>
                <th className="px-6 py-3 text-left font-semibold">Name</th>
                <th className="px-6 py-3 text-left font-semibold">Email</th>
                <th className="px-6 py-3 text-left font-semibold">Role</th>
                <th className="px-6 py-3 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {teachers.map((teacher: any) => (
                <tr key={teacher.id} className="hover:bg-slate-700 transition">
                  <td className="px-6 py-4">{teacher.full_name}</td>
                  <td className="px-6 py-4">{teacher.email}</td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-indigo-900 text-indigo-200 rounded text-xs">
                      {teacher.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 flex items-center justify-center gap-2">
                    <button className="p-2 hover:bg-slate-700 rounded">
                      <Edit2 size={16} />
                    </button>
                    <button className="p-2 hover:bg-red-900 hover:text-red-300 rounded">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

**School Hierarchy** — `frontend/app/admin/dashboard/hierarchy/page.tsx`

```typescript
"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

export default function SchoolHierarchyPage() {
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch all classrooms
    const fetchClassrooms = async () => {
      try {
        const response = await fetch("/api/v1/admin/classrooms", {
          headers: {
            Authorization: `Bearer ${(await import("@/lib/teacherAuth")).getTeacherHeaders()}`,
          },
        });
        const data = await response.json();
        setClassrooms(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchClassrooms();
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">School Hierarchy</h2>

      {loading ? (
        <div className="text-gray-400">Loading...</div>
      ) : (
        <div className="space-y-4">
          {classrooms.map((classroom: any) => (
            <div
              key={classroom.id}
              className="bg-slate-800 border border-slate-700 rounded-lg p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {classroom.class_name}
                  </h3>
                  <p className="text-sm text-gray-400">
                    Teacher: {classroom.teacher_name}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <select className="bg-slate-700 text-white px-4 py-2 rounded border border-slate-600">
                    <option>Reassign to...</option>
                    {/* Populate with teacher list */}
                  </select>
                  <button className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
                    Update
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Global Curriculum** — `frontend/app/admin/dashboard/curriculum/page.tsx`

```typescript
"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";

export default function GlobalCurriculumPage() {
  const [curriculum, setCurriculum] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch all curriculum chunks
    const fetchCurriculum = async () => {
      try {
        const response = await fetch("/api/v1/admin/curriculum", {
          headers: {
            Authorization: `Bearer ${(await import("@/lib/teacherAuth")).getTeacherHeaders()}`,
          },
        });
        const data = await response.json();
        setCurriculum(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchCurriculum();
  }, []);

  const handleDelete = async (chunkId: string) => {
    if (!confirm("Are you sure? This will permanently delete this curriculum."))
      return;

    try {
      await fetch(`/api/v1/admin/curriculum/${chunkId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${(await import("@/lib/teacherAuth")).getTeacherHeaders()}`,
        },
      });
      setCurriculum(curriculum.filter((c: any) => c.id !== chunkId));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Global Curriculum</h2>

      {loading ? (
        <div className="text-gray-400">Loading...</div>
      ) : (
        <div className="space-y-4">
          {curriculum.map((chunk: any) => (
            <div
              key={chunk.id}
              className="bg-slate-800 border border-slate-700 rounded-lg p-6 flex items-center justify-between"
            >
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {chunk.title}
                </h3>
                <p className="text-sm text-gray-400">
                  Uploaded by: {chunk.uploaded_by} • {chunk.created_at}
                </p>
              </div>
              <button
                onClick={() => handleDelete(chunk.id)}
                className="p-2 hover:bg-red-900 hover:text-red-300 rounded transition"
              >
                <Trash2 size={20} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## Security & Audit

### Role Enforcement
- `get_current_admin()` dependency checks role in DB before allowing access
- Returns 403 if user is not admin
- Service role key used **only** for backend operations (never exposed to frontend)

### RLS Policies
- Read operations: JWT role claim checked by RLS
- Admins bypass RLS via service role for sensitive writes
- Non-admin teachers cannot access admin tables

### Audit Logging
- Every sensitive action logged to `admin_audit_log` table
- Includes: admin_id, action type, resource, timestamp, details
- Admins can view audit log from dashboard (future feature)

---

## Success Criteria

✅ Admins can create new admins via invite code
✅ Admins can manage all teachers (add, edit, delete with cascading)
✅ Admins can view and reassign all classrooms
✅ Admins can delete curriculum chunks
✅ RLS enforces role-based access
✅ Service role key protects sensitive operations
✅ Audit trail logs all admin actions
✅ Admin dashboard uses distinct UI (dark slate theme)
✅ Separate `/admin/login` page with invite code

---

## Future Enhancements (Out of Scope)

- Admin invite code expiration & revocation UI
- Audit log viewer (with filtering)
- Bulk teacher import
- Dashboard analytics (teacher activity, curriculum coverage)
- Admin password reset workflows
- 2FA for admin accounts
