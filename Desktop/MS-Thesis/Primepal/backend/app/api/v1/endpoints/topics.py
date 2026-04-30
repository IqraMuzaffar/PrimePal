"""
GET  /api/v1/topics?grade_level={1-5}
GET  /api/v1/topics/grade-selections/{grade_level}
PUT  /api/v1/topics/grade-selections/{grade_level}

Returns all predefined SNC English topics for the specified grade level.
No auth required for listing topics — topics are public reference data.
Grade-selection endpoints require teacher auth.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.core.security import get_current_teacher
from app.core.supabase_client import get_supabase_admin
from app.schemas.topic import SncTopicOut

router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────────────────────


class GradeTopicSelection(BaseModel):
    topic_id: int
    is_active: bool


class GradeTopicItem(BaseModel):
    topic_id: int
    topic_name: str
    is_active: bool


class GradeSelectionsResponse(BaseModel):
    grade_level: int
    topics: list[GradeTopicItem]


class GradeSelectionsUpdate(BaseModel):
    selections: list[GradeTopicSelection]


# ── List SNC topics ──────────────────────────────────────────────────────────


@router.get("/", response_model=list[SncTopicOut], summary="List SNC topics for a grade")
async def get_topics(
    grade_level: int = Query(..., description="Grade level (1-5)"),
    supabase=None,
):
    """
    Returns all predefined SNC English topics for the given grade level.
    Topics are global and shared across all classrooms.
    """
    if grade_level < 1 or grade_level > 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="grade_level must be between 1 and 5",
        )

    if supabase is None:
        supabase = get_supabase_admin()

    resp = (
        supabase.table("snc_topics")
        .select("id, grade_level, topic_name")
        .eq("grade_level", grade_level)
        .order("id")
        .execute()
    )
    return resp.data or []


# ── Grade-level topic selections ─────────────────────────────────────────────


@router.get(
    "/grade-selections/{grade_level}",
    response_model=GradeSelectionsResponse,
    summary="List topics for a grade with active status",
)
async def get_grade_selections(
    grade_level: int,
    teacher: dict = Depends(get_current_teacher),
):
    """
    Returns all SNC topics for a grade, each annotated with its active status
    from grade_topic_selections.  Topics with no saved row default to active=true.
    """
    if grade_level < 1 or grade_level > 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="grade_level must be between 1 and 5",
        )

    supabase = get_supabase_admin()

    # Fetch all topics for this grade
    topics_resp = (
        supabase.table("snc_topics")
        .select("id, topic_name")
        .eq("grade_level", grade_level)
        .order("id")
        .execute()
    )
    all_topics = topics_resp.data or []

    # Fetch existing grade-level selections
    sel_resp = (
        supabase.table("grade_topic_selections")
        .select("topic_id, is_active")
        .eq("grade_level", grade_level)
        .execute()
    )
    selections_map: dict[int, bool] = {
        row["topic_id"]: row["is_active"] for row in (sel_resp.data or [])
    }

    # Merge: default to active=true if no selection row exists
    result_topics = [
        GradeTopicItem(
            topic_id=t["id"],
            topic_name=t["topic_name"],
            is_active=selections_map.get(t["id"], True),
        )
        for t in all_topics
    ]

    return GradeSelectionsResponse(grade_level=grade_level, topics=result_topics)


@router.put(
    "/grade-selections/{grade_level}",
    response_model=GradeSelectionsResponse,
    summary="Bulk update active status for a grade's topics",
)
async def update_grade_selections(
    grade_level: int,
    body: GradeSelectionsUpdate,
    teacher: dict = Depends(get_current_teacher),
):
    """
    Upserts grade_topic_selections for each topic in the request body.
    Returns the full updated list for the grade.
    """
    if grade_level < 1 or grade_level > 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="grade_level must be between 1 and 5",
        )

    supabase = get_supabase_admin()

    # Upsert each selection
    if body.selections:
        from datetime import datetime, timezone
        now_ts = datetime.now(timezone.utc).isoformat()
        rows = [
            {
                "grade_level": grade_level,
                "topic_id": sel.topic_id,
                "is_active": sel.is_active,
                "updated_at": now_ts,
            }
            for sel in body.selections
        ]
        supabase.table("grade_topic_selections").upsert(
            rows, on_conflict="grade_level,topic_id"
        ).execute()

    # Return the updated full list (re-use GET logic)
    return await get_grade_selections(grade_level, teacher)
