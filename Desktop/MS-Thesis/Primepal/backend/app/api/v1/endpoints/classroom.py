# backend/app/api/v1/endpoints/classroom.py
"""
Feature 2: Classroom Manager (The "Registry")

Endpoints (all require a valid teacher Supabase session):
  POST   /api/v1/classroom/                           — create classroom
  GET    /api/v1/classroom/                           — list teacher's classrooms
  GET    /api/v1/classroom/{id}                       — get classroom + roster
  POST   /api/v1/classroom/{id}/students/bulk         — bulk-add students (names only)
  POST   /api/v1/classroom/{id}/students/bulk-v2      — bulk-add students (name + roll_number + email)
  DELETE /api/v1/classroom/{id}/students/{student_id} — remove a student
  PATCH  /api/v1/classroom/{id}/students/{student_id} — update student (name, roll_number, email)

Feature 15: SNC Pacing Calendar
  GET    /api/v1/classroom/{id}/syllabus              — list 30-week syllabus
  PATCH  /api/v1/classroom/{id}/syllabus/{week}      — update week status
"""
from typing import List, Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.security import get_current_teacher
from app.core.permissions import check_permission, check_admin
from app.core.supabase_client import get_supabase_admin
from app.schemas.classroom import (
    ClassroomCreate,
    ClassroomDetail,
    ClassroomResponse,
    ClassroomUpdate,
    StudentBulkCreate,
    StudentBulkCreateV2,
    StudentResponse,  # noqa: F401 — referenced via ClassroomDetail
    StudentUpdate,
)
from app.schemas.topic import SncTopicOut, TopicsBySkillResponse, SkillTopicsGroup
from app.utils.code_generation import generate_memorable_code

router = APIRouter()


# ── Helpers ───────────────────────────────────────────────────────────────────

def _verify_classroom_ownership(supabase, classroom_id: str, teacher_id: str, *, is_admin: bool = False) -> dict:
    """Fetch the classroom and verify teacher_id matches. Admin bypasses ownership check. Returns the classroom row."""
    res = (
        supabase.table("classrooms")
        .select("teacher_id")
        .eq("id", classroom_id)
        .maybe_single()
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")
    if res.data["teacher_id"] != teacher_id and not is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your classroom")
    return res.data


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/", response_model=ClassroomResponse, status_code=201)
async def create_classroom(
    request: ClassroomCreate,
    teacher: dict = Depends(get_current_teacher),
):
    """Creates a new classroom. Auto-generates class_code and section-based class_name if omitted.

    Validates that each grade can only have one classroom per section.
    Example: Grade 3 can have one 3A, one 3B, one 3C, but NOT two 3A classrooms.

    ADMIN ONLY: Only admin users can create classrooms.
    """
    check_admin(teacher)
    supabase = get_supabase_admin()

    # Auto-generate class_name if not provided: "Grade X - Section Y"
    class_name = request.class_name or f"Grade {request.grade_level} - Section {request.section}"

    # Validate: Check if this teacher already has a classroom with this grade + class_name combination
    existing_check = (
        supabase.table("classrooms")
        .select("id, class_name, grade_level")
        .eq("teacher_id", teacher["id"])
        .eq("grade_level", request.grade_level)
        .eq("class_name", class_name)
        .execute()
    )

    if existing_check.data and len(existing_check.data) > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"You already have a '{class_name}' classroom in Grade {request.grade_level}. Each section can only exist once per grade."
        )

    # Generate memorable class code with retry for uniqueness
    max_retries = 10
    result = None
    for attempt in range(max_retries):
        # Generate a new memorable code
        class_code = generate_memorable_code(request.grade_level, class_name)

        # Check if this code already exists
        code_check = (
            supabase.table("classrooms")
            .select("id")
            .eq("class_code", class_code)
            .execute()
        )

        # If code doesn't exist, try to insert
        if not code_check.data:
            try:
                result = (
                    supabase.table("classrooms")
                    .insert({
                        "teacher_id": teacher["id"],
                        "class_name": class_name,
                        "grade_level": request.grade_level,
                        "section": request.section,
                        "class_code": class_code,
                    })
                    .execute()
                )
                if result.data:
                    break  # Success, exit retry loop
            except Exception:
                # Continue to next attempt if insert fails
                continue

    if not result or not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create classroom. Could not generate a unique class code.",
        )

    classroom_id = result.data[0]["id"]

    # Auto-generate 30 weekly syllabus slots
    default_topics = [f"Week {i}: Topic {i}" for i in range(1, 31)]
    syllabus_rows = [
        {
            "classroom_id": classroom_id,
            "week_number": i,
            "topic_title": default_topics[i - 1],
            "status": "active" if i == 1 else "locked",
        }
        for i in range(1, 31)
    ]
    supabase.table("classroom_syllabus").insert(syllabus_rows).execute()

    return result.data[0]


@router.get("/", response_model=List[ClassroomResponse])
async def list_classrooms(teacher: dict = Depends(get_current_teacher)):
    """Returns all classrooms (global teacher access), newest first."""
    supabase = get_supabase_admin()
    query = supabase.table("classrooms").select("*")
    result = query.order("created_at", desc=True).execute()
    return result.data or []


@router.get("/{classroom_id}", response_model=ClassroomDetail)
async def get_classroom(
    classroom_id: str,
    teacher: dict = Depends(get_current_teacher),
):
    """Returns classroom details plus the full student roster (global teacher access)."""
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

    # Global teacher access - no ownership check needed
    students_res = (
        supabase.table("students")
        .select("id, student_name, avatar_url, secret_pin, roll_number, email, avatar_style, theme_color, points, father_name")
        .eq("classroom_id", classroom_id)
        .execute()
    )
    return {**classroom_res.data, "students": students_res.data or []}


@router.delete("/{classroom_id}", status_code=204)
async def delete_classroom(
    classroom_id: str,
    teacher: dict = Depends(get_current_teacher),
):
    """
    Deletes a classroom. Protection: classroom must have 0 students.
    Returns 400 Bad Request if students are present.

    ADMIN ONLY: Only admin users can delete classrooms.
    """
    check_admin(teacher)
    supabase = get_supabase_admin()

    # Check if classroom has students
    students_res = (
        supabase.table("students")
        .select("id")
        .eq("classroom_id", classroom_id)
        .execute()
    )
    student_count = len(students_res.data or [])
    if student_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete classroom with {student_count} student(s). Remove all students first.",
        )

    # Delete classroom
    result = (
        supabase.table("classrooms")
        .delete()
        .eq("id", classroom_id)
        .execute()
    )
    if result.data is not None and len(result.data) == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")


@router.patch("/{classroom_id}", response_model=ClassroomResponse)
async def update_classroom(
    classroom_id: str,
    request: ClassroomUpdate,
    teacher: dict = Depends(get_current_teacher),
):
    """Update classroom settings (e.g., class_name).

    ADMIN ONLY: Only admin users can update classrooms.
    """
    check_admin(teacher)
    supabase = get_supabase_admin()

    # Build update payload with only non-None fields
    update_data = {}
    if request.class_name is not None:
        update_data["class_name"] = request.class_name

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
    """Bulk-creates student ghost profiles with randomly assigned avatars.

    ADMIN ONLY: Only admin users can create students.
    """
    check_admin(teacher)
    supabase = get_supabase_admin()

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
            "avatar_style": "adventurer",
            "theme_color": "#6366f1",
        }
        for name in names
    ]
    result = supabase.table("students").insert(rows).execute()
    added = len(result.data) if result.data else len(rows)
    return {"added": added}


@router.post("/{classroom_id}/students/bulk-v2")
async def bulk_add_students_v2(
    classroom_id: str,
    request: StudentBulkCreateV2,
    teacher: dict = Depends(get_current_teacher),
):
    """Bulk-creates student profiles with name, roll_number, and email fields.

    ADMIN ONLY: Only admin users can create students.
    """
    check_admin(teacher)
    supabase = get_supabase_admin()

    students = [s for s in request.students if s.student_name and s.student_name.strip()]
    if not students:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No valid student data provided",
        )

    rows = [
        {
            "classroom_id": classroom_id,
            "student_name": s.student_name.strip(),
            "roll_number": s.roll_number.strip() if s.roll_number else None,
            "email": s.email.strip() if s.email else None,
            "avatar_url": f"https://api.dicebear.com/8.x/adventurer/svg?seed={s.student_name}",
            "avatar_style": "adventurer",
            "theme_color": "#6366f1",
        }
        for s in students
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
    """Removes a student ghost profile from the roster.

    ADMIN ONLY: Only admin users can delete students.
    """
    check_admin(teacher)
    supabase = get_supabase_admin()

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
    """Update student identity fields (name, roll_number, email).

    ADMIN ONLY: Only admin users can update students.
    """
    check_admin(teacher)
    supabase = get_supabase_admin()

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


# ---------------------------------------------------------------------------
# Active Topics endpoints
# ---------------------------------------------------------------------------

class ActiveTopicsUpdate(BaseModel):
    topic_ids: list[int]


class ActiveTopicsResponse(BaseModel):
    active_count: int


async def get_active_topics(
    classroom_id: str,
    grade_level: int,
    supabase,
) -> list[dict]:
    """
    Returns active topics for a classroom.
    If no rows in classroom_active_topics → returns ALL topics for the grade (default all active).

    Grade-level filter: if grade_topic_selections has is_active=false for a topic,
    that topic is excluded even if it's active at the classroom level.
    """
    saved = (
        supabase.table("classroom_active_topics")
        .select("topic_id")
        .eq("classroom_id", classroom_id)
        .execute()
    )
    saved_ids = [row["topic_id"] for row in (saved.data or [])]

    if saved_ids:
        resp = (
            supabase.table("snc_topics")
            .select("id, grade_level, skill, topic_name")
            .in_("id", saved_ids)
            .order("id")
            .execute()
        )
    else:
        resp = (
            supabase.table("snc_topics")
            .select("id, grade_level, skill, topic_name")
            .eq("grade_level", grade_level)
            .order("id")
            .execute()
        )
    topics = resp.data or []

    # Apply grade-level deactivation filter
    grade_sel_resp = (
        supabase.table("grade_topic_selections")
        .select("topic_id, is_active")
        .eq("grade_level", grade_level)
        .eq("is_active", False)
        .execute()
    )
    disabled_ids = {row["topic_id"] for row in (grade_sel_resp.data or [])}

    if disabled_ids:
        topics = [t for t in topics if t["id"] not in disabled_ids]

    return topics


async def save_active_topics(
    classroom_id: str,
    topic_ids: list[int],
    supabase,
) -> dict:
    """Delete-then-insert replacement of active topic selections."""
    supabase.table("classroom_active_topics").delete().eq(
        "classroom_id", classroom_id
    ).execute()

    if topic_ids:
        rows = [{"classroom_id": classroom_id, "topic_id": tid} for tid in topic_ids]
        supabase.table("classroom_active_topics").insert(rows).execute()

    return {"active_count": len(topic_ids)}


@router.get("/{classroom_id}/active-topics", response_model=list[SncTopicOut])
async def get_classroom_active_topics(
    classroom_id: str,
    teacher: dict = Depends(get_current_teacher),
):
    """
    Returns active SNC topics for this classroom.
    If no topics have been saved, returns ALL topics for the classroom's grade (default all active).
    """
    supabase = get_supabase_admin()
    _verify_classroom_ownership(supabase, classroom_id, teacher["id"], is_admin=teacher.get("is_admin", False))

    classroom_resp = (
        supabase.table("classrooms")
        .select("grade_level")
        .eq("id", classroom_id)
        .maybe_single()
        .execute()
    )
    if not classroom_resp.data:
        raise HTTPException(status_code=404, detail="Classroom not found")

    grade_level: int = classroom_resp.data["grade_level"]
    return await get_active_topics(classroom_id, grade_level, supabase)


@router.put("/{classroom_id}/active-topics", response_model=ActiveTopicsResponse)
async def update_classroom_active_topics(
    classroom_id: str,
    body: ActiveTopicsUpdate,
    teacher: dict = Depends(get_current_teacher),
):
    """
    Replaces all active topic selections for this classroom.
    Send topic_ids: [] to reset to default (all active).

    ADMIN ONLY: Only admin users can update topic selections.
    """
    check_admin(teacher)
    supabase = get_supabase_admin()
    return await save_active_topics(classroom_id, body.topic_ids, supabase)


@router.get("/{classroom_id}/topics-by-skill", response_model=TopicsBySkillResponse)
async def get_topics_grouped_by_skill(
    classroom_id: str,
    teacher: dict = Depends(get_current_teacher),
):
    """
    Returns topics organized by LSRW skills for the classroom's grade.
    Each skill has 4-5 topics. By default, all topics are active.
    Teachers can select/deselect topics under each skill.
    """
    supabase = get_supabase_admin()
    _verify_classroom_ownership(supabase, classroom_id, teacher["id"], is_admin=teacher.get("is_admin", False))

    # Get classroom grade level
    classroom_resp = (
        supabase.table("classrooms")
        .select("grade_level")
        .eq("id", classroom_id)
        .maybe_single()
        .execute()
    )
    if not classroom_resp.data:
        raise HTTPException(status_code=404, detail="Classroom not found")

    grade_level: int = classroom_resp.data["grade_level"]

    # Get all topics for this grade
    topics_resp = (
        supabase.table("snc_topics")
        .select("id, grade_level, skill, topic_name")
        .eq("grade_level", grade_level)
        .order("skill, id")
        .execute()
    )
    all_topics = topics_resp.data or []

    # Get grade-level activation status
    grade_sel_resp = (
        supabase.table("grade_topic_selections")
        .select("topic_id, is_active")
        .eq("grade_level", grade_level)
        .execute()
    )
    grade_status_map = {row["topic_id"]: row["is_active"] for row in (grade_sel_resp.data or [])}

    # Get active topics for this classroom
    active_resp = (
        supabase.table("classroom_active_topics")
        .select("topic_id")
        .eq("classroom_id", classroom_id)
        .execute()
    )
    active_ids = {row["topic_id"] for row in (active_resp.data or [])}

    # If no active topics saved, all globally active topics are active by default
    if not active_ids:
        active_ids = {t["id"] for t in all_topics if grade_status_map.get(t["id"], True)}

    # Group by skill
    from collections import defaultdict
    by_skill = defaultdict(list)
    for topic in all_topics:
        is_globally_active = grade_status_map.get(topic["id"], True)
        topic_out = SncTopicOut(
            id=topic["id"],
            grade_level=topic["grade_level"],
            skill=topic["skill"],
            topic_name=topic["topic_name"],
            is_globally_active=is_globally_active
        )
        by_skill[topic["skill"]].append(topic_out)

    # Build response
    skills = []
    for skill in ["listening", "speaking", "reading", "writing"]:
        if skill in by_skill:
            skills.append(SkillTopicsGroup(skill=skill, topics=by_skill[skill]))

    return TopicsBySkillResponse(grade_level=grade_level, skills=skills)


# ---------------------------------------------------------------------------
# Syllabus (Pacing Calendar) endpoints
# ---------------------------------------------------------------------------

class SyllabusWeekResponse(BaseModel):
    id: str
    week_number: int
    topic_title: str
    status: Literal["locked", "active", "completed"]


class SyllabusListResponse(BaseModel):
    weeks: list[SyllabusWeekResponse]


@router.get("/{classroom_id}/syllabus", response_model=SyllabusListResponse)
async def get_syllabus(
    classroom_id: str,
    teacher: dict = Depends(get_current_teacher),
):
    """Returns the 30-week pacing calendar for a classroom (global teacher access)."""
    supabase = get_supabase_admin()
    # Global teacher access - no ownership check needed

    result = (
        supabase.table("classroom_syllabus")
        .select("id, week_number, topic_title, status")
        .eq("classroom_id", classroom_id)
        .order("week_number")
        .execute()
    )
    return {"weeks": result.data or []}


class UpdateWeekStatusRequest(BaseModel):
    status: Literal["locked", "active", "completed"]


@router.patch("/{classroom_id}/syllabus/{week_number}")
async def update_syllabus_week(
    classroom_id: str,
    week_number: int,
    request: UpdateWeekStatusRequest,
    teacher: dict = Depends(get_current_teacher),
):
    """Update the status of a specific week in the pacing calendar.

    ADMIN ONLY: Only admin users can update syllabus status.
    """
    check_admin(teacher)
    supabase = get_supabase_admin()

    result = (
        supabase.table("classroom_syllabus")
        .update({"status": request.status})
        .eq("classroom_id", classroom_id)
        .eq("week_number", week_number)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Week not found")
    return {"ok": True}
