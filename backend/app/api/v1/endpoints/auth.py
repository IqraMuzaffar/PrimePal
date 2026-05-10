"""
Feature 1: Smart Auth & Role Management

Endpoints:
  GET   /api/v1/auth/classroom/{class_code}/avatars  — fetch student roster for visual login
  POST  /api/v1/auth/student/login                   — validate avatar tap + PIN and issue JWT
  PATCH /api/v1/auth/student/profile                 — update avatar_style and theme_color
  PATCH /api/v1/auth/student/{student_id}/pin        — teacher-only PIN reset
"""
import re
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, field_validator

from app.core.security import create_student_token, get_current_student, get_current_teacher
from app.core.permissions import check_permission
from app.core.supabase_client import get_supabase, get_supabase_admin

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
    secret_pin: str

    @field_validator("secret_pin")
    @classmethod
    def validate_pin(cls, v: str) -> str:
        if not re.fullmatch(r"\d{4}", v):
            raise ValueError("secret_pin must be exactly 4 digits")
        return v


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
    try:
        supabase = get_supabase_admin()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Database service unavailable",
        )

    # Convert to uppercase for case-insensitive lookup
    class_code_upper = class_code.upper()

    try:
        classroom_res = (
            supabase.table("classrooms")
            .select("id")
            .eq("class_code", class_code_upper)
            .maybe_single()
            .execute()
        )
    except Exception:
        classroom_res = None

    if not classroom_res or not classroom_res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No classroom found for class code '{class_code}'",
        )

    classroom_id: str = classroom_res.data["id"]

    try:
        students_res = (
            supabase.table("students")
            .select("id, student_name, avatar_url, avatar_style, theme_color")
            .eq("classroom_id", classroom_id)
            .execute()
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to fetch student roster",
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
    try:
        supabase = get_supabase_admin()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Database service unavailable",
        )

    # Convert to uppercase for case-insensitive lookup
    class_code_upper = request.class_code.upper()

    try:
        classroom_res = (
            supabase.table("classrooms")
            .select("id")
            .eq("class_code", class_code_upper)
            .maybe_single()
            .execute()
        )
    except Exception:
        classroom_res = None

    if not classroom_res or not classroom_res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No classroom found for class code '{request.class_code}'",
        )

    classroom_id: str = classroom_res.data["id"]

    try:
        student_res = (
            supabase.table("students")
            .select("id, secret_pin")
            .eq("id", request.student_id)
            .eq("classroom_id", classroom_id)
            .maybe_single()
            .execute()
        )
    except Exception:
        student_res = None

    if not student_res or not student_res.data:
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


@router.patch(
    "/student/profile",
    response_model=UpdateProfileResponse,
    summary="Update student profile (avatar customization removed)",
)
async def update_student_profile(
    body: UpdateProfileRequest,
    student: dict = Depends(get_current_student),
) -> UpdateProfileResponse:
    """
    Avatar customization feature has been removed for performance optimization.
    This endpoint is kept for backward compatibility but does nothing.
    Returns default values.
    """
    # Feature disabled - return default values
    return UpdateProfileResponse(
        avatar_style="adventurer",
        theme_color="#6366f1"
    )


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
    check_permission(teacher, "student:update")
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


class TeacherProfileResponse(BaseModel):
    id: str
    email: str | None = None
    full_name: str | None = None
    role: str


@router.get(
    "/me",
    response_model=TeacherProfileResponse,
    summary="Get current teacher profile with role",
)
async def get_teacher_profile(
    teacher: dict = Depends(get_current_teacher),
) -> TeacherProfileResponse:
    """Returns the authenticated teacher's profile including role (teacher/admin)."""
    supabase = get_supabase_admin()
    try:
        result = (
            supabase.table("teachers")
            .select("id, email, full_name, role")
            .eq("id", teacher["id"])
            .maybe_single()
            .execute()
        )
        data = result.data
    except Exception:
        data = None
    if not data:
        return TeacherProfileResponse(
            id=teacher["id"],
            role=teacher.get("role", "teacher"),
        )
    return TeacherProfileResponse(**data)
