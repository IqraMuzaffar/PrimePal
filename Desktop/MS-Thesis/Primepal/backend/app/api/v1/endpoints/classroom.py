# backend/app/api/v1/endpoints/classroom.py
"""
Feature 2: Classroom Manager (The "Registry")

Endpoints (all require a valid teacher Supabase session):
  POST   /api/v1/classroom/                           — create classroom
  GET    /api/v1/classroom/                           — list teacher's classrooms
  GET    /api/v1/classroom/{id}                       — get classroom + roster
  POST   /api/v1/classroom/{id}/students/bulk         — bulk-add student ghost profiles
  DELETE /api/v1/classroom/{id}/students/{student_id} — remove a student
  PATCH  /api/v1/classroom/{id}/students/{student_id} — update student (name, roll_number, email)
"""
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import get_current_teacher
from app.core.supabase_client import get_supabase_admin
from app.schemas.classroom import (
    ClassroomCreate,
    ClassroomDetail,
    ClassroomResponse,
    ClassroomUpdate,
    StudentBulkCreate,
    StudentResponse,  # noqa: F401 — referenced via ClassroomDetail
    StudentUpdate,
)

router = APIRouter()


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
        .select("id, student_name, avatar_url, secret_pin, roll_number, email")
        .eq("classroom_id", classroom_id)
        .execute()
    )
    return {**classroom_res.data, "students": students_res.data or []}


@router.patch("/{classroom_id}", response_model=ClassroomResponse)
async def update_classroom(
    classroom_id: str,
    request: ClassroomUpdate,
    teacher: dict = Depends(get_current_teacher),
):
    """Update classroom settings (e.g., current_week_topic). Teacher ownership verified."""
    supabase = get_supabase_admin()
    _verify_classroom_ownership(supabase, classroom_id, teacher["id"])

    # Build update payload with only non-None fields
    update_data = {}
    if request.current_week_topic is not None:
        update_data["current_week_topic"] = request.current_week_topic

    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No fields to update",
        )

    result = (
        supabase.table("classrooms")
        .update(update_data)
        .eq("id", classroom_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update classroom",
        )
    return result.data[0]


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
            "avatar_url": f"https://api.dicebear.com/8.x/adventurer/svg?seed={name}",
        }
        for name in names
    ]
    result = supabase.table("students").insert(rows).execute()
    added = len(result.data) if result.data else len(rows)
    return {"added": added}


@router.delete("/{classroom_id}/students/{student_id}", status_code=204)
async def remove_student(
    classroom_id: str,
    student_id: str,
    teacher: dict = Depends(get_current_teacher),
):
    """Removes a student ghost profile from the roster."""
    supabase = get_supabase_admin()
    _verify_classroom_ownership(supabase, classroom_id, teacher["id"])

    result = (
        supabase.table("students")
        .delete()
        .eq("id", student_id)
        .eq("classroom_id", classroom_id)
        .execute()
    )
    # supabase-py returns deleted rows in result.data; if empty, no row matched
    if result.data is not None and len(result.data) == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")


@router.patch("/{classroom_id}/students/{student_id}", response_model=StudentResponse)
async def update_student(
    classroom_id: str,
    student_id: str,
    request: StudentUpdate,
    teacher: dict = Depends(get_current_teacher),
):
    """Update student identity fields (name, roll_number, email). Teacher ownership verified."""
    supabase = get_supabase_admin()
    _verify_classroom_ownership(supabase, classroom_id, teacher["id"])

    update_data = {k: v for k, v in request.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No fields to update",
        )

    result = (
        supabase.table("students")
        .update(update_data)
        .eq("id", student_id)
        .eq("classroom_id", classroom_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    return result.data[0]
