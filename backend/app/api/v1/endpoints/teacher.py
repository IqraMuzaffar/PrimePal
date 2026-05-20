"""
Teacher-specific endpoints: analytics, reports, dashboard data.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timedelta

from app.core.security import get_current_teacher
from app.core.supabase_client import get_supabase_admin

router = APIRouter()


# Response schemas
class SummaryStats(BaseModel):
    total_students: int
    total_interactions: int
    avg_accuracy: int
    active_this_week: int


class TopStudent(BaseModel):
    name: str
    accuracy: int


class GradeBreakdown(BaseModel):
    grade_level: int
    student_count: int
    avg_accuracy: int
    total_interactions: int
    top_student: Optional[TopStudent]
    struggling_count: int


class PillarBreakdown(BaseModel):
    pillar: str
    avg_accuracy: int
    total_attempts: int
    top_performers: int
    needs_help: int


class StudentRanking(BaseModel):
    student_id: str
    name: str
    avatar_url: Optional[str]
    grade_level: int
    overall_accuracy: int
    total_interactions: int
    strongest_pillar: Optional[str] = None
    weakest_pillar: Optional[str] = None
    recent_activity: Optional[str] = None


class DailyTrend(BaseModel):
    date: str
    date_label: str
    avg_accuracy: int
    total_interactions: int


class AnalyticsResponse(BaseModel):
    summary_stats: SummaryStats
    grade_breakdown: list[GradeBreakdown]
    pillar_breakdown: list[PillarBreakdown]
    top_students: list[StudentRanking]
    struggling_students: list[StudentRanking]
    daily_trends: list[DailyTrend]


# Helper functions for data aggregation
def aggregate_student_stats(
    supabase,
    grade_level: Optional[int] = None,
    pillar: Optional[str] = None,
    section: Optional[str] = None,
):
    """
    Query student_interactions and aggregate statistics.

    Returns dict with:
    - all_students: list of student records with stats
    - summary: aggregate summary stats
    """
    # Build filter conditions
    thirty_days_ago = (datetime.utcnow() - timedelta(days=30)).isoformat()

    # Base query: fetch interactions from last 30 days
    # Exclude chat — all mission_* types are valid regardless of naming
    query = (
        supabase.table("student_interactions")
        .select("id, student_id, classroom_id, grade_level, pillar, correct, created_at")
        .gte("created_at", thirty_days_ago)
        .neq("interaction_type", "chat")
        .not_.is_("correct", "null")
    )

    # Apply filters
    if grade_level:
        query = query.eq("grade_level", grade_level)
    if pillar:
        query = query.eq("pillar", pillar)

    result = query.execute()
    interactions = result.data

    if not interactions:
        return {"all_students": [], "summary": {}}

    # Get unique student IDs and classroom IDs
    student_ids = list(set(i["student_id"] for i in interactions))
    classroom_ids = list(set(i["classroom_id"] for i in interactions))

    # Fetch student data
    students_result = supabase.table("students").select("id, student_name, avatar_url, classroom_id").in_("id", student_ids).execute()
    students_by_id = {s["id"]: s for s in students_result.data}

    # Fetch classroom data
    classrooms_result = supabase.table("classrooms").select("id, grade_level, section, class_name").in_("id", classroom_ids).execute()
    classrooms_by_id = {c["id"]: c for c in classrooms_result.data}

    # Apply section filter if provided
    if section:
        # Filter interactions to only those from classrooms with matching section
        section_classroom_ids = [cid for cid, c in classrooms_by_id.items() if c.get("section") == section]
        interactions = [i for i in interactions if i["classroom_id"] in section_classroom_ids]

        if not interactions:
            return {"all_students": [], "summary": {}}

    # Group by student_id
    student_map = {}
    for interaction in interactions:
        sid = interaction["student_id"]
        if sid not in student_map and sid in students_by_id:
            student_data = students_by_id[sid]
            classroom_data = classrooms_by_id.get(student_data["classroom_id"], {})

            student_map[sid] = {
                "student_id": sid,
                "student_name": student_data.get("student_name", "Unknown"),
                "avatar_url": student_data.get("avatar_url"),
                "grade_level": classroom_data.get("grade_level", interaction["grade_level"]),
                "section": classroom_data.get("section"),
                "interactions": [],
            }
        if sid in student_map:
            student_map[sid]["interactions"].append(interaction)

    # Calculate per-student stats
    all_students = []
    for student in student_map.values():
        interactions = student["interactions"]
        total = len(interactions)
        correct_count = sum(1 for i in interactions if i["correct"])
        overall_accuracy = int((correct_count / total * 100)) if total > 0 else 0

        # Per-pillar accuracy
        pillar_stats = {}
        for p in ["reading", "writing", "listening", "speaking"]:
            pillar_interactions = [i for i in interactions if i["pillar"] == p]
            if pillar_interactions:
                pillar_correct = sum(1 for i in pillar_interactions if i["correct"])
                pillar_stats[p] = int((pillar_correct / len(pillar_interactions) * 100))
            else:
                pillar_stats[p] = 0

        # Find strongest/weakest pillar
        non_zero_pillars = {k: v for k, v in pillar_stats.items() if v > 0}
        strongest_pillar = max(non_zero_pillars, key=non_zero_pillars.get) if non_zero_pillars else None
        weakest_pillar = min(non_zero_pillars, key=non_zero_pillars.get) if non_zero_pillars else None

        all_students.append({
            "student_id": student["student_id"],
            "name": student["student_name"],
            "avatar_url": student["avatar_url"],
            "grade_level": student["grade_level"],
            "section": student["section"],
            "total_interactions": total,
            "overall_accuracy": overall_accuracy,
            "pillar_accuracy": pillar_stats,
            "strongest_pillar": strongest_pillar,
            "weakest_pillar": weakest_pillar,
            "recent_activity": max(i["created_at"] for i in interactions),
        })

    # Summary stats
    total_interactions = sum(s["total_interactions"] for s in all_students)
    avg_accuracy = int(sum(s["overall_accuracy"] for s in all_students) / len(all_students)) if all_students else 0

    # Active this week
    week_ago = (datetime.utcnow() - timedelta(days=7)).isoformat()
    active_this_week = sum(
        1 for s in all_students if s["recent_activity"] >= week_ago
    )

    return {
        "all_students": all_students,
        "summary": {
            "total_students": len(all_students),
            "total_interactions": total_interactions,
            "avg_accuracy": avg_accuracy,
            "active_this_week": active_this_week,
        },
    }


def compute_grade_breakdown(all_students: list) -> list:
    """
    Group students by grade_level and calculate aggregate stats per grade.
    """
    if not all_students:
        return []

    grade_map = {}
    for student in all_students:
        grade = student["grade_level"]
        if grade not in grade_map:
            grade_map[grade] = []
        grade_map[grade].append(student)

    breakdown = []
    for grade, students in sorted(grade_map.items()):
        student_count = len(students)
        total_interactions = sum(s["total_interactions"] for s in students)
        avg_accuracy = int(sum(s["overall_accuracy"] for s in students) / student_count) if student_count > 0 else 0

        # Find top student in this grade
        top_student = max(students, key=lambda s: s["overall_accuracy"]) if students else None
        top_student_data = None
        if top_student:
            top_student_data = TopStudent(
                name=top_student["name"],
                accuracy=top_student["overall_accuracy"]
            )

        # Count struggling students (accuracy < 60%)
        struggling_count = sum(1 for s in students if s["overall_accuracy"] < 60)

        breakdown.append(GradeBreakdown(
            grade_level=grade,
            student_count=student_count,
            avg_accuracy=avg_accuracy,
            total_interactions=total_interactions,
            top_student=top_student_data,
            struggling_count=struggling_count,
        ))

    return breakdown


def compute_pillar_breakdown(all_students: list) -> list:
    """
    Aggregate performance stats per pillar (reading/writing/listening/speaking).
    """
    pillars = ["reading", "writing", "listening", "speaking"]
    breakdown = []

    for pillar in pillars:
        # Filter students who have attempted this pillar
        students_with_pillar = [
            s for s in all_students if s["pillar_accuracy"][pillar] > 0
        ]

        if not students_with_pillar:
            breakdown.append(PillarBreakdown(
                pillar=pillar,
                avg_accuracy=0,
                total_attempts=0,
                top_performers=0,
                needs_help=0,
            ))
            continue

        # Calculate stats
        accuracies = [s["pillar_accuracy"][pillar] for s in students_with_pillar]
        avg_accuracy = int(sum(accuracies) / len(accuracies)) if accuracies else 0

        # Count interactions for this pillar
        total_attempts = sum(s["total_interactions"] for s in students_with_pillar)

        # Top performers (>= 80% accuracy)
        top_performers = sum(1 for acc in accuracies if acc >= 80)

        # Needs help (< 60% accuracy)
        needs_help = sum(1 for acc in accuracies if acc < 60)

        breakdown.append(PillarBreakdown(
            pillar=pillar,
            avg_accuracy=avg_accuracy,
            total_attempts=total_attempts,
            top_performers=top_performers,
            needs_help=needs_help,
        ))

    return breakdown


def compute_daily_trends(
    supabase,
    grade_level: Optional[int] = None,
    pillar: Optional[str] = None,
    section: Optional[str] = None,
) -> list:
    """
    Calculate daily performance trends for the last 14 days.
    """
    trends = []

    for day_offset in range(13, -1, -1):
        day_start = (datetime.utcnow() - timedelta(days=day_offset)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)

        # Query interactions for this day (exclude chat, only scored interactions)
        query = (
            supabase.table("student_interactions")
            .select("id, correct, created_at, classroom_id")
            .gte("created_at", day_start.isoformat())
            .lt("created_at", day_end.isoformat())
            .neq("interaction_type", "chat")
            .not_.is_("correct", "null")
        )

        # Apply filters directly on student_interactions columns
        if grade_level:
            query = query.eq("grade_level", grade_level)
        if pillar:
            query = query.eq("pillar", pillar)

        result = query.execute()
        interactions = result.data

        # Calculate stats
        total_interactions = len(interactions)
        correct_count = sum(1 for i in interactions if i["correct"])
        avg_accuracy = int((correct_count / total_interactions * 100)) if total_interactions > 0 else 0

        # Format day label
        date_label = day_start.strftime('%b %d')

        trends.append(DailyTrend(
            date=day_start.strftime('%Y-%m-%d'),
            date_label=date_label,
            avg_accuracy=avg_accuracy,
            total_interactions=total_interactions,
        ))

    return trends


@router.get(
    "/analytics",
    response_model=AnalyticsResponse,
    summary="Get comprehensive analytics for teacher dashboard",
)
async def get_analytics(
    grade_level: Optional[int] = Query(None, ge=1, le=6),
    pillar: Optional[str] = Query(None),
    section: Optional[str] = Query(None),
    teacher: dict = Depends(get_current_teacher),
):
    """
    Return comprehensive analytics data for teacher dashboard.

    - Aggregates student performance across all classrooms
    - Filters by grade_level, pillar, section if provided
    - Returns summary stats, breakdowns, rankings, trends
    """
    # Validate pillar
    if pillar and pillar not in ["reading", "writing", "listening", "speaking"]:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid pillar. Must be one of: reading, writing, listening, speaking",
        )

    supabase = get_supabase_admin()

    # Get aggregated student data
    student_data = aggregate_student_stats(supabase, grade_level, pillar, section)
    all_students = student_data["all_students"]
    summary = student_data["summary"]

    # If no data, return empty response
    if not all_students:
        return AnalyticsResponse(
            summary_stats=SummaryStats(
                total_students=0,
                total_interactions=0,
                avg_accuracy=0,
                active_this_week=0,
            ),
            grade_breakdown=[],
            pillar_breakdown=[],
            top_students=[],
            struggling_students=[],
            daily_trends=[],
        )

    # Compute breakdowns
    grade_breakdown = compute_grade_breakdown(all_students)
    pillar_breakdown = compute_pillar_breakdown(all_students)

    # Top 10 students
    top_students = sorted(
        all_students, key=lambda s: s["overall_accuracy"], reverse=True
    )[:10]
    top_students_list = [
        StudentRanking(
            student_id=s["student_id"],
            name=s["name"],
            avatar_url=s["avatar_url"],
            grade_level=s["grade_level"],
            overall_accuracy=s["overall_accuracy"],
            total_interactions=s["total_interactions"],
            strongest_pillar=s["strongest_pillar"],
        )
        for s in top_students
    ]

    # Struggling students (accuracy < 60%)
    struggling = [s for s in all_students if s["overall_accuracy"] < 60]
    struggling_sorted = sorted(struggling, key=lambda s: s["overall_accuracy"])[:10]
    struggling_students_list = [
        StudentRanking(
            student_id=s["student_id"],
            name=s["name"],
            avatar_url=s["avatar_url"],
            grade_level=s["grade_level"],
            overall_accuracy=s["overall_accuracy"],
            total_interactions=s["total_interactions"],
            weakest_pillar=s["weakest_pillar"],
            recent_activity=s["recent_activity"],
        )
        for s in struggling_sorted
    ]

    # Daily trends
    daily_trends = compute_daily_trends(supabase, grade_level, pillar, section)

    return AnalyticsResponse(
        summary_stats=SummaryStats(**summary),
        grade_breakdown=grade_breakdown,
        pillar_breakdown=pillar_breakdown,
        top_students=top_students_list,
        struggling_students=struggling_students_list,
        daily_trends=daily_trends,
    )
