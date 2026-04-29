"""
GET /api/v1/topics?grade_level={1-5}

Returns all predefined SNC English topics for the specified grade level.
No auth required — topics are public reference data.
"""
from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel

from app.core.supabase_client import get_supabase_admin

router = APIRouter()


class SncTopicOut(BaseModel):
    id: int
    grade_level: int
    topic_name: str


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
