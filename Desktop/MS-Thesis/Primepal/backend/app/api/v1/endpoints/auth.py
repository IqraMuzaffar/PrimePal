"""
Feature 1: Smart Auth & Role Management

Endpoints:
  GET  /api/v1/auth/classroom/{class_code}/avatars  — fetch student roster for visual login
  POST /api/v1/auth/student/login                   — validate avatar tap and issue JWT

Teacher auth is handled entirely by Supabase Auth (GoTrue) on the frontend.
No custom teacher login endpoint is needed on this backend.
"""
from typing import List

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.core.security import create_student_token
from app.core.supabase_client import get_supabase

router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────────────────────

class AvatarResponse(BaseModel):
    id: str
    student_name: str
    avatar_url: str


class StudentLoginRequest(BaseModel):
    student_id: str
    class_code: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get(
    "/classroom/{class_code}/avatars",
    response_model=List[AvatarResponse],
    summary="Fetch avatar roster for a classroom",
)
async def get_classroom_avatars(class_code: str) -> List[AvatarResponse]:
    """
    Step 1 of the student visual login flow.
    Returns all student profiles (id, name, avatar_url) for the given class code
    so the frontend can render the avatar selection grid.
    """
    supabase = get_supabase()

    # 1. Resolve class_code → classroom id
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

    # 2. Fetch all students in that classroom
    students_res = (
        supabase.table("students")
        .select("id, student_name, avatar_url")
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
    Verifies the selected student belongs to the classroom identified by class_code,
    then issues a signed JWT for the student session.
    """
    supabase = get_supabase()

    # 1. Resolve class_code → classroom id
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

    # 2. Verify student belongs to this classroom (prevents cross-classroom spoofing)
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

    # 3. Issue custom JWT
    token = create_student_token(
        student_id=request.student_id,
        classroom_id=classroom_id,
    )
    return TokenResponse(access_token=token)
