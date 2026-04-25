"""
Announcements endpoint — Bilingual announcement board for classrooms.
Teachers can post announcements in English; system auto-translates to Urdu.
Supports three scope levels: specific classroom, grade level, or school-wide.
Students see active announcements on their home dashboard.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, validator
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
    message_en: str
    scope: str  # "classroom", "grade_level", or "school_wide"
    classroom_id: Optional[str] = None  # Required if scope="classroom"
    target_grade_level: Optional[int] = None  # Required if scope="grade_level"

    @validator("scope")
    def validate_scope(cls, v):
        if v not in ["classroom", "grade_level", "school_wide"]:
            raise ValueError("scope must be 'classroom', 'grade_level', or 'school_wide'")
        return v


class AnnouncementResponse(BaseModel):
    id: str
    classroom_id: Optional[str]
    teacher_id: str
    message_en: str
    message_ur: str
    scope: str
    target_grade_level: Optional[int]
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


async def _get_teacher_classrooms(teacher_id: str) -> List[dict]:
    """Get all classrooms owned by a teacher."""
    supabase = get_supabase()
    try:
        result = supabase.table("classrooms").select("id, grade_level").eq("teacher_id", teacher_id).execute()
        return result.data or []
    except Exception as e:
        logger.error(f"Error fetching teacher classrooms: {str(e)}")
        return []


# ──────────────────────────────────────────────────────────────────────────────
# Endpoints
# ──────────────────────────────────────────────────────────────────────────────

@router.post("", response_model=AnnouncementResponse, status_code=status.HTTP_201_CREATED)
async def create_announcement(
    body: AnnouncementCreate,
    teacher: dict = Depends(get_current_teacher),
) -> AnnouncementResponse:
    """
    Create a new bilingual announcement with scope support.

    Scopes:
    - "classroom": Post to a specific classroom (requires classroom_id)
    - "grade_level": Post to all classrooms at a specific grade (requires target_grade_level)
    - "school_wide": Post to all classrooms owned by this teacher

    The endpoint:
    1. Validates the scope and required parameters
    2. Translates the English message to Urdu using OpenAI
    3. Inserts the record into the announcements table
    4. Returns the created announcement

    Args:
        body: AnnouncementCreate with message_en, scope, and scope-specific params
        teacher: Current authenticated teacher (from JWT)

    Returns:
        AnnouncementResponse with both English and Urdu messages
    """
    teacher_id = teacher["id"]
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

    # Validate scope-specific parameters
    if body.scope == "classroom":
        if not body.classroom_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="classroom_id is required for classroom scope"
            )
        # Verify teacher owns the classroom
        owns_classroom = await _verify_classroom_ownership(body.classroom_id, teacher_id)
        if not owns_classroom:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to post announcements to this classroom"
            )
    elif body.scope == "grade_level":
        if body.target_grade_level is None or body.target_grade_level < 1 or body.target_grade_level > 8:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="target_grade_level must be between 1 and 8"
            )
    elif body.scope == "school_wide":
        # No additional validation needed for school-wide
        pass

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
            "classroom_id": body.classroom_id,
            "teacher_id": teacher_id,
            "message_en": message_en,
            "message_ur": message_ur,
            "scope": body.scope,
            "target_grade_level": body.target_grade_level,
            "is_active": True,
        }).execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create announcement"
            )

        announcement_data = result.data[0]
        logger.info(f"Announcement created: {announcement_data['id']} (scope={body.scope})")

        return AnnouncementResponse(
            id=announcement_data["id"],
            classroom_id=announcement_data["classroom_id"],
            teacher_id=announcement_data["teacher_id"],
            message_en=announcement_data["message_en"],
            message_ur=announcement_data["message_ur"],
            scope=announcement_data["scope"],
            target_grade_level=announcement_data["target_grade_level"],
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


@router.get("", response_model=AnnouncementsList)
async def get_teacher_announcements(
    teacher: dict = Depends(get_current_teacher),
) -> AnnouncementsList:
    """
    Fetch all announcements (active and inactive) for the authenticated teacher.
    Returns announcements across all scopes (classroom, grade_level, school_wide).

    Sorted by created_at DESC (newest first).

    Args:
        teacher: Current authenticated teacher (from JWT)

    Returns:
        AnnouncementsList with all announcements created by this teacher
    """
    teacher_id = teacher["id"]

    # Fetch announcements
    supabase = get_supabase()
    try:
        result = supabase.table("announcements") \
            .select("*") \
            .eq("teacher_id", teacher_id) \
            .order("created_at", desc=True) \
            .execute()

        announcements = [
            AnnouncementResponse(
                id=ann["id"],
                classroom_id=ann["classroom_id"],
                teacher_id=ann["teacher_id"],
                message_en=ann["message_en"],
                message_ur=ann["message_ur"],
                scope=ann["scope"],
                target_grade_level=ann["target_grade_level"],
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


@router.get("/classroom/{classroom_id}", response_model=AnnouncementsList)
async def get_classroom_announcements(
    classroom_id: str,
    teacher: dict = Depends(get_current_teacher),
) -> AnnouncementsList:
    """
    Fetch all announcements for a specific classroom.
    Includes classroom-scoped, grade-level-scoped, and school-wide announcements.

    Args:
        classroom_id: UUID of the classroom
        teacher: Current authenticated teacher (from JWT)

    Returns:
        AnnouncementsList with all relevant announcements
    """
    teacher_id = teacher["id"]

    # Verify teacher owns the classroom
    owns_classroom = await _verify_classroom_ownership(classroom_id, teacher_id)
    if not owns_classroom:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view announcements for this classroom"
        )

    # Get classroom grade level
    supabase = get_supabase()
    try:
        classroom_result = supabase.table("classrooms").select("grade_level").eq("id", classroom_id).execute()
        if not classroom_result.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")
        grade_level = classroom_result.data[0]["grade_level"]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Database error: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch classroom")

    # Fetch announcements for this classroom (including grade-level and school-wide)
    try:
        result = supabase.table("announcements") \
            .select("*") \
            .eq("teacher_id", teacher_id) \
            .or_(f"classroom_id.eq.{classroom_id},scope.eq.grade_level,scope.eq.school_wide") \
            .execute()

        # Filter to only relevant announcements
        announcements = []
        for ann in result.data:
            # Include if: specific classroom match OR (grade-level match AND matches grade) OR (school-wide)
            if (ann["classroom_id"] == classroom_id or
                (ann["scope"] == "grade_level" and ann["target_grade_level"] == grade_level) or
                ann["scope"] == "school_wide"):
                announcements.append(AnnouncementResponse(
                    id=ann["id"],
                    classroom_id=ann["classroom_id"],
                    teacher_id=ann["teacher_id"],
                    message_en=ann["message_en"],
                    message_ur=ann["message_ur"],
                    scope=ann["scope"],
                    target_grade_level=ann["target_grade_level"],
                    is_active=ann["is_active"],
                    created_at=ann["created_at"],
                    updated_at=ann["updated_at"],
                ))

        # Sort by created_at DESC
        announcements.sort(key=lambda x: x.created_at, reverse=True)

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


@router.get("/active/{classroom_id}")
async def get_latest_active_announcement(classroom_id: str):
    """
    Fetch the latest active announcement for a student's classroom.

    **Public endpoint** — no authentication required.
    Accessed by student frontend to display announcement on home dashboard.

    Returns the most recent active announcement that applies to this classroom:
    1. Classroom-specific announcements
    2. Grade-level announcements (matching classroom grade)
    3. School-wide announcements

    Args:
        classroom_id: UUID of the classroom

    Returns:
        Single announcement object or null if no active announcement
    """
    supabase_admin = get_supabase_admin()
    try:
        # Get classroom grade level and teacher
        classroom_result = supabase_admin.table("classrooms").select("grade_level, teacher_id").eq("id", classroom_id).execute()
        if not classroom_result.data:
            return None

        grade_level = classroom_result.data[0]["grade_level"]
        teacher_id = classroom_result.data[0]["teacher_id"]

        # Fetch active announcements for this teacher
        result = supabase_admin.table("announcements") \
            .select("*") \
            .eq("teacher_id", teacher_id) \
            .eq("is_active", True) \
            .order("created_at", desc=True) \
            .execute()

        # Find the most recent relevant announcement
        for ann in result.data:
            if (ann["classroom_id"] == classroom_id or
                (ann["scope"] == "grade_level" and ann["target_grade_level"] == grade_level) or
                ann["scope"] == "school_wide"):
                return AnnouncementResponse(
                    id=ann["id"],
                    classroom_id=ann["classroom_id"],
                    teacher_id=ann["teacher_id"],
                    message_en=ann["message_en"],
                    message_ur=ann["message_ur"],
                    scope=ann["scope"],
                    target_grade_level=ann["target_grade_level"],
                    is_active=ann["is_active"],
                    created_at=ann["created_at"],
                    updated_at=ann["updated_at"],
                )

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
            scope=ann["scope"],
            target_grade_level=ann["target_grade_level"],
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
