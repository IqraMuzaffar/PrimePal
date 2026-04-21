"""
Admin endpoints for managing teachers, classrooms, and curriculum.
All endpoints require admin role verification via get_current_admin dependency.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from datetime import datetime, timedelta, timezone
import secrets

from app.core.security import get_current_admin
from app.core.supabase_client import get_supabase, get_supabase_admin

router = APIRouter(prefix="/admin", tags=["admin"])


# ─────────────────────────────────────────────────────────────
# ADMIN INVITE CODES
# ─────────────────────────────────────────────────────────────

class AdminInviteRequest(BaseModel):
    email: str
    expires_in_days: int = 7


@router.post("/invite-code")
async def create_admin_invite(
    req: AdminInviteRequest,
    current_admin: dict = Depends(get_current_admin),
):
    """Create an invite code for a new admin (self-service from existing admin)."""
    supabase_admin = get_supabase_admin()

    # Generate secure code
    code = secrets.token_urlsafe(24)

    # Insert invite code
    expires_at = datetime.now(tz=timezone.utc) + timedelta(days=req.expires_in_days)

    try:
        result = supabase_admin.table("admin_invite_codes").insert({
            "code": code,
            "email": req.email,
            "created_by": current_admin["id"],
            "expires_at": expires_at.isoformat(),
        }).execute()

        # Log action
        supabase_admin.table("admin_audit_log").insert({
            "admin_id": current_admin["id"],
            "action": "create_invite_code",
            "resource_type": "admin_invite",
            "resource_id": code,
            "details": {"email": req.email},
        }).execute()

        return {
            "code": code,
            "email": req.email,
            "expires_at": expires_at.isoformat(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create invite: {str(e)}")


@router.post("/validate-invite-code")
async def validate_invite_code(code: str):
    """Validate an invite code before signup (public endpoint)."""
    supabase_admin = get_supabase_admin()

    try:
        codes = supabase_admin.table("admin_invite_codes").select("*").eq("code", code).execute()

        if not codes.data:
            raise HTTPException(status_code=400, detail="Invalid invite code")

        code_record = codes.data[0]

        if code_record.get("used_at"):
            raise HTTPException(status_code=400, detail="Invite code already used")

        expires_at = datetime.fromisoformat(code_record["expires_at"])
        if expires_at < datetime.now(tz=timezone.utc):
            raise HTTPException(status_code=400, detail="Invite code expired")

        return {
            "valid": True,
            "email": code_record["email"],
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Validation error: {str(e)}")


# ─────────────────────────────────────────────────────────────
# TEACHER MANAGEMENT
# ─────────────────────────────────────────────────────────────

class TeacherCreateRequest(BaseModel):
    email: str
    full_name: str
    invite_code: str


@router.post("/teachers")
async def create_teacher_via_invite(req: TeacherCreateRequest):
    """Create a new admin account via invite code (public endpoint)."""
    supabase_admin = get_supabase_admin()

    # Verify invite code
    codes = supabase_admin.table("admin_invite_codes").select("*").eq("code", req.invite_code).execute()

    if not codes.data:
        raise HTTPException(status_code=400, detail="Invalid invite code")

    code_record = codes.data[0]
    if code_record.get("used_at"):
        raise HTTPException(status_code=400, detail="Invite code already used")

    expires_at = datetime.fromisoformat(code_record["expires_at"])
    if expires_at < datetime.now(tz=timezone.utc):
        raise HTTPException(status_code=400, detail="Invite code expired")

    try:
        # Create Supabase Auth user
        auth_result = supabase_admin.auth.admin_create_user({
            "email": req.email,
            "password": secrets.token_urlsafe(16),
            "email_confirm": True,
        })

        if not auth_result.user:
            raise HTTPException(status_code=500, detail="Failed to create auth user")

        # Insert into teachers table with role='admin'
        supabase_admin.table("teachers").insert({
            "id": str(auth_result.user.id),
            "email": req.email,
            "full_name": req.full_name,
            "role": "admin",
        }).execute()

        # Mark invite code as used
        supabase_admin.table("admin_invite_codes").update({
            "used_at": datetime.now(tz=timezone.utc).isoformat(),
        }).eq("code", req.invite_code).execute()

        return {
            "id": str(auth_result.user.id),
            "email": req.email,
            "full_name": req.full_name,
            "role": "admin",
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create admin: {str(e)}")


class TeacherEditRequest(BaseModel):
    full_name: str = None
    email: str = None


@router.put("/teachers/{teacher_id}")
async def edit_teacher(
    teacher_id: str,
    req: TeacherEditRequest,
    current_admin: dict = Depends(get_current_admin),
):
    """Edit teacher details."""
    supabase_admin = get_supabase_admin()

    update_data = {}
    if req.full_name:
        update_data["full_name"] = req.full_name
    if req.email:
        update_data["email"] = req.email

    try:
        result = supabase_admin.table("teachers").update(update_data).eq("id", teacher_id).execute()

        supabase_admin.table("admin_audit_log").insert({
            "admin_id": current_admin["id"],
            "action": "edit_teacher",
            "resource_type": "teacher",
            "resource_id": teacher_id,
            "details": update_data,
        }).execute()

        return result.data[0] if result.data else {}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to edit teacher: {str(e)}")


class TeacherDeleteRequest(BaseModel):
    reassign_classrooms_to: str


@router.delete("/teachers/{teacher_id}")
async def delete_teacher(
    teacher_id: str,
    req: TeacherDeleteRequest,
    current_admin: dict = Depends(get_current_admin),
):
    """Delete a teacher and reassign their classrooms."""
    supabase_admin = get_supabase_admin()

    try:
        # Validate target teacher exists
        target = supabase_admin.table("teachers").select("id").eq("id", req.reassign_classrooms_to).execute()
        if not target.data:
            raise HTTPException(status_code=404, detail="Target teacher not found")

        # Get all classrooms for this teacher
        classrooms = supabase_admin.table("classrooms").select("id").eq("teacher_id", teacher_id).execute()

        # Reassign all classrooms
        for classroom in classrooms.data:
            supabase_admin.table("classrooms").update({
                "teacher_id": req.reassign_classrooms_to,
            }).eq("id", classroom["id"]).execute()

        # Delete teacher
        supabase_admin.table("teachers").delete().eq("id", teacher_id).execute()

        # Log action
        supabase_admin.table("admin_audit_log").insert({
            "admin_id": current_admin["id"],
            "action": "delete_teacher",
            "resource_type": "teacher",
            "resource_id": teacher_id,
            "details": {
                "reassigned_to": req.reassign_classrooms_to,
                "classroom_count": len(classrooms.data),
            },
        }).execute()

        return {
            "deleted": True,
            "classrooms_reassigned": len(classrooms.data),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete teacher: {str(e)}")


@router.get("/teachers")
async def list_all_teachers(current_admin: dict = Depends(get_current_admin)):
    """List all teachers (admin only)."""
    supabase = get_supabase()

    try:
        result = supabase.table("teachers").select("*").execute()
        return result.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch teachers: {str(e)}")


# ─────────────────────────────────────────────────────────────
# CLASSROOM MANAGEMENT
# ─────────────────────────────────────────────────────────────

class ClassroomReassignRequest(BaseModel):
    teacher_id: str


@router.put("/classrooms/{classroom_id}/reassign")
async def reassign_classroom(
    classroom_id: str,
    req: ClassroomReassignRequest,
    current_admin: dict = Depends(get_current_admin),
):
    """Reassign a classroom to a different teacher."""
    supabase_admin = get_supabase_admin()

    try:
        # Validate target teacher exists
        target = supabase_admin.table("teachers").select("id").eq("id", req.teacher_id).execute()
        if not target.data:
            raise HTTPException(status_code=404, detail="Target teacher not found")

        # Reassign classroom
        result = supabase_admin.table("classrooms").update({
            "teacher_id": req.teacher_id,
        }).eq("id", classroom_id).execute()

        # Log action
        supabase_admin.table("admin_audit_log").insert({
            "admin_id": current_admin["id"],
            "action": "reassign_classroom",
            "resource_type": "classroom",
            "resource_id": classroom_id,
            "details": {"new_teacher_id": req.teacher_id},
        }).execute()

        return result.data[0] if result.data else {}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reassign classroom: {str(e)}")


@router.get("/classrooms")
async def list_all_classrooms(current_admin: dict = Depends(get_current_admin)):
    """List all classrooms (admin only)."""
    supabase = get_supabase()

    try:
        result = supabase.table("classrooms").select("*,teachers(full_name)").execute()
        return result.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch classrooms: {str(e)}")


# ─────────────────────────────────────────────────────────────
# CURRICULUM MANAGEMENT
# ─────────────────────────────────────────────────────────────

@router.delete("/curriculum/{chunk_id}")
async def delete_curriculum_chunk(
    chunk_id: str,
    current_admin: dict = Depends(get_current_admin),
):
    """Delete a curriculum chunk from knowledge base."""
    supabase_admin = get_supabase_admin()

    try:
        # Delete from snc_knowledge_base
        supabase_admin.table("snc_knowledge_base").delete().eq("id", chunk_id).execute()

        # Log action
        supabase_admin.table("admin_audit_log").insert({
            "admin_id": current_admin["id"],
            "action": "delete_curriculum",
            "resource_type": "curriculum",
            "resource_id": chunk_id,
            "details": {},
        }).execute()

        return {"deleted": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete curriculum: {str(e)}")


@router.get("/curriculum")
async def list_all_curriculum(current_admin: dict = Depends(get_current_admin)):
    """List all curriculum chunks (admin only)."""
    supabase = get_supabase()

    try:
        result = supabase.table("snc_knowledge_base").select("*").execute()
        return result.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch curriculum: {str(e)}")
