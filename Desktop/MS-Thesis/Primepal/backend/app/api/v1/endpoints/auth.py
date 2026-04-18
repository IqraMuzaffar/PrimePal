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
