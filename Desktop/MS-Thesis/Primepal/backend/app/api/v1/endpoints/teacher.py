"""
Teacher-specific endpoints: analytics, reports, dashboard data.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from typing import Optional

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


class WeeklyTrend(BaseModel):
    week_start: str
    week_label: str
    avg_accuracy: int
    total_interactions: int


class AnalyticsResponse(BaseModel):
    summary_stats: SummaryStats
    grade_breakdown: list[GradeBreakdown]
    pillar_breakdown: list[PillarBreakdown]
    top_students: list[StudentRanking]
    struggling_students: list[StudentRanking]
    weekly_trends: list[WeeklyTrend]


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
    # TODO: Implement in next task
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
        weekly_trends=[],
    )
