"""
Feature 9 + 10: NLP Insight Generator + Teacher Dashboard data layer

Endpoints:
  GET /api/v1/evaluator/report/student/{student_id}
      → Generate NLP insight report for a specific student (teacher-protected).

  GET /api/v1/evaluator/report/classroom/{classroom_id}
      → Return a summary roster of all students with their interaction counts
        and accuracy rates (teacher-protected). No LLM call — pure DB aggregation.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.security import get_current_teacher
from app.core.supabase_client import get_supabase_admin
from app.agents.evaluator_agent.nlp_evaluator import (
    StudentInsightReport,
    evaluate_interactions,
)

router = APIRouter()


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------

class StudentSummary(BaseModel):
    student_id: str
    student_name: str
    avatar_url: str | None
    total_interactions: int
    mission_accuracy_pct: int   # 0-100


class ClassroomReportResponse(BaseModel):
    classroom_id: str
    grade_level: int
    students: list[StudentSummary]


# ---------------------------------------------------------------------------
# GET /report/student/{student_id}
# ---------------------------------------------------------------------------

@router.get(
    "/report/student/{student_id}",
    response_model=StudentInsightReport,
    summary="NLP insight report for one student (teacher only)",
)
async def student_report(
    student_id: str,
    teacher: dict = Depends(get_current_teacher),
):
    """
    Generate an AI-powered NLP insight report for a student.

    - Fetches the student's last 30 interactions from student_interactions.
    - Computes engagement stats, mission accuracy, and qualitative LLM insights.
    - Teacher authentication required (Supabase GoTrue JWT).
    - The teacher must own the classroom the student belongs to (verified server-side).
    """
    supabase = get_supabase_admin()
    teacher_id: str = teacher["id"]

    # ------------------------------------------------------------------
    # Step 1: Verify the student belongs to one of this teacher's classrooms
    # ------------------------------------------------------------------
    student_resp = (
        supabase.table("students")
        .select("classroom_id, student_name")
        .eq("id", student_id)
        .maybe_single()
        .execute()
    )
    if not student_resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    classroom_id = student_resp.data["classroom_id"]

    classroom_resp = (
        supabase.table("classrooms")
        .select("grade_level, teacher_id")
        .eq("id", classroom_id)
        .maybe_single()
        .execute()
    )
    if not classroom_resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")

    if str(classroom_resp.data["teacher_id"]) != str(teacher_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    grade_level: int = classroom_resp.data["grade_level"]

    # ------------------------------------------------------------------
    # Step 2: Generate insight report
    # ------------------------------------------------------------------
    return await evaluate_interactions(
        student_id=student_id,
        grade_level=grade_level,
        supabase_admin_client=supabase,
    )


# ---------------------------------------------------------------------------
# GET /report/classroom/{classroom_id}
# ---------------------------------------------------------------------------

@router.get(
    "/report/classroom/{classroom_id}",
    response_model=ClassroomReportResponse,
    summary="Classroom-level interaction summary (teacher only)",
)
async def classroom_report(
    classroom_id: str,
    teacher: dict = Depends(get_current_teacher),
):
    """
    Return a summary roster for the classroom: each student with total_interactions
    and mission_accuracy_pct. No LLM call — pure DB aggregation for fast loading.

    Teacher authentication required; the teacher must own the classroom.
    """
    supabase = get_supabase_admin()
    teacher_id: str = teacher["id"]

    # ------------------------------------------------------------------
    # Step 1: Verify classroom ownership
    # ------------------------------------------------------------------
    classroom_resp = (
        supabase.table("classrooms")
        .select("grade_level, teacher_id")
        .eq("id", classroom_id)
        .maybe_single()
        .execute()
    )
    if not classroom_resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")
    if str(classroom_resp.data["teacher_id"]) != str(teacher_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    grade_level: int = classroom_resp.data["grade_level"]

    # ------------------------------------------------------------------
    # Step 2: Fetch all students in the classroom
    # ------------------------------------------------------------------
    students_resp = (
        supabase.table("students")
        .select("id, student_name, avatar_url")
        .eq("classroom_id", classroom_id)
        .execute()
    )
    student_rows = students_resp.data or []

    # ------------------------------------------------------------------
    # Step 3: Fetch interaction counts + accuracy for each student
    # ------------------------------------------------------------------
    summaries: list[StudentSummary] = []
    for s in student_rows:
        sid = s["id"]
        interactions_resp = (
            supabase.table("student_interactions")
            .select("interaction_type, correct")
            .eq("student_id", sid)
            .execute()
        )
        interactions = interactions_resp.data or []
        total = len(interactions)
        missions = [r for r in interactions if r["interaction_type"] in ("mission_mc", "mission_fill")]
        correct = sum(1 for r in missions if r.get("correct") is True)
        accuracy = round((correct / len(missions)) * 100) if missions else 0

        summaries.append(
            StudentSummary(
                student_id=sid,
                student_name=s["student_name"],
                avatar_url=s.get("avatar_url"),
                total_interactions=total,
                mission_accuracy_pct=accuracy,
            )
        )

    return ClassroomReportResponse(
        classroom_id=classroom_id,
        grade_level=grade_level,
        students=summaries,
    )


# ---------------------------------------------------------------------------
# GET /report/teacher
# ---------------------------------------------------------------------------

@router.get(
    "/report/teacher",
    summary="Global teacher analytics: all classrooms with student stats",
)
async def get_teacher_report(teacher: dict = Depends(get_current_teacher)):
    """
    Returns all classrooms for the teacher with per-student interaction stats.
    Used by the global analytics page (By Student / By Grade / By Section views).
    """
    supabase = get_supabase_admin()

    # 1. Fetch all teacher classrooms
    cls_res = (
        supabase.table("classrooms")
        .select("id, class_name, grade_level")
        .eq("teacher_id", teacher["id"])
        .execute()
    )
    classrooms = cls_res.data or []
    if not classrooms:
        return {"classrooms": []}

    classroom_ids = [c["id"] for c in classrooms]

    # 2. Fetch all students in these classrooms
    stu_res = (
        supabase.table("students")
        .select("id, student_name, avatar_url, classroom_id")
        .in_("classroom_id", classroom_ids)
        .execute()
    )
    students = stu_res.data or []

    # 3. Fetch all interactions for these students
    student_ids = [s["id"] for s in students]
    if student_ids:
        int_res = (
            supabase.table("student_interactions")
            .select("student_id, is_correct")
            .in_("student_id", student_ids)
            .execute()
        )
        interactions = int_res.data or []
    else:
        interactions = []

    # 4. Aggregate interaction stats per student
    from collections import defaultdict
    stats: dict[str, dict] = defaultdict(lambda: {"total": 0, "correct": 0})
    for row in interactions:
        sid = row["student_id"]
        stats[sid]["total"] += 1
        if row["is_correct"]:
            stats[sid]["correct"] += 1

    def accuracy(sid: str) -> int:
        s = stats[sid]
        if s["total"] == 0:
            return 0
        return round(s["correct"] / s["total"] * 100)

    # 5. Group students by classroom
    stu_by_cls: dict[str, list] = defaultdict(list)
    for s in students:
        stu_by_cls[s["classroom_id"]].append({
            "student_id": s["id"],
            "student_name": s["student_name"],
            "avatar_url": s["avatar_url"],
            "total_interactions": stats[s["id"]]["total"],
            "mission_accuracy_pct": accuracy(s["id"]),
        })

    # 6. Build result
    result_classrooms = [
        {
            "classroom_id": c["id"],
            "class_name": c["class_name"],
            "grade_level": c["grade_level"],
            "students": stu_by_cls[c["id"]],
        }
        for c in classrooms
    ]
    return {"classrooms": result_classrooms}
