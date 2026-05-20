"""
Teacher Evaluation Forms: pre/post study questionnaire submissions.

Teachers fill out evaluation forms (pre and post) during the school study.
Multiple teachers share one login, so each submission collects identity fields.
"""

import csv
import io
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.core.security import get_current_teacher
from app.core.supabase_client import get_supabase_admin

logger = logging.getLogger(__name__)

router = APIRouter()


# ── Pydantic models ──────────────────────────────────────────────────────────

class TeacherEvaluationSubmit(BaseModel):
    # Identity
    teacher_name: str
    teacher_email: Optional[str] = None
    gender: Optional[str] = None
    qualification: Optional[str] = None
    years_teaching: Optional[str] = None
    grades_taught: Optional[List[int]] = None
    snc_training: Optional[bool] = None
    ai_training: Optional[bool] = None

    # Metadata
    timepoint: str  # "pre" or "post"
    group_type: str  # "treatment" or "control"

    # Section 2: Classroom Context
    avg_class_size: Optional[str] = None
    student_device_access: Optional[str] = None
    internet_stability: Optional[str] = None
    main_constraints: Optional[List[str]] = None

    # Section 3: Student English Skills (5-pt Likert)
    skill_listening_speaking: Optional[int] = None
    skill_reading_writing: Optional[int] = None
    skill_vocabulary: Optional[int] = None
    skill_confidence: Optional[int] = None

    # Section 4: Student Learning Readiness (5-pt Likert)
    readiness_hesitation: Optional[int] = None
    readiness_fear: Optional[int] = None
    readiness_avoidance: Optional[int] = None
    readiness_urdu_support: Optional[int] = None

    # Section 5: Pedagogical Visibility (5-pt Likert)
    visibility_identify_weaknesses: Optional[int] = None
    visibility_personalize: Optional[int] = None
    visibility_monitor_beyond: Optional[int] = None

    # Section 6: Teaching Confidence (5-pt Likert)
    confidence_explain: Optional[int] = None
    confidence_design_activities: Optional[int] = None
    confidence_safe_environment: Optional[int] = None

    # Section 7: PrimePal Usefulness (post-only, nullable)
    usefulness_improves_learning: Optional[int] = None
    usefulness_notice_weaknesses: Optional[int] = None
    usefulness_home_realistic: Optional[int] = None

    # Section 8: PrimePal Impact (post-only, nullable)
    impact_helped_students: Optional[int] = None
    impact_helped_identify_weaknesses: Optional[int] = None
    impact_would_recommend: Optional[int] = None
    impact_most_valuable: Optional[List[str]] = None
    impact_improvements: Optional[List[str]] = None


class TeacherEvaluationSummary(BaseModel):
    id: str
    teacher_name: str
    timepoint: str
    group_type: str
    created_at: str


class SubmitResponse(BaseModel):
    id: str
    message: str


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/submit", response_model=SubmitResponse, summary="Submit a teacher evaluation form")
async def submit_teacher_evaluation(
    body: TeacherEvaluationSubmit,
    teacher: dict = Depends(get_current_teacher),
):
    """Submit a pre or post teacher evaluation form."""
    if body.timepoint not in ("pre", "post"):
        raise HTTPException(status_code=400, detail="timepoint must be 'pre' or 'post'")
    if body.group_type not in ("treatment", "control"):
        raise HTTPException(status_code=400, detail="group_type must be 'treatment' or 'control'")

    sb = get_supabase_admin()

    row = body.model_dump()
    row["submitted_by"] = teacher["id"]

    res = sb.table("teacher_evaluations").insert(row).execute()

    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to insert evaluation")

    return SubmitResponse(
        id=res.data[0]["id"],
        message="Evaluation submitted successfully",
    )


@router.get("/export", summary="Export all evaluations as CSV")
async def export_teacher_evaluations(
    teacher: dict = Depends(get_current_teacher),
):
    """Export all teacher evaluations as a downloadable CSV file."""
    sb = get_supabase_admin()
    res = sb.table("teacher_evaluations").select("*").order("created_at").execute()
    rows = res.data or []

    if not rows:
        raise HTTPException(status_code=404, detail="No evaluations found")

    # Build CSV in memory
    output = io.StringIO()
    fieldnames = list(rows[0].keys())
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()
    for row in rows:
        writer.writerow(row)

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=teacher_evaluations.csv"},
    )


@router.get("/", summary="List all submitted evaluations")
async def list_teacher_evaluations(
    timepoint: Optional[str] = Query(None, description="Filter by 'pre' or 'post'"),
    group_type: Optional[str] = Query(None, description="Filter by 'treatment' or 'control'"),
    teacher: dict = Depends(get_current_teacher),
):
    """List all submitted teacher evaluations with optional filters."""
    sb = get_supabase_admin()

    query = sb.table("teacher_evaluations").select(
        "id,teacher_name,timepoint,group_type,created_at"
    ).order("created_at", desc=True)

    if timepoint:
        query = query.eq("timepoint", timepoint)
    if group_type:
        query = query.eq("group_type", group_type)

    res = query.execute()
    return res.data or []


@router.get("/{evaluation_id}", summary="Get a single evaluation by ID")
async def get_teacher_evaluation(
    evaluation_id: str,
    teacher: dict = Depends(get_current_teacher),
):
    """Return the full evaluation record for a given ID."""
    sb = get_supabase_admin()

    res = (
        sb.table("teacher_evaluations")
        .select("*")
        .eq("id", evaluation_id)
        .maybe_single()
        .execute()
    )

    if not res.data:
        raise HTTPException(status_code=404, detail="Evaluation not found")

    return res.data
