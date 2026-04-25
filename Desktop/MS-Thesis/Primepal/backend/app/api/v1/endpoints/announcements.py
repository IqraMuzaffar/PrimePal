"""
Announcements endpoint — Bilingual announcement board for classrooms.
Teachers can post announcements in English; system auto-translates to Urdu.
Students see active announcements on their home dashboard.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List
import logging
from datetime import datetime

from app.core.security import get_current_teacher
from app.core.supabase_client import get_supabase, get_supabase_admin
from app.core.config import settings
from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/announcements", tags=["announcements"])

# ──────────────────────────────────────────────────────────────────────────────
# Pydantic Models
# ──────────────────────────────────────────────────────────────────────────────

class AnnouncementCreate(BaseModel):
    classroom_id: str
    message_en: str


class AnnouncementResponse(BaseModel):
    id: str
    classroom_id: str
    teacher_id: str
    message_en: str
    message_ur: str
    is_active: bool
    created_at: str
    updated_at: str


class AnnouncementsList(BaseModel):
    announcements: List[AnnouncementResponse]
    total_count: int


class AnnouncementUpdate(BaseModel):
    is_active: bool


# ──────────────────────────────────────────────────────────────────────────────
# Utility Functions
# ──────────────────────────────────────────────────────────────────────────────

async def translate_to_urdu(message_en: str) -> str:
    """
    Translate English announcement to Urdu using OpenAI gpt-4o-mini.

    Args:
        message_en: English announcement text

    Returns:
        Translated Urdu text (in Urdu script)
    """
    try:
        llm = ChatOpenAI(
            model="gpt-4o-mini",
            api_key=settings.OPENAI_API_KEY,
            temperature=0,  # Deterministic for consistency
        )

        prompt = ChatPromptTemplate.from_template(
            """You are a professional translator specializing in translating school announcements
            into Urdu for primary school parents in Pakistan.

            Translate the following announcement into clear, simple Urdu script (Nastaliq or Naskh style).
            Make sure the translation is appropriate for primary school students and parents.
            Use formal but friendly tone.

            Return ONLY the Urdu text. Do not include any English text, explanations, or markers.

            English announcement:
            {message_en}
            """
        )

        chain = prompt | llm
        response = await chain.ainvoke({"message_en": message_en})

        urdu_text = response.content.strip()
        logger.info(f"Successfully translated announcement to Urdu ({len(urdu_text)} chars)")
        return urdu_text

    except Exception as e:
        logger.error(f"Translation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to translate announcement: {str(e)}"
        )


async def _verify_classroom_ownership(classroom_id: str, teacher_id: str) -> bool:
    """Verify that the teacher owns the specified classroom."""
    supabase = get_supabase()
    try:
        result = supabase.table("classrooms").select("id").eq("id", classroom_id).eq("teacher_id", teacher_id).execute()
        return len(result.data) > 0
    except Exception as e:
        logger.error(f"Classroom verification error: {str(e)}")
        return False


# ──────────────────────────────────────────────────────────────────────────────
# Endpoints
# ──────────────────────────────────────────────────────────────────────────────

@router.post("", response_model=AnnouncementResponse, status_code=status.HTTP_201_CREATED)
async def create_announcement(
    body: AnnouncementCreate,
    teacher: dict = Depends(get_current_teacher),
) -> AnnouncementResponse:
    """
    Create a new bilingual announcement.

    The endpoint:
    1. Validates teacher owns the classroom
    2. Translates the English message to Urdu using OpenAI
    3. Inserts the record into the announcements table
    4. Returns the created announcement

    Args:
        body: AnnouncementCreate with classroom_id and message_en
        teacher: Current authenticated teacher (from JWT)

    Returns:
        AnnouncementResponse with both English and Urdu messages
    """
    teacher_id = teacher["id"]
    classroom_id = body.classroom_id
    message_en = body.message_en.strip()

    # Validate input
    if not message_en:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message cannot be empty"
        )

    if len(message_en) > 5000:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message cannot exceed 5000 characters"
        )

    # Verify teacher owns the classroom
    owns_classroom = await _verify_classroom_ownership(classroom_id, teacher_id)
    if not owns_classroom:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to post announcements to this classroom"
        )

    # Translate to Urdu
    try:
        message_ur = await translate_to_urdu(message_en)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected translation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to translate announcement"
        )

    # Insert into database using admin client (bypass RLS for service logic)
    supabase_admin = get_supabase_admin()
    try:
        result = supabase_admin.table("announcements").insert({
            "classroom_id": classroom_id,
            "teacher_id": teacher_id,
            "message_en": message_en,
            "message_ur": message_ur,
            "is_active": True,
        }).execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create announcement"
            )

        announcement_data = result.data[0]
        logger.info(f"Announcement created: {announcement_data['id']}")

        return AnnouncementResponse(
            id=announcement_data["id"],
            classroom_id=announcement_data["classroom_id"],
            teacher_id=announcement_data["teacher_id"],
            message_en=announcement_data["message_en"],
            message_ur=announcement_data["message_ur"],
            is_active=announcement_data["is_active"],
            created_at=announcement_data["created_at"],
            updated_at=announcement_data["updated_at"],
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Database error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save announcement"
        )


@router.get("/{classroom_id}", response_model=AnnouncementsList)
async def get_classroom_announcements(
    classroom_id: str,
    teacher: dict = Depends(get_current_teacher),
) -> AnnouncementsList:
    """
    Fetch all announcements (active and inactive) for a specific classroom.
    Only accessible by the teacher who owns the classroom.

    Sorted by created_at DESC (newest first).

    Args:
        classroom_id: UUID of the classroom
        teacher: Current authenticated teacher (from JWT)

    Returns:
        AnnouncementsList with all announcements
    """
    teacher_id = teacher["id"]

    # Verify teacher owns the classroom
    owns_classroom = await _verify_classroom_ownership(classroom_id, teacher_id)
    if not owns_classroom:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view announcements for this classroom"
        )

    # Fetch announcements
    supabase = get_supabase()
    try:
        result = supabase.table("announcements") \
            .select("*") \
            .eq("classroom_id", classroom_id) \
            .order("created_at", desc=True) \
            .execute()

        announcements = [
            AnnouncementResponse(
                id=ann["id"],
                classroom_id=ann["classroom_id"],
                teacher_id=ann["teacher_id"],
                message_en=ann["message_en"],
                message_ur=ann["message_ur"],
                is_active=ann["is_active"],
                created_at=ann["created_at"],
                updated_at=ann["updated_at"],
            )
            for ann in result.data
        ]

        return AnnouncementsList(
            announcements=announcements,
            total_count=len(announcements)
        )

    except Exception as e:
        logger.error(f"Database error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch announcements"
        )


@router.get("/{classroom_id}/active")
async def get_latest_active_announcement(classroom_id: str):
    """
    Fetch the latest active announcement for a classroom.

    **Public endpoint** — no authentication required.
    Accessed by student frontend to display announcement on home dashboard.

    Args:
        classroom_id: UUID of the classroom

    Returns:
        Single announcement object or null if no active announcement
    """
    supabase_admin = get_supabase_admin()
    try:
        result = supabase_admin.table("announcements") \
            .select("*") \
            .eq("classroom_id", classroom_id) \
            .eq("is_active", True) \
            .order("created_at", desc=True) \
            .limit(1) \
            .execute()

        if result.data:
            ann = result.data[0]
            return AnnouncementResponse(
                id=ann["id"],
                classroom_id=ann["classroom_id"],
                teacher_id=ann["teacher_id"],
                message_en=ann["message_en"],
                message_ur=ann["message_ur"],
                is_active=ann["is_active"],
                created_at=ann["created_at"],
                updated_at=ann["updated_at"],
            )
        else:
            return None

    except Exception as e:
        logger.error(f"Database error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch announcement"
        )


@router.patch("/{announcement_id}", response_model=AnnouncementResponse)
async def update_announcement(
    announcement_id: str,
    body: AnnouncementUpdate,
    teacher: dict = Depends(get_current_teacher),
) -> AnnouncementResponse:
    """
    Update an announcement (toggle is_active status).

    Only the teacher who created the announcement can update it.

    Args:
        announcement_id: UUID of the announcement
        body: AnnouncementUpdate with is_active boolean
        teacher: Current authenticated teacher (from JWT)

    Returns:
        Updated AnnouncementResponse
    """
    teacher_id = teacher["id"]

    # Fetch the announcement
    supabase = get_supabase()
    try:
        result = supabase.table("announcements") \
            .select("*") \
            .eq("id", announcement_id) \
            .eq("teacher_id", teacher_id) \
            .execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Announcement not found or you do not have permission to update it"
            )

        # Update the announcement
        supabase_admin = get_supabase_admin()
        update_result = supabase_admin.table("announcements") \
            .update({
                "is_active": body.is_active,
                "updated_at": datetime.utcnow().isoformat(),
            }) \
            .eq("id", announcement_id) \
            .execute()

        if not update_result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update announcement"
            )

        ann = update_result.data[0]
        logger.info(f"Announcement {announcement_id} updated: is_active={body.is_active}")

        return AnnouncementResponse(
            id=ann["id"],
            classroom_id=ann["classroom_id"],
            teacher_id=ann["teacher_id"],
            message_en=ann["message_en"],
            message_ur=ann["message_ur"],
            is_active=ann["is_active"],
            created_at=ann["created_at"],
            updated_at=ann["updated_at"],
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Database error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update announcement"
        )
