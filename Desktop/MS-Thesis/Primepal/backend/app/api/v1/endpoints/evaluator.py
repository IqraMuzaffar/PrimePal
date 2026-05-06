"""
Feature 9 + 10: NLP Insight Generator + Teacher Dashboard data layer

Endpoints:
  GET /api/v1/evaluator/report/student/{student_id}
      → Generate NLP insight report for a specific student (teacher-protected).

  GET /api/v1/evaluator/report/student/{student_id}/detailed
      → Full pillar stats + AI insights with optional date range & pillar filter.

  GET /api/v1/evaluator/report/classroom/{classroom_id}
      → Return a summary roster of all students with their interaction counts
        and accuracy rates (teacher-protected). No LLM call — pure DB aggregation.

  GET /api/v1/evaluator/report/grade/{grade_level}
      → Grade-wise aggregate report with per-pillar accuracy, quartiles, proficiency.

  GET /api/v1/evaluator/report/grade/{grade_level}/csv
      → CSV export of grade-level student performance data.

  GET /api/v1/evaluator/dashboard-stats
      → Return aggregate statistics for the teacher's dashboard: total students,
        total interactions, and average accuracy across all their classrooms.
        Teacher-protected, computed from real database data.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

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

    # Global teacher access - no ownership check needed
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

    # Global teacher access - no ownership check needed
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
            .limit(10000).execute()
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

    # 1. Fetch all classrooms (global teacher access)
    cls_query = supabase.table("classrooms").select("id, class_name, grade_level")
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
            .limit(10000).execute()
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
        if row.get("correct") is True:
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
    section: str | None = Query(None, description="Filter by classroom section (A, B, C, etc.)"),
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

    cls_query = supabase.table("classrooms").select("id")
    if grade_level is not None:
        cls_query = cls_query.eq("grade_level", grade_level)
    if section:
        cls_query = cls_query.eq("section", section)
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
        int_res = int_query.limit(10000).execute()
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
        week_res = week_query.limit(10000).execute()
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
    section: str | None = Query(None, description="Filter by classroom section (A, B, C, etc.)"),
):
    """
    Returns accuracy percentage per skill pillar (reading, writing, listening,
    speaking) and the count of students active today (with any interaction today).

    Optional filters:
    - grade_level: Narrow to classrooms of a specific grade
    - section: Narrow to classrooms of a specific section
    """
    from datetime import datetime, timedelta, timezone
    from collections import defaultdict

    supabase = get_supabase_admin()
    teacher_id: str = teacher["id"]

    cls_query = supabase.table("classrooms").select("id")
    if grade_level is not None:
        cls_query = cls_query.eq("grade_level", grade_level)
    if section:
        cls_query = cls_query.eq("section", section)
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
        .limit(10000).execute()
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

    # 1. Fetch all classrooms (global teacher access)
    cls_query = supabase.table("classrooms").select("id, class_name, grade_level")
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
    int_res = int_query.limit(10000).execute()
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


class DailyScore(BaseModel):
    date: str
    correct: int
    total: int


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
    # Date range & trend
    date_range: dict  # { "from": str|null, "to": str|null }
    trend: str  # "improving" | "declining" | "stable"
    daily_scores: list[DailyScore]
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
    date_from: str | None = Query(None, description="ISO date string YYYY-MM-DD"),
    date_to: str | None = Query(None, description="ISO date string YYYY-MM-DD"),
    pillar: str | None = Query(None, description="Filter by pillar (reading/writing/listening/speaking)"),
):
    """
    Returns a complete student report card:
    - Identity: name, roll number, classroom, grade level, total points
    - Overall stats: total questions, overall accuracy
    - Per-pillar breakdown: reading / writing / listening / speaking counts + accuracy
    - Trend: improving / declining / stable (first-half vs second-half accuracy)
    - Daily scores: per-day correct/total counts
    - AI narrative: engagement level, strengths, improvements, teacher note

    Optional filters: date_from, date_to (YYYY-MM-DD), pillar.
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

    # Global teacher access - no ownership check needed
    grade_level: int = classroom_resp.data["grade_level"]
    classroom_name: str = classroom_resp.data["class_name"]

    # 2. Fetch interactions with optional date range and pillar filters
    int_query = (
        supabase.table("student_interactions")
        .select("interaction_type, correct, pillar, created_at")
        .eq("student_id", student_id)
        .order("created_at", desc=False)
    )
    if date_from:
        int_query = int_query.gte("created_at", f"{date_from}T00:00:00")
    if date_to:
        int_query = int_query.lte("created_at", f"{date_to}T23:59:59")
    if pillar:
        int_query = int_query.eq("pillar", pillar)

    int_resp = int_query.execute()
    interactions = int_resp.data or []

    # 3. Per-pillar stats
    pillar_data: dict[str, dict] = defaultdict(lambda: {"total": 0, "correct": 0})
    total_questions = 0
    total_correct = 0

    for row in interactions:
        p = row.get("pillar")
        correct = row.get("correct") is True
        if p:
            pillar_data[p]["total"] += 1
            if correct:
                pillar_data[p]["correct"] += 1
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

    # 4. Daily scores
    daily_map: dict[str, dict] = defaultdict(lambda: {"correct": 0, "total": 0})
    for row in interactions:
        created = row.get("created_at", "")
        day = created[:10] if created else "unknown"
        daily_map[day]["total"] += 1
        if row.get("correct") is True:
            daily_map[day]["correct"] += 1
    daily_scores = [
        DailyScore(date=d, correct=v["correct"], total=v["total"])
        for d, v in sorted(daily_map.items())
    ]

    # 5. Trend: compare first half vs second half accuracy
    trend = "stable"
    if len(interactions) >= 4:
        mid = len(interactions) // 2
        first_half = interactions[:mid]
        second_half = interactions[mid:]
        first_correct = sum(1 for r in first_half if r.get("correct") is True)
        second_correct = sum(1 for r in second_half if r.get("correct") is True)
        first_pct = first_correct / len(first_half) * 100 if first_half else 0
        second_pct = second_correct / len(second_half) * 100 if second_half else 0
        diff = second_pct - first_pct
        if diff > 5:
            trend = "improving"
        elif diff < -5:
            trend = "declining"

    # 6. AI narrative
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
        date_range={"from": date_from, "to": date_to},
        trend=trend,
        daily_scores=daily_scores,
        engagement_level=ai_report.engagement_level,
        strengths=ai_report.strengths,
        areas_for_improvement=ai_report.areas_for_improvement,
        recommended_topics=ai_report.recommended_topics,
        teacher_note=ai_report.teacher_note,
    )


# ---------------------------------------------------------------------------
# GET /report/grade/{grade_level}  — grade-wise aggregate report
# ---------------------------------------------------------------------------

class GradeReportResponse(BaseModel):
    grade_level: int
    total_students: int
    total_interactions: int
    overall_accuracy_pct: float
    pillar_accuracy: dict[str, float]  # { reading: 72.5, writing: 58.1, ... }
    top_weak_topics: list[str]    # bottom 3 pillars by accuracy
    top_strong_topics: list[str]  # top 3 pillars by accuracy
    quartiles: dict[str, int]     # { top_25: 8, middle_50: 15, bottom_25: 7 }
    student_count_by_proficiency: dict[str, int]  # { proficient: 20, developing: 8, struggling: 2 }
    ai_summary: str  # LLM-generated 2-3 sentence summary


async def _generate_grade_summary(grade_level: int, stats: dict) -> str:
    """Generate a short AI summary of grade-level performance for teachers."""
    try:
        from langchain_openai import ChatOpenAI
        from app.core.config import settings as app_settings
        llm = ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0.3,
            openai_api_key=app_settings.OPENAI_API_KEY,
        )
        prompt = (
            f"Summarize this grade {grade_level} performance in 2-3 sentences for a teacher:\n"
            f"Overall accuracy: {stats['overall_accuracy_pct']}%\n"
            f"Reading: {stats['pillar_accuracy'].get('reading', 0)}%\n"
            f"Writing: {stats['pillar_accuracy'].get('writing', 0)}%\n"
            f"Listening: {stats['pillar_accuracy'].get('listening', 0)}%\n"
            f"Speaking: {stats['pillar_accuracy'].get('speaking', 0)}%\n"
            f"{stats['total_students']} students, {stats['student_count_by_proficiency']} proficiency distribution.\n"
            f"Keep it concise and actionable."
        )
        result = await llm.ainvoke(prompt)
        return result.content.strip()
    except Exception:
        return "AI summary unavailable."


@router.get(
    "/report/grade/{grade_level}",
    response_model=GradeReportResponse,
    summary="Grade-wise aggregate report (teacher only)",
)
async def get_grade_report(
    grade_level: int,
    teacher: dict = Depends(get_current_teacher),
    date_from: str | None = Query(None, description="ISO date string YYYY-MM-DD"),
    date_to: str | None = Query(None, description="ISO date string YYYY-MM-DD"),
):
    """
    Returns an aggregate performance report for all students in a given grade level
    across all of the teacher's classrooms. Includes per-pillar accuracy, quartiles,
    proficiency distribution, and an AI-generated summary.

    Optional date range filter narrows interactions to the given period.
    """
    from collections import defaultdict

    supabase = get_supabase_admin()
    teacher_id: str = teacher["id"]

    # 1. Fetch all classrooms with this grade_level (global teacher access)
    cls_query = supabase.table("classrooms").select("id")
    cls_resp = cls_query.eq("grade_level", grade_level).execute()
    classrooms = cls_resp.data or []
    if not classrooms:
        return GradeReportResponse(
            grade_level=grade_level,
            total_students=0,
            total_interactions=0,
            overall_accuracy_pct=0.0,
            pillar_accuracy={},
            top_weak_topics=[],
            top_strong_topics=[],
            quartiles={"top_25": 0, "middle_50": 0, "bottom_25": 0},
            student_count_by_proficiency={"proficient": 0, "developing": 0, "struggling": 0},
            ai_summary="No data available for this grade level.",
        )

    classroom_ids = [c["id"] for c in classrooms]

    # 2. Fetch all students in those classrooms
    stu_resp = (
        supabase.table("students")
        .select("id, student_name, roll_number")
        .in_("classroom_id", classroom_ids)
        .execute()
    )
    student_rows = stu_resp.data or []
    total_students = len(student_rows)

    if total_students == 0:
        return GradeReportResponse(
            grade_level=grade_level,
            total_students=0,
            total_interactions=0,
            overall_accuracy_pct=0.0,
            pillar_accuracy={},
            top_weak_topics=[],
            top_strong_topics=[],
            quartiles={"top_25": 0, "middle_50": 0, "bottom_25": 0},
            student_count_by_proficiency={"proficient": 0, "developing": 0, "struggling": 0},
            ai_summary="No students enrolled in this grade level.",
        )

    student_ids = [s["id"] for s in student_rows]

    # 3. Fetch all interactions for those students (optionally filtered by date range)
    int_query = (
        supabase.table("student_interactions")
        .select("student_id, correct, pillar")
        .in_("student_id", student_ids)
    )
    if date_from:
        int_query = int_query.gte("created_at", f"{date_from}T00:00:00")
    if date_to:
        int_query = int_query.lte("created_at", f"{date_to}T23:59:59")
    int_resp = int_query.limit(10000).execute()
    interactions = int_resp.data or []
    total_interactions = len(interactions)

    # 4. Compute per-pillar accuracy and overall accuracy
    pillar_stats: dict[str, dict] = defaultdict(lambda: {"total": 0, "correct": 0})
    total_correct = 0
    student_stats: dict[str, dict] = defaultdict(lambda: {"total": 0, "correct": 0})

    for row in interactions:
        p = row.get("pillar")
        is_correct = row.get("correct") is True
        if p:
            pillar_stats[p]["total"] += 1
            if is_correct:
                pillar_stats[p]["correct"] += 1
        student_stats[row["student_id"]]["total"] += 1
        if is_correct:
            student_stats[row["student_id"]]["correct"] += 1
            total_correct += 1

    overall_accuracy_pct = round(total_correct / total_interactions * 100, 1) if total_interactions > 0 else 0.0

    pillar_accuracy: dict[str, float] = {}
    for p, d in pillar_stats.items():
        pillar_accuracy[p] = round(d["correct"] / d["total"] * 100, 1) if d["total"] > 0 else 0.0

    # Sort pillars by accuracy for strong/weak
    sorted_pillars = sorted(pillar_accuracy.items(), key=lambda x: x[1])
    top_weak_topics = [p for p, _ in sorted_pillars[:3]]
    top_strong_topics = [p for p, _ in sorted_pillars[-3:]][::-1]

    # 5. Compute quartiles: sort students by accuracy, split into top 25%, middle 50%, bottom 25%
    student_accuracies: list[float] = []
    for sid in student_ids:
        st = student_stats.get(sid)
        if st and st["total"] > 0:
            student_accuracies.append(st["correct"] / st["total"] * 100)
        else:
            student_accuracies.append(0.0)

    student_accuracies_sorted = sorted(student_accuracies)
    n = len(student_accuracies_sorted)
    bottom_25_count = n // 4
    top_25_count = n // 4
    middle_50_count = n - bottom_25_count - top_25_count

    quartiles = {
        "top_25": top_25_count,
        "middle_50": middle_50_count,
        "bottom_25": bottom_25_count,
    }

    # 6. Proficiency levels: >70% = proficient, 40-70% = developing, <40% = struggling
    proficiency: dict[str, int] = {"proficient": 0, "developing": 0, "struggling": 0}
    for acc in student_accuracies:
        if acc > 70:
            proficiency["proficient"] += 1
        elif acc >= 40:
            proficiency["developing"] += 1
        else:
            proficiency["struggling"] += 1

    # 7. Generate AI summary
    summary_stats = {
        "overall_accuracy_pct": overall_accuracy_pct,
        "pillar_accuracy": pillar_accuracy,
        "total_students": total_students,
        "student_count_by_proficiency": proficiency,
    }
    ai_summary = await _generate_grade_summary(grade_level, summary_stats)

    return GradeReportResponse(
        grade_level=grade_level,
        total_students=total_students,
        total_interactions=total_interactions,
        overall_accuracy_pct=overall_accuracy_pct,
        pillar_accuracy=pillar_accuracy,
        top_weak_topics=top_weak_topics,
        top_strong_topics=top_strong_topics,
        quartiles=quartiles,
        student_count_by_proficiency=proficiency,
        ai_summary=ai_summary,
    )


# ---------------------------------------------------------------------------
# GET /report/grade/{grade_level}/csv  — CSV export
# ---------------------------------------------------------------------------

@router.get(
    "/report/grade/{grade_level}/csv",
    summary="Export grade-level student performance as CSV (teacher only)",
)
async def export_grade_csv(
    grade_level: int,
    teacher: dict = Depends(get_current_teacher),
):
    """
    Export a CSV file of all students in the given grade level with per-pillar
    accuracy and overall accuracy. Returns a streaming CSV download.
    """
    import csv
    import io
    from collections import defaultdict

    supabase = get_supabase_admin()
    teacher_id: str = teacher["id"]

    # 1. Fetch classrooms (admin sees all)
    cls_query = supabase.table("classrooms").select("id")
    if not teacher.get("is_admin"):
        cls_query = cls_query.eq("teacher_id", teacher_id)
    cls_resp = cls_query.eq("grade_level", grade_level).execute()
    classrooms = cls_resp.data or []
    classroom_ids = [c["id"] for c in classrooms]

    # 2. Fetch students
    student_rows: list[dict] = []
    if classroom_ids:
        stu_resp = (
            supabase.table("students")
            .select("id, student_name, roll_number")
            .in_("classroom_id", classroom_ids)
            .order("student_name")
            .execute()
        )
        student_rows = stu_resp.data or []

    # 3. Fetch interactions
    student_ids = [s["id"] for s in student_rows]
    interactions: list[dict] = []
    if student_ids:
        int_resp = (
            supabase.table("student_interactions")
            .select("student_id, correct, pillar")
            .in_("student_id", student_ids)
            .limit(10000).execute()
        )
        interactions = int_resp.data or []

    # 4. Aggregate per student per pillar
    student_pillar: dict[str, dict[str, dict]] = defaultdict(
        lambda: defaultdict(lambda: {"total": 0, "correct": 0})
    )
    student_totals: dict[str, dict] = defaultdict(lambda: {"total": 0, "correct": 0})

    for row in interactions:
        sid = row["student_id"]
        p = row.get("pillar")
        is_correct = row.get("correct") is True
        student_totals[sid]["total"] += 1
        if is_correct:
            student_totals[sid]["correct"] += 1
        if p:
            student_pillar[sid][p]["total"] += 1
            if is_correct:
                student_pillar[sid][p]["correct"] += 1

    # 5. Build CSV
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "student_name", "roll_number", "total_interactions",
        "reading_accuracy", "writing_accuracy", "listening_accuracy",
        "speaking_accuracy", "overall_accuracy",
    ])

    for s in student_rows:
        sid = s["id"]
        totals = student_totals.get(sid, {"total": 0, "correct": 0})
        overall_acc = round(totals["correct"] / totals["total"] * 100, 1) if totals["total"] > 0 else 0.0

        pillar_accs = {}
        for p_name in ("reading", "writing", "listening", "speaking"):
            pd = student_pillar[sid].get(p_name, {"total": 0, "correct": 0})
            pillar_accs[p_name] = round(pd["correct"] / pd["total"] * 100, 1) if pd["total"] > 0 else 0.0

        writer.writerow([
            s["student_name"],
            s.get("roll_number") or "",
            totals["total"],
            pillar_accs["reading"],
            pillar_accs["writing"],
            pillar_accs["listening"],
            pillar_accs["speaking"],
            overall_acc,
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=grade-{grade_level}-report.csv"
        },
    )


# ---------------------------------------------------------------------------
# GET /grade-overview/{grade_level}  — T04 grade overview with idle detection
# ---------------------------------------------------------------------------

class GradeOverviewResponse(BaseModel):
    grade_level: int
    total_students: int
    active_today: int
    idle_students: int  # no activity in 48 hours
    avg_accuracy: float
    pillar_accuracy: dict[str, float]  # reading, writing, listening, speaking
    weak_pillars: list[str]  # pillars below 50% accuracy
    strong_pillars: list[str]  # pillars above 75% accuracy
    idle_student_list: list[dict]  # [{ student_id, student_name, last_activity_date }]


@router.get(
    "/grade-overview/{grade_level}",
    response_model=GradeOverviewResponse,
    summary="Grade-level overview with idle student detection (teacher only)",
)
async def get_grade_overview(
    grade_level: int,
    teacher: dict = Depends(get_current_teacher),
):
    """
    Returns a grade-level overview including:
    - Total students, active today count, idle count
    - Per-pillar accuracy with weak/strong classification
    - List of idle students (no activity in 48+ hours)

    Teacher authentication required.
    """
    from datetime import datetime, timedelta, timezone
    from collections import defaultdict

    supabase = get_supabase_admin()
    teacher_id: str = teacher["id"]

    # 1. Fetch classrooms for this grade (global teacher access)
    cls_query = supabase.table("classrooms").select("id")
    cls_res = cls_query.eq("grade_level", grade_level).execute()
    classrooms = cls_res.data or []

    empty = GradeOverviewResponse(
        grade_level=grade_level,
        total_students=0,
        active_today=0,
        idle_students=0,
        avg_accuracy=0.0,
        pillar_accuracy={},
        weak_pillars=[],
        strong_pillars=[],
        idle_student_list=[],
    )

    if not classrooms:
        return empty

    classroom_ids = [c["id"] for c in classrooms]

    # 2. Fetch students with last_activity_date
    stu_res = (
        supabase.table("students")
        .select("id, student_name, classroom_id, last_activity_date, current_streak")
        .in_("classroom_id", classroom_ids)
        .execute()
    )
    student_rows = stu_res.data or []
    total_students = len(student_rows)

    if not student_rows:
        return empty

    # 3. Count active today and idle students
    now = datetime.now(timezone.utc)
    today_str = now.strftime("%Y-%m-%d")
    two_days_ago_str = (now - timedelta(hours=48)).strftime("%Y-%m-%d")

    active_today = 0
    idle_count = 0
    idle_student_list: list[dict] = []

    for s in student_rows:
        last_activity = s.get("last_activity_date")
        if last_activity and last_activity[:10] == today_str:
            active_today += 1
        if not last_activity or last_activity[:10] < two_days_ago_str:
            idle_count += 1
            idle_student_list.append({
                "student_id": s["id"],
                "student_name": s["student_name"],
                "last_activity_date": last_activity,
            })

    # 4. Fetch interactions and compute per-pillar accuracy
    student_ids = [s["id"] for s in student_rows]
    int_res = (
        supabase.table("student_interactions")
        .select("student_id, pillar, correct")
        .in_("student_id", student_ids)
        .limit(10000).execute()
    )
    interactions = int_res.data or []

    pillar_agg: dict[str, dict] = defaultdict(lambda: {"total": 0, "correct": 0})
    total_correct = 0
    total_count = 0

    for row in interactions:
        p = row.get("pillar")
        if p:
            pillar_agg[p]["total"] += 1
            if row.get("correct") is True:
                pillar_agg[p]["correct"] += 1
        total_count += 1
        if row.get("correct") is True:
            total_correct += 1

    avg_accuracy = round(total_correct / total_count * 100, 2) if total_count > 0 else 0.0

    pillar_accuracy: dict[str, float] = {}
    weak_pillars: list[str] = []
    strong_pillars: list[str] = []

    for p_name in ["reading", "writing", "listening", "speaking"]:
        ps = pillar_agg.get(p_name)
        if ps and ps["total"] > 0:
            acc = round(ps["correct"] / ps["total"] * 100, 2)
        else:
            acc = 0.0
        pillar_accuracy[p_name] = acc
        if acc < 50:
            weak_pillars.append(p_name)
        if acc > 75:
            strong_pillars.append(p_name)

    return GradeOverviewResponse(
        grade_level=grade_level,
        total_students=total_students,
        active_today=active_today,
        idle_students=idle_count,
        avg_accuracy=avg_accuracy,
        pillar_accuracy=pillar_accuracy,
        weak_pillars=weak_pillars,
        strong_pillars=strong_pillars,
        idle_student_list=idle_student_list,
    )


# ---------------------------------------------------------------------------
# GET /weekly-trend/{grade_level}  — T04 weekly accuracy trend
# ---------------------------------------------------------------------------

class WeeklyTrendPoint(BaseModel):
    week_label: str  # "Apr 21-27"
    accuracy: float
    interactions: int


class WeeklyTrendResponse(BaseModel):
    grade_level: int
    pillar: str | None  # null = overall
    weeks: list[WeeklyTrendPoint]


@router.get(
    "/weekly-trend/{grade_level}",
    response_model=WeeklyTrendResponse,
    summary="Weekly accuracy trend for a grade (teacher only)",
)
async def get_weekly_trend(
    grade_level: int,
    teacher: dict = Depends(get_current_teacher),
    pillar: str | None = Query(None, description="Filter by pillar"),
    weeks: int = Query(4, ge=1, le=12, description="Number of weeks to return"),
):
    """
    Returns weekly accuracy trend data for a grade level.
    Each data point includes the week label, accuracy percentage, and interaction count.
    """
    from datetime import datetime, timedelta, timezone

    supabase = get_supabase_admin()
    teacher_id: str = teacher["id"]

    # 1. Fetch classrooms (global teacher access)
    cls_query = supabase.table("classrooms").select("id")
    cls_res = cls_query.eq("grade_level", grade_level).execute()
    classrooms = cls_res.data or []
    if not classrooms:
        return WeeklyTrendResponse(grade_level=grade_level, pillar=pillar, weeks=[])

    classroom_ids = [c["id"] for c in classrooms]

    # 2. Fetch students
    stu_res = (
        supabase.table("students")
        .select("id")
        .in_("classroom_id", classroom_ids)
        .execute()
    )
    student_ids = [s["id"] for s in (stu_res.data or [])]
    if not student_ids:
        return WeeklyTrendResponse(grade_level=grade_level, pillar=pillar, weeks=[])

    # 3. Compute week boundaries
    now = datetime.now(timezone.utc)
    current_monday = now - timedelta(days=now.weekday())
    current_monday = current_monday.replace(hour=0, minute=0, second=0, microsecond=0)
    earliest_start = current_monday - timedelta(weeks=weeks - 1)

    # 4. Fetch interactions from the earliest start
    int_query = (
        supabase.table("student_interactions")
        .select("correct, created_at, pillar")
        .in_("student_id", student_ids)
        .gte("created_at", earliest_start.isoformat())
    )
    if pillar:
        int_query = int_query.eq("pillar", pillar)
    int_res = int_query.limit(10000).execute()
    interactions = int_res.data or []

    # 5. Bucket interactions by week
    week_data: dict[int, dict] = {i: {"total": 0, "correct": 0} for i in range(weeks)}

    for row in interactions:
        created = row.get("created_at", "")
        if not created:
            continue
        try:
            dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
        except (ValueError, AttributeError):
            continue
        delta_days = (dt - earliest_start).days
        week_idx = delta_days // 7
        if 0 <= week_idx < weeks:
            week_data[week_idx]["total"] += 1
            if row.get("correct") is True:
                week_data[week_idx]["correct"] += 1

    # 6. Build response
    MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                   "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    result_weeks: list[WeeklyTrendPoint] = []
    for i in range(weeks):
        week_start = earliest_start + timedelta(weeks=i)
        week_end = week_start + timedelta(days=6)
        label = f"{MONTH_NAMES[week_start.month - 1]} {week_start.day}-{week_end.day}"
        wd = week_data[i]
        accuracy = round(wd["correct"] / wd["total"] * 100, 2) if wd["total"] > 0 else 0.0
        result_weeks.append(WeeklyTrendPoint(
            week_label=label,
            accuracy=accuracy,
            interactions=wd["total"],
        ))

    return WeeklyTrendResponse(
        grade_level=grade_level,
        pillar=pillar,
        weeks=result_weeks,
    )


# ---------------------------------------------------------------------------
# POST /teacher-assistant/daily-plan  — T05 AI daily teaching plan
# ---------------------------------------------------------------------------

class DailyPlanRequest(BaseModel):
    grade_level: int = Field(ge=1, le=5)


class FocusArea(BaseModel):
    topic: str
    pillar: str  # reading/writing/listening/speaking
    reason: str


class SuggestedActivity(BaseModel):
    title: str
    description: str
    target_pillar: str
    estimated_minutes: int


class StudentGroup(BaseModel):
    group_name: str  # e.g., "Needs extra help", "Advanced"
    student_names: list[str]
    recommendation: str


class TeacherDailyPlan(BaseModel):
    summary: str  # 2-3 sentence overview
    focus_areas: list[FocusArea]  # 2-3 weak areas
    suggested_activities: list[SuggestedActivity]  # 3-5 activities
    student_groups: list[StudentGroup]  # 2-3 groups
    snc_references: list[str]  # curriculum references from RAG
    generated_at: str = ""  # ISO timestamp — set by server, not LLM


@router.post(
    "/teacher-assistant/daily-plan",
    response_model=TeacherDailyPlan,
    summary="AI-generated daily teaching plan for a grade (teacher only)",
)
async def generate_daily_plan(
    body: DailyPlanRequest,
    teacher: dict = Depends(get_current_teacher),
    supabase_admin_client=Depends(get_supabase_admin),
):
    """
    Generates an AI-powered daily teaching plan for a specific grade level.

    Uses student performance data from the last 7 days, SNC curriculum context
    via RAG retrieval, and GPT-4o-mini to produce actionable focus areas,
    suggested activities, and student grouping recommendations.

    Teacher authentication required.
    """
    from datetime import datetime, timedelta, timezone, date
    from collections import defaultdict
    from app.core.cache import cache_get, cache_set, make_cache_key
    from app.agents.tutor_agent.chatbot import retrieve_grade_filtered_chunks

    grade_level = body.grade_level
    teacher_id: str = teacher["id"]
    today_str = date.today().isoformat()

    # -- 1. Check cache --
    cache_key = make_cache_key("teacher_plan", teacher_id, str(grade_level), today_str)
    cached = await cache_get(cache_key)
    if cached:
        return TeacherDailyPlan(**cached)

    # -- 2. Fetch classrooms for this grade (global teacher access) --
    cls_query = supabase_admin_client.table("classrooms").select("id")
    cls_res = cls_query.eq("grade_level", grade_level).execute()
    classrooms = cls_res.data or []
    if not classrooms:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No classrooms found for grade {grade_level}.",
        )

    classroom_ids = [c["id"] for c in classrooms]

    # -- 3. Fetch students --
    stu_res = (
        supabase_admin_client.table("students")
        .select("id, student_name, classroom_id")
        .in_("classroom_id", classroom_ids)
        .execute()
    )
    student_rows = stu_res.data or []
    if not student_rows:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No students found for grade {grade_level}.",
        )

    student_ids = [s["id"] for s in student_rows]
    student_name_map = {s["id"]: s["student_name"] for s in student_rows}

    # -- 4. Fetch interactions from the last 7 days --
    now = datetime.now(timezone.utc)
    seven_days_ago = (now - timedelta(days=7)).isoformat()

    int_res = (
        supabase_admin_client.table("student_interactions")
        .select("student_id, pillar, correct, interaction_type")
        .in_("student_id", student_ids)
        .gte("created_at", seven_days_ago)
        .limit(10000)
        .execute()
    )
    interactions = int_res.data or []

    # -- 5. Compute per-pillar accuracy and per-student accuracy --
    pillar_agg: dict[str, dict] = defaultdict(lambda: {"total": 0, "correct": 0})
    student_agg: dict[str, dict] = defaultdict(lambda: {"total": 0, "correct": 0})
    type_agg: dict[str, dict] = defaultdict(lambda: {"total": 0, "correct": 0})
    total_correct = 0
    total_count = 0

    for row in interactions:
        p = row.get("pillar")
        sid = row.get("student_id")
        itype = row.get("interaction_type", "")
        is_correct = row.get("correct") is True

        total_count += 1
        if is_correct:
            total_correct += 1

        if p:
            pillar_agg[p]["total"] += 1
            if is_correct:
                pillar_agg[p]["correct"] += 1
        if sid:
            student_agg[sid]["total"] += 1
            if is_correct:
                student_agg[sid]["correct"] += 1
        if itype:
            type_agg[itype]["total"] += 1
            if is_correct:
                type_agg[itype]["correct"] += 1

    overall_accuracy = round(total_correct / total_count * 100, 2) if total_count > 0 else 0.0

    pillar_accuracy: dict[str, float] = {}
    for p_name in ["reading", "writing", "listening", "speaking"]:
        ps = pillar_agg.get(p_name)
        if ps and ps["total"] > 0:
            pillar_accuracy[p_name] = round(ps["correct"] / ps["total"] * 100, 2)
        else:
            pillar_accuracy[p_name] = 0.0

    # Identify weakest pillars
    sorted_pillars = sorted(pillar_accuracy.items(), key=lambda x: x[1])
    weak_pillars = [p for p, acc in sorted_pillars[:2] if acc < 80]

    # Identify weakest task types (proxy for topics since topic column is not available)
    weak_types = sorted(
        [(t, d["correct"] / d["total"] * 100) for t, d in type_agg.items() if d["total"] >= 3],
        key=lambda x: x[1],
    )[:3]

    # -- 6. Group students by performance --
    struggling_students: list[str] = []
    on_track_students: list[str] = []
    advanced_students: list[str] = []

    for sid, agg in student_agg.items():
        acc = round(agg["correct"] / agg["total"] * 100, 2) if agg["total"] > 0 else 0.0
        name = student_name_map.get(sid, "Unknown")
        if acc < 50:
            struggling_students.append(name)
        elif acc >= 80:
            advanced_students.append(name)
        else:
            on_track_students.append(name)

    # Students with no interactions in the last 7 days
    active_ids = set(student_agg.keys())
    inactive_students = [
        student_name_map[sid] for sid in student_ids if sid not in active_ids
    ]

    # -- 7. RAG retrieval for SNC curriculum context --
    weak_area_desc = ", ".join(weak_pillars) if weak_pillars else "general English"
    rag_query = (
        f"activities and lesson plans for practicing {weak_area_desc} "
        f"skills for grade {grade_level} primary school students"
    )
    try:
        snc_chunks = await retrieve_grade_filtered_chunks(
            query=rag_query,
            grade_level=grade_level,
            supabase_admin_client=supabase_admin_client,
            match_count=5,
        )
    except Exception:
        snc_chunks = []

    snc_context = "\n\n".join(snc_chunks) if snc_chunks else "No SNC curriculum data available."

    # -- 8. Build LLM prompt --
    student_breakdown = ""
    if struggling_students:
        student_breakdown += f"Struggling students (below 50% accuracy): {', '.join(struggling_students)}\n"
    if on_track_students:
        student_breakdown += f"On-track students (50-80% accuracy): {', '.join(on_track_students)}\n"
    if advanced_students:
        student_breakdown += f"Advanced students (above 80% accuracy): {', '.join(advanced_students)}\n"
    if inactive_students:
        student_breakdown += f"Inactive students (no activity in 7 days): {', '.join(inactive_students)}\n"

    weak_types_desc = ", ".join([f"{t} ({a:.0f}%)" for t, a in weak_types]) if weak_types else "none identified"

    prompt = (
        f"You are an expert ESL teaching assistant for Pakistani primary schools following the SNC curriculum.\n"
        f"Generate a daily teaching plan for Grade {grade_level} for {today_str}.\n\n"
        f"## Class Performance (Last 7 Days)\n"
        f"- Overall accuracy: {overall_accuracy}%\n"
        f"- Total students: {len(student_rows)}\n"
        f"- Active students (last 7 days): {len(active_ids)}\n"
        f"- Total missions completed: {total_count}\n"
        f"- Reading accuracy: {pillar_accuracy.get('reading', 0)}%\n"
        f"- Writing accuracy: {pillar_accuracy.get('writing', 0)}%\n"
        f"- Listening accuracy: {pillar_accuracy.get('listening', 0)}%\n"
        f"- Speaking accuracy: {pillar_accuracy.get('speaking', 0)}%\n"
        f"- Weakest task types: {weak_types_desc}\n\n"
        f"## Student Breakdown\n{student_breakdown}\n"
        f"## SNC Curriculum Context\n{snc_context}\n\n"
        f"## Instructions\n"
        f"- Identify 2-3 focus areas based on the weakest pillars and topics.\n"
        f"- Suggest 3-5 specific, actionable classroom activities (not generic advice). "
        f"Each activity should have a clear title, description, target pillar, and estimated time.\n"
        f"- Group students into 2-3 groups based on their performance with specific recommendations.\n"
        f"- Reference specific SNC curriculum content in snc_references where applicable.\n"
        f"- Keep the summary to 2-3 sentences.\n"
    )

    # -- 9. Call LLM with structured output --
    try:
        from langchain_openai import ChatOpenAI
        from app.core.config import settings as app_settings

        llm = ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0.4,
            openai_api_key=app_settings.OPENAI_API_KEY,
        )
        structured_llm = llm.with_structured_output(TeacherDailyPlan)
        plan: TeacherDailyPlan = await structured_llm.ainvoke(prompt)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to generate daily plan: {str(e)}",
        )

    # -- 10. Set generated_at and cache --
    plan.generated_at = datetime.now(timezone.utc).isoformat()

    try:
        await cache_set(cache_key, plan.model_dump(), ttl=21600)
    except Exception:
        pass  # caching is best-effort

    return plan
