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
