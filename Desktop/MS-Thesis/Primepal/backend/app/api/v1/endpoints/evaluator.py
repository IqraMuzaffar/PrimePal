"""
Feature 9 + 10: NLP Insight Generator + Teacher Dashboard data layer

Endpoints:
  GET /api/v1/evaluator/report/student/{student_id}
      → Generate NLP insight report for a specific student (teacher-protected).

  GET /api/v1/evaluator/report/classroom/{classroom_id}
      → Return a summary roster of all students with their interaction counts
        and accuracy rates (teacher-protected). No LLM call — pure DB aggregation.

  GET /api/v1/evaluator/dashboard-stats
      → Return aggregate statistics for the teacher's dashboard: total students,
        total interactions, and average accuracy across all their classrooms.
        Teacher-protected, computed from real database data.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
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
    roll_number: str | None = None
    email: str | None = None
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
        .select("id, student_name, avatar_url, roll_number, email")
        .eq("classroom_id", classroom_id)
        .execute()
    )
    student_rows = students_resp.data or []

    # ------------------------------------------------------------------
    # Step 3: Batch-fetch all interactions for classroom students
    # ------------------------------------------------------------------
    student_ids = [s["id"] for s in student_rows]
    all_interactions: list[dict] = []
    if student_ids:
        interactions_resp = (
            supabase.table("student_interactions")
            .select("student_id, interaction_type, correct")
            .in_("student_id", student_ids)
            .execute()
        )
        all_interactions = interactions_resp.data or []

    interactions_by_student: dict[str, list[dict]] = {}
    for row in all_interactions:
        interactions_by_student.setdefault(row["student_id"], []).append(row)

    summaries: list[StudentSummary] = []
    for s in student_rows:
        sid = s["id"]
        interactions = interactions_by_student.get(sid, [])
        total = len(interactions)
        missions = [r for r in interactions if r["interaction_type"] in ("mission_mc", "mission_fill")]
        correct = sum(1 for r in missions if r.get("correct") is True)
        accuracy = round((correct / len(missions)) * 100) if missions else 0

        summaries.append(
            StudentSummary(
                student_id=sid,
                student_name=s["student_name"],
                avatar_url=s.get("avatar_url"),
                roll_number=s.get("roll_number"),
                email=s.get("email"),
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
async def get_teacher_report(
    teacher: dict = Depends(get_current_teacher),
    grade_level: int | None = Query(None, description="Filter by grade level"),
):
    """
    Returns all classrooms for the teacher with per-student interaction stats.
    Used by the global analytics page (By Student / By Grade / By Section views).

    Optional filter:
    - grade_level: Narrow to classrooms of a specific grade
    """
    supabase = get_supabase_admin()

    # 1. Fetch all teacher classrooms
    cls_query = (
        supabase.table("classrooms")
        .select("id, class_name, grade_level")
        .eq("teacher_id", teacher["id"])
    )
    if grade_level is not None:
        cls_query = cls_query.eq("grade_level", grade_level)
    cls_res = cls_query.execute()
    classrooms = cls_res.data or []
    if not classrooms:
        return {"classrooms": []}

    classroom_ids = [c["id"] for c in classrooms]

    # 2. Fetch all students in these classrooms
    stu_res = (
        supabase.table("students")
        .select("id, student_name, avatar_url, classroom_id, roll_number, email")
        .in_("classroom_id", classroom_ids)
        .execute()
    )
    students = stu_res.data or []

    # 3. Fetch all interactions for these students
    student_ids = [s["id"] for s in students]
    if student_ids:
        int_res = (
            supabase.table("student_interactions")
            .select("student_id, correct")
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
        if row["correct"]:
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
            "roll_number": s.get("roll_number"),
            "email": s.get("email"),
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


# ---------------------------------------------------------------------------
# GET /dashboard-stats
# ---------------------------------------------------------------------------

class DashboardStatsResponse(BaseModel):
    total_students: int
    total_interactions: int
    avg_accuracy: float
    active_this_week: int  # students with any interaction in the last 7 days


@router.get(
    "/dashboard-stats",
    response_model=DashboardStatsResponse,
    summary="Teacher dashboard statistics (real data)",
)
async def get_dashboard_stats(
    teacher: dict = Depends(get_current_teacher),
    grade_level: int | None = Query(None, description="Filter by grade level"),
    pillar: str | None = Query(None, description="Filter interactions by pillar (reading/writing/listening/speaking)"),
):
    """
    Returns aggregate statistics for the teacher's dashboard:
    - total_students: Count of all students in this teacher's classrooms
    - total_interactions: Count of all student interactions in this teacher's classrooms
    - avg_accuracy: Percentage of correct interactions across all students
    - active_this_week: Count of students with at least one interaction in the last 7 days

    Optional filters:
    - grade_level: Narrow to classrooms of a specific grade
    - pillar: Narrow interactions to a specific skill pillar

    Teacher authentication required (Supabase GoTrue JWT).
    """
    from datetime import datetime, timedelta, timezone
    supabase = get_supabase_admin()
    teacher_id: str = teacher["id"]

    cls_query = supabase.table("classrooms").select("id").eq("teacher_id", teacher_id)
    if grade_level is not None:
        cls_query = cls_query.eq("grade_level", grade_level)
    cls_res = cls_query.execute()
    classrooms = cls_res.data or []

    if not classrooms:
        return DashboardStatsResponse(
            total_students=0,
            total_interactions=0,
            avg_accuracy=0.0,
            active_this_week=0,
        )

    classroom_ids = [c["id"] for c in classrooms]

    stu_res = (
        supabase.table("students")
        .select("id")
        .in_("classroom_id", classroom_ids)
        .execute()
    )
    students = stu_res.data or []
    total_students = len(students)

    if students:
        student_ids = [s["id"] for s in students]
        int_query = (
            supabase.table("student_interactions")
            .select("student_id, correct")
            .in_("student_id", student_ids)
        )
        if pillar:
            int_query = int_query.eq("pillar", pillar)
        int_res = int_query.execute()
        interactions = int_res.data or []
        total_interactions = len(interactions)

        if total_interactions > 0:
            correct_count = sum(1 for r in interactions if r.get("correct") is True)
            avg_accuracy = round((correct_count / total_interactions) * 100, 2)
        else:
            avg_accuracy = 0.0

        # Active this week: distinct students with any interaction in last 7 days
        seven_days_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
        week_query = (
            supabase.table("student_interactions")
            .select("student_id")
            .in_("student_id", student_ids)
            .gte("created_at", seven_days_ago)
        )
        if pillar:
            week_query = week_query.eq("pillar", pillar)
        week_res = week_query.execute()
        active_this_week = len({r["student_id"] for r in (week_res.data or [])})
    else:
        total_interactions = 0
        avg_accuracy = 0.0
        active_this_week = 0

    return DashboardStatsResponse(
        total_students=total_students,
        total_interactions=total_interactions,
        avg_accuracy=avg_accuracy,
        active_this_week=active_this_week,
    )


# ---------------------------------------------------------------------------
# GET /skill-accuracy  — per-pillar accuracy breakdown
# ---------------------------------------------------------------------------

class SkillAccuracyResponse(BaseModel):
    reading: float
    writing: float
    listening: float
    speaking: float
    active_today: int


@router.get(
    "/skill-accuracy",
    response_model=SkillAccuracyResponse,
    summary="Per-skill accuracy breakdown (teacher only)",
)
async def get_skill_accuracy(
    teacher: dict = Depends(get_current_teacher),
    grade_level: int | None = Query(None, description="Filter by grade level"),
):
    """
    Returns accuracy percentage per skill pillar (reading, writing, listening,
    speaking) and the count of students active today (with any interaction today).

    Optional filter:
    - grade_level: Narrow to classrooms of a specific grade
    """
    from datetime import datetime, timedelta, timezone
    from collections import defaultdict

    supabase = get_supabase_admin()
    teacher_id: str = teacher["id"]

    cls_query = supabase.table("classrooms").select("id").eq("teacher_id", teacher_id)
    if grade_level is not None:
        cls_query = cls_query.eq("grade_level", grade_level)
    cls_res = cls_query.execute()
    classrooms = cls_res.data or []

    if not classrooms:
        return SkillAccuracyResponse(
            reading=0.0, writing=0.0, listening=0.0, speaking=0.0, active_today=0,
        )

    classroom_ids = [c["id"] for c in classrooms]

    stu_res = (
        supabase.table("students")
        .select("id")
        .in_("classroom_id", classroom_ids)
        .execute()
    )
    students = stu_res.data or []
    if not students:
        return SkillAccuracyResponse(
            reading=0.0, writing=0.0, listening=0.0, speaking=0.0, active_today=0,
        )

    student_ids = [s["id"] for s in students]

    int_res = (
        supabase.table("student_interactions")
        .select("student_id, pillar, correct, created_at")
        .in_("student_id", student_ids)
        .execute()
    )
    interactions = int_res.data or []

    # Aggregate per pillar
    pillar_stats: dict[str, dict] = defaultdict(lambda: {"total": 0, "correct": 0})
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    active_today_ids: set[str] = set()

    for row in interactions:
        p = row.get("pillar")
        if p:
            pillar_stats[p]["total"] += 1
            if row.get("correct") is True:
                pillar_stats[p]["correct"] += 1
        if row.get("created_at", "") >= today_start:
            active_today_ids.add(row["student_id"])

    def pct(pillar_name: str) -> float:
        s = pillar_stats.get(pillar_name)
        if not s or s["total"] == 0:
            return 0.0
        return round(s["correct"] / s["total"] * 100, 2)

    return SkillAccuracyResponse(
        reading=pct("reading"),
        writing=pct("writing"),
        listening=pct("listening"),
        speaking=pct("speaking"),
        active_today=len(active_today_ids),
    )


# ---------------------------------------------------------------------------
# GET /students  — global student directory with stats
# ---------------------------------------------------------------------------

class StudentWithStats(BaseModel):
    student_id: str
    student_name: str
    roll_number: str | None
    avatar_url: str | None
    classroom_id: str
    classroom_name: str
    grade_level: int
    total_points: int
    total_interactions: int
    mission_accuracy_pct: int  # 0-100
    active_this_week: bool


class StudentsListResponse(BaseModel):
    students: list[StudentWithStats]
    total_count: int


@router.get(
    "/students",
    response_model=StudentsListResponse,
    summary="All students across teacher's classrooms with stats",
)
async def list_all_students(
    teacher: dict = Depends(get_current_teacher),
    grade_level: int | None = Query(None, description="Filter by grade level"),
    pillar: str | None = Query(None, description="Filter accuracy by pillar (reading/writing/listening/speaking)"),
    search: str | None = Query(None, description="Search by student name or roll number"),
):
    """
    Returns every student across all the teacher's classrooms with aggregated
    stats: total_points, total_interactions, mission_accuracy_pct, active_this_week.
    Used by the global Students directory and At-Risk widget.

    Optional filters:
    - grade_level: Narrow to classrooms of a specific grade
    - pillar: Compute accuracy only from that pillar's interactions
    - search: Filter students by name (case-insensitive) or roll_number
    """
    from datetime import datetime, timedelta, timezone
    from collections import defaultdict

    supabase = get_supabase_admin()
    teacher_id: str = teacher["id"]

    # 1. Fetch teacher's classrooms
    cls_query = supabase.table("classrooms").select("id, class_name, grade_level").eq("teacher_id", teacher_id)
    if grade_level is not None:
        cls_query = cls_query.eq("grade_level", grade_level)
    cls_res = cls_query.execute()
    classrooms = cls_res.data or []
    if not classrooms:
        return StudentsListResponse(students=[], total_count=0)

    classroom_map = {c["id"]: c for c in classrooms}
    classroom_ids = list(classroom_map.keys())

    # 2. Fetch all students
    stu_query = (
        supabase.table("students")
        .select("id, student_name, roll_number, avatar_url, classroom_id, points")
        .in_("classroom_id", classroom_ids)
        .order("student_name")
    )
    stu_res = stu_query.execute()
    student_rows = stu_res.data or []

    # 2b. Apply search filter in-memory (Supabase JS client doesn't support OR + ILIKE easily)
    if search:
        search_lower = search.lower()
        student_rows = [
            s for s in student_rows
            if search_lower in s["student_name"].lower()
            or (s.get("roll_number") and search_lower in s["roll_number"].lower())
        ]

    if not student_rows:
        return StudentsListResponse(students=[], total_count=0)

    student_ids = [s["id"] for s in student_rows]

    # 3. Fetch all interactions
    int_query = (
        supabase.table("student_interactions")
        .select("student_id, interaction_type, correct, created_at, pillar")
        .in_("student_id", student_ids)
    )
    int_res = int_query.execute()
    all_interactions = int_res.data or []

    seven_days_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()

    # 4. Aggregate per student
    stats: dict[str, dict] = defaultdict(lambda: {"total": 0, "mission_total": 0, "mission_correct": 0, "active": False})
    for row in all_interactions:
        sid = row["student_id"]
        stats[sid]["total"] += 1
        # When pillar filter is set, only count matching interactions for accuracy
        if pillar and row.get("pillar") != pillar:
            if row.get("created_at", "") >= seven_days_ago:
                stats[sid]["active"] = True
            continue
        if row["interaction_type"] in ("mission_mc", "mission_fill"):
            stats[sid]["mission_total"] += 1
            if row.get("correct") is True:
                stats[sid]["mission_correct"] += 1
        if row.get("created_at", "") >= seven_days_ago:
            stats[sid]["active"] = True

    # 5. Build result
    result: list[StudentWithStats] = []
    for s in student_rows:
        sid = s["id"]
        st = stats[sid]
        mt = st["mission_total"]
        accuracy = round(st["mission_correct"] / mt * 100) if mt > 0 else 0
        cls = classroom_map[s["classroom_id"]]
        result.append(StudentWithStats(
            student_id=sid,
            student_name=s["student_name"],
            roll_number=s.get("roll_number"),
            avatar_url=s.get("avatar_url"),
            classroom_id=s["classroom_id"],
            classroom_name=cls["class_name"],
            grade_level=cls["grade_level"],
            total_points=s.get("points") or 0,
            total_interactions=st["total"],
            mission_accuracy_pct=accuracy,
            active_this_week=st["active"],
        ))

    return StudentsListResponse(students=result, total_count=len(result))


# ---------------------------------------------------------------------------
# GET /report/student/{student_id}/detailed  — full pillar + AI report
# ---------------------------------------------------------------------------

class PillarStat(BaseModel):
    pillar: str
    total: int
    correct: int
    accuracy_pct: int  # 0-100


class StudentDetailedReport(BaseModel):
    student_id: str
    student_name: str
    roll_number: str | None
    avatar_url: str | None
    classroom_name: str
    grade_level: int
    total_points: int
    total_questions: int
    overall_accuracy_pct: int
    pillar_stats: list[PillarStat]
    # AI narrative (from nlp_evaluator)
    engagement_level: str
    strengths: list[str]
    areas_for_improvement: list[str]
    recommended_topics: list[str]
    teacher_note: str


@router.get(
    "/report/student/{student_id}/detailed",
    response_model=StudentDetailedReport,
    summary="Full student report: pillar stats + AI insights (teacher only)",
)
async def get_student_detailed_report(
    student_id: str,
    teacher: dict = Depends(get_current_teacher),
):
    """
    Returns a complete student report card:
    - Identity: name, roll number, classroom, grade level, total points
    - Overall stats: total questions, overall accuracy
    - Per-pillar breakdown: reading / writing / listening / speaking counts + accuracy
    - AI narrative: engagement level, strengths, improvements, teacher note

    Teacher must own the student's classroom.
    """
    from collections import defaultdict

    supabase = get_supabase_admin()
    teacher_id: str = teacher["id"]

    # 1. Verify ownership
    student_resp = (
        supabase.table("students")
        .select("student_name, roll_number, avatar_url, classroom_id, points")
        .eq("id", student_id)
        .maybe_single()
        .execute()
    )
    if not student_resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    s = student_resp.data
    classroom_resp = (
        supabase.table("classrooms")
        .select("class_name, grade_level, teacher_id")
        .eq("id", s["classroom_id"])
        .maybe_single()
        .execute()
    )
    if not classroom_resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")
    if str(classroom_resp.data["teacher_id"]) != str(teacher_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    grade_level: int = classroom_resp.data["grade_level"]
    classroom_name: str = classroom_resp.data["class_name"]

    # 2. Fetch ALL interactions for this student (lifetime stats)
    int_resp = (
        supabase.table("student_interactions")
        .select("interaction_type, correct, pillar")
        .eq("student_id", student_id)
        .execute()
    )
    interactions = int_resp.data or []

    # 3. Per-pillar stats
    pillar_data: dict[str, dict] = defaultdict(lambda: {"total": 0, "correct": 0})
    total_questions = 0
    total_correct = 0

    for row in interactions:
        pillar = row.get("pillar")
        correct = row.get("correct") is True
        if pillar:
            pillar_data[pillar]["total"] += 1
            if correct:
                pillar_data[pillar]["correct"] += 1
        total_questions += 1
        if correct:
            total_correct += 1

    pillar_stats = [
        PillarStat(
            pillar=p,
            total=d["total"],
            correct=d["correct"],
            accuracy_pct=round(d["correct"] / d["total"] * 100) if d["total"] > 0 else 0,
        )
        for p, d in pillar_data.items()
    ]

    overall_accuracy_pct = round(total_correct / total_questions * 100) if total_questions > 0 else 0

    # 4. AI narrative
    ai_report = await evaluate_interactions(
        student_id=student_id,
        grade_level=grade_level,
        supabase_admin_client=supabase,
    )

    return StudentDetailedReport(
        student_id=student_id,
        student_name=s["student_name"],
        roll_number=s.get("roll_number"),
        avatar_url=s.get("avatar_url"),
        classroom_name=classroom_name,
        grade_level=grade_level,
        total_points=s.get("points") or 0,
        total_questions=total_questions,
        overall_accuracy_pct=overall_accuracy_pct,
        pillar_stats=pillar_stats,
        engagement_level=ai_report.engagement_level,
        strengths=ai_report.strengths,
        areas_for_improvement=ai_report.areas_for_improvement,
        recommended_topics=ai_report.recommended_topics,
        teacher_note=ai_report.teacher_note,
    )
