"""
Admin endpoints for managing teachers, classrooms, students, and curriculum.
All endpoints require admin role verification via get_current_admin dependency.
"""

import os
import tempfile
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from pydantic import BaseModel
from datetime import datetime, timedelta, timezone
from typing import Optional
import random
import secrets
import string

from langchain_community.document_loaders import PyPDFLoader

from app.agents.curriculum_agent.ingestion import chunk_documents
from app.agents.curriculum_agent.embedder import embed_and_store_chunks
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
    password: str
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
        # Create Supabase Auth user with provided password
        auth_result = supabase_admin.auth.admin_create_user({
            "email": req.email,
            "password": req.password,
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


# ─────────────────────────────────────────────────────────────
# CURRICULUM UPLOAD & RAG PIPELINE MANAGEMENT (A03)
# ─────────────────────────────────────────────────────────────

def _update_upload_status(
    supabase_admin,
    upload_id: str,
    status_val: str,
    error_message: str | None = None,
    total_chunks: int | None = None,
) -> None:
    """Update the status of an snc_uploads record. Non-fatal on error."""
    try:
        update: dict = {
            "status": status_val,
            "updated_at": datetime.now(tz=timezone.utc).isoformat(),
        }
        if error_message is not None:
            update["error_message"] = error_message
        if total_chunks is not None:
            update["total_chunks"] = total_chunks
        supabase_admin.table("snc_uploads").update(update).eq("id", upload_id).execute()
    except Exception:
        pass  # status tracking is non-fatal


@router.post("/curriculum/upload")
async def admin_upload_curriculum(
    file: UploadFile = File(...),
    grade_level: int = Form(...),
    book_title: str = Form(...),
    current_admin: dict = Depends(get_current_admin),
):
    """
    Admin-only: upload a PDF textbook and run the full RAG pipeline.
    Creates snc_uploads record and updates status at each stage.
    """
    filename = file.filename or ""
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are accepted.",
        )
    if not (1 <= grade_level <= 5):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="grade_level must be between 1 and 5.",
        )

    supabase_admin = get_supabase_admin()

    # Create upload record with status='pending'
    upload_record = supabase_admin.table("snc_uploads").insert({
        "teacher_id": current_admin["id"],
        "book_title": book_title.strip(),
        "grade_level": grade_level,
        "filename": filename,
        "total_chunks": 0,
        "embedded_count": 0,
        "status": "pending",
    }).execute()

    if not upload_record.data:
        raise HTTPException(status_code=500, detail="Failed to create upload record.")

    upload_id = upload_record.data[0]["id"]
    content = await file.read()
    tmp_path: str | None = None

    try:
        # Stage: extracting
        _update_upload_status(supabase_admin, upload_id, "extracting")

        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            tmp.write(content)
            tmp_path = tmp.name

        # Upload raw PDF to storage (non-fatal)
        storage_path = f"grade_{grade_level}/{filename}"
        try:
            supabase_admin.storage.from_("snc-textbooks").upload(
                storage_path,
                content,
                {"content-type": "application/pdf"},
            )
        except Exception:
            pass

        loader = PyPDFLoader(tmp_path)
        documents = loader.load()

        # Stage: chunking
        _update_upload_status(supabase_admin, upload_id, "chunking")
        processed_chunks = chunk_documents(documents, grade_level, book_title.strip())

        _update_upload_status(
            supabase_admin, upload_id, "embedding",
            total_chunks=len(processed_chunks),
        )

    except Exception as e:
        _update_upload_status(supabase_admin, upload_id, "failed", error_message=str(e))
        raise HTTPException(status_code=500, detail=f"Pipeline failed during extraction/chunking: {str(e)}")
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)

    # Stage: embedding
    try:
        embedded_count = await embed_and_store_chunks(processed_chunks, supabase_admin)
    except Exception as e:
        _update_upload_status(supabase_admin, upload_id, "failed", error_message=f"Embedding failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Embedding failed: {str(e)}")

    # Stage: success
    try:
        supabase_admin.table("snc_uploads").update({
            "status": "success",
            "total_chunks": len(processed_chunks),
            "embedded_count": embedded_count,
            "updated_at": datetime.now(tz=timezone.utc).isoformat(),
        }).eq("id", upload_id).execute()
    except Exception:
        pass

    # Log admin action
    try:
        supabase_admin.table("admin_audit_log").insert({
            "admin_id": current_admin["id"],
            "action": "upload_curriculum",
            "resource_type": "curriculum",
            "resource_id": upload_id,
            "details": {
                "book_title": book_title.strip(),
                "grade_level": grade_level,
                "total_chunks": len(processed_chunks),
                "embedded_count": embedded_count,
            },
        }).execute()
    except Exception:
        pass

    return {
        "id": upload_id,
        "status": "success",
        "book_title": book_title.strip(),
        "grade_level": grade_level,
        "filename": filename,
        "total_chunks": len(processed_chunks),
        "embedded_count": embedded_count,
    }


@router.get("/curriculum/books")
async def list_uploaded_books(
    current_admin: dict = Depends(get_current_admin),
):
    """List all uploaded books from snc_uploads, ordered by grade then date."""
    supabase_admin = get_supabase_admin()

    try:
        result = (
            supabase_admin.table("snc_uploads")
            .select("id, filename, grade_level, book_title, total_chunks, status, error_message, created_at")
            .order("grade_level", desc=False)
            .order("created_at", desc=True)
            .execute()
        )
        return result.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch books: {str(e)}")


@router.get("/curriculum/books/{book_id}/chunks")
async def get_book_chunks(
    book_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_admin: dict = Depends(get_current_admin),
):
    """Paginated chunk viewer for a specific book."""
    supabase_admin = get_supabase_admin()

    # First get the book to find its title
    try:
        book_result = supabase_admin.table("snc_uploads").select("book_title").eq("id", book_id).execute()
        if not book_result.data:
            raise HTTPException(status_code=404, detail="Book not found")
        book_title = book_result.data[0]["book_title"]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch book: {str(e)}")

    # Fetch chunks with pagination
    offset = (page - 1) * page_size
    try:
        # Get total count
        count_result = (
            supabase_admin.table("snc_knowledge_base")
            .select("id", count="exact")
            .filter("metadata->>book_title", "eq", book_title)
            .execute()
        )
        total = count_result.count or 0

        # Get paginated chunks
        chunks_result = (
            supabase_admin.table("snc_knowledge_base")
            .select("id, content, metadata")
            .filter("metadata->>book_title", "eq", book_title)
            .range(offset, offset + page_size - 1)
            .execute()
        )

        chunks = []
        for chunk in chunks_result.data:
            chunks.append({
                "id": chunk["id"],
                "content_preview": chunk["content"][:200] + ("..." if len(chunk["content"]) > 200 else ""),
                "content": chunk["content"],
                "metadata": chunk["metadata"],
            })

        return {
            "chunks": chunks,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size if total > 0 else 0,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch chunks: {str(e)}")


@router.delete("/curriculum/books/{book_id}")
async def delete_book(
    book_id: str,
    current_admin: dict = Depends(get_current_admin),
):
    """Delete a book and all its chunks from the knowledge base."""
    supabase_admin = get_supabase_admin()

    try:
        # Get book title to find associated chunks
        book_result = supabase_admin.table("snc_uploads").select("book_title").eq("id", book_id).execute()
        if not book_result.data:
            raise HTTPException(status_code=404, detail="Book not found")
        book_title = book_result.data[0]["book_title"]

        # Delete all chunks for this book
        supabase_admin.table("snc_knowledge_base").delete().filter(
            "metadata->>book_title", "eq", book_title
        ).execute()

        # Delete the upload record
        supabase_admin.table("snc_uploads").delete().eq("id", book_id).execute()

        # Log action
        supabase_admin.table("admin_audit_log").insert({
            "admin_id": current_admin["id"],
            "action": "delete_book",
            "resource_type": "curriculum",
            "resource_id": book_id,
            "details": {"book_title": book_title},
        }).execute()

        return {"deleted": True, "book_title": book_title}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete book: {str(e)}")


@router.get("/curriculum/books/{book_id}/status")
async def get_book_status(
    book_id: str,
    current_admin: dict = Depends(get_current_admin),
):
    """Poll upload status for a specific book."""
    supabase_admin = get_supabase_admin()

    try:
        result = (
            supabase_admin.table("snc_uploads")
            .select("id, status, error_message, total_chunks, updated_at")
            .eq("id", book_id)
            .execute()
        )
        if not result.data:
            raise HTTPException(status_code=404, detail="Book not found")
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch status: {str(e)}")


# ─────────────────────────────────────────────────────────────
# STUDENT MANAGEMENT
# ─────────────────────────────────────────────────────────────

def _generate_pin() -> str:
    """Generate a random 4-digit PIN string."""
    return str(random.randint(1000, 9999))


class StudentCreateRequest(BaseModel):
    student_name: str
    classroom_id: str
    roll_number: Optional[str] = None
    email: Optional[str] = None


class StudentEditRequest(BaseModel):
    student_name: Optional[str] = None
    roll_number: Optional[str] = None
    email: Optional[str] = None
    classroom_id: Optional[str] = None


@router.get("/students")
async def list_all_students(
    q: Optional[str] = Query(None, description="Search by name or roll number"),
    grade_level: Optional[int] = Query(None),
    classroom_id: Optional[str] = Query(None),
    current_admin: dict = Depends(get_current_admin),
):
    """List all students with optional search and filters."""
    supabase_admin = get_supabase_admin()

    try:
        query = supabase_admin.table("students").select(
            "id, student_name, roll_number, email, classroom_id, secret_pin, created_at, "
            "classrooms(id, class_name, grade_level)"
        )

        if classroom_id:
            query = query.eq("classroom_id", classroom_id)

        result = query.execute()
        students = result.data or []

        # Apply grade_level filter (from joined classroom)
        if grade_level is not None:
            students = [
                s for s in students
                if s.get("classrooms") and s["classrooms"].get("grade_level") == grade_level
            ]

        # Apply text search filter
        if q:
            q_lower = q.lower()
            students = [
                s for s in students
                if q_lower in (s.get("student_name") or "").lower()
                or q_lower in (s.get("roll_number") or "").lower()
            ]

        # Flatten classroom info for frontend convenience
        for s in students:
            classroom = s.pop("classrooms", None) or {}
            s["classroom_name"] = classroom.get("class_name", "")
            s["grade_level"] = classroom.get("grade_level", None)

        return students
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch students: {str(e)}")


@router.post("/students")
async def create_student(
    req: StudentCreateRequest,
    current_admin: dict = Depends(get_current_admin),
):
    """Create a single student with auto-generated PIN."""
    supabase_admin = get_supabase_admin()

    try:
        # Verify classroom exists
        classroom = supabase_admin.table("classrooms").select("id").eq("id", req.classroom_id).execute()
        if not classroom.data:
            raise HTTPException(status_code=404, detail="Classroom not found")

        pin = _generate_pin()
        row = {
            "student_name": req.student_name.strip(),
            "classroom_id": req.classroom_id,
            "secret_pin": pin,
            "avatar_url": f"https://api.dicebear.com/8.x/adventurer/svg?seed={req.student_name.strip()}",
        }
        if req.roll_number:
            row["roll_number"] = req.roll_number.strip()
        if req.email:
            row["email"] = req.email.strip()

        result = supabase_admin.table("students").insert(row).execute()

        supabase_admin.table("admin_audit_log").insert({
            "admin_id": current_admin["id"],
            "action": "create_student",
            "resource_type": "student",
            "resource_id": result.data[0]["id"] if result.data else "",
            "details": {"student_name": req.student_name, "classroom_id": req.classroom_id},
        }).execute()

        return result.data[0] if result.data else {}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create student: {str(e)}")


@router.put("/students/{student_id}")
async def edit_student(
    student_id: str,
    req: StudentEditRequest,
    current_admin: dict = Depends(get_current_admin),
):
    """Edit student details. Changing classroom_id transfers the student."""
    supabase_admin = get_supabase_admin()

    update_data = {}
    if req.student_name is not None:
        update_data["student_name"] = req.student_name.strip()
    if req.roll_number is not None:
        update_data["roll_number"] = req.roll_number.strip() if req.roll_number else None
    if req.email is not None:
        update_data["email"] = req.email.strip() if req.email else None
    if req.classroom_id is not None:
        # Verify target classroom exists
        classroom = supabase_admin.table("classrooms").select("id").eq("id", req.classroom_id).execute()
        if not classroom.data:
            raise HTTPException(status_code=404, detail="Target classroom not found")
        update_data["classroom_id"] = req.classroom_id

    if not update_data:
        raise HTTPException(status_code=422, detail="No fields to update")

    try:
        result = supabase_admin.table("students").update(update_data).eq("id", student_id).execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Student not found")

        supabase_admin.table("admin_audit_log").insert({
            "admin_id": current_admin["id"],
            "action": "edit_student",
            "resource_type": "student",
            "resource_id": student_id,
            "details": update_data,
        }).execute()

        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to edit student: {str(e)}")


@router.delete("/students/{student_id}")
async def delete_student(
    student_id: str,
    current_admin: dict = Depends(get_current_admin),
):
    """Delete a student."""
    supabase_admin = get_supabase_admin()

    try:
        result = supabase_admin.table("students").delete().eq("id", student_id).execute()

        if result.data is not None and len(result.data) == 0:
            raise HTTPException(status_code=404, detail="Student not found")

        supabase_admin.table("admin_audit_log").insert({
            "admin_id": current_admin["id"],
            "action": "delete_student",
            "resource_type": "student",
            "resource_id": student_id,
            "details": {},
        }).execute()

        return {"deleted": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete student: {str(e)}")


@router.post("/students/{student_id}/reset-pin")
async def reset_student_pin(
    student_id: str,
    current_admin: dict = Depends(get_current_admin),
):
    """Reset a student's PIN to a new random 4-digit code."""
    supabase_admin = get_supabase_admin()

    try:
        new_pin = _generate_pin()
        result = supabase_admin.table("students").update(
            {"secret_pin": new_pin}
        ).eq("id", student_id).execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Student not found")

        supabase_admin.table("admin_audit_log").insert({
            "admin_id": current_admin["id"],
            "action": "reset_student_pin",
            "resource_type": "student",
            "resource_id": student_id,
            "details": {},
        }).execute()

        return {"new_pin": new_pin}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reset PIN: {str(e)}")


# ─────────────────────────────────────────────────────────────
# CLASSROOM CRUD (Admin)
# ─────────────────────────────────────────────────────────────

def _generate_class_code() -> str:
    """Generate a random 6-character alphanumeric class code."""
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=6))


class ClassroomCreateRequest(BaseModel):
    class_name: str
    grade_level: int
    teacher_id: str
    section: Optional[str] = None


class ClassroomEditRequest(BaseModel):
    class_name: Optional[str] = None
    grade_level: Optional[int] = None
    section: Optional[str] = None


@router.post("/classrooms")
async def create_classroom(
    req: ClassroomCreateRequest,
    current_admin: dict = Depends(get_current_admin),
):
    """Create a new classroom (admin)."""
    supabase_admin = get_supabase_admin()

    try:
        # Verify teacher exists
        teacher = supabase_admin.table("teachers").select("id").eq("id", req.teacher_id).execute()
        if not teacher.data:
            raise HTTPException(status_code=404, detail="Teacher not found")

        # Generate unique class code with retries
        class_code = None
        for _ in range(10):
            candidate = _generate_class_code()
            existing = supabase_admin.table("classrooms").select("id").eq("class_code", candidate).execute()
            if not existing.data:
                class_code = candidate
                break

        if not class_code:
            raise HTTPException(status_code=500, detail="Failed to generate unique class code")

        row = {
            "class_name": req.class_name.strip(),
            "grade_level": req.grade_level,
            "teacher_id": req.teacher_id,
            "class_code": class_code,
        }
        if req.section:
            row["section"] = req.section.strip()

        result = supabase_admin.table("classrooms").insert(row).execute()

        supabase_admin.table("admin_audit_log").insert({
            "admin_id": current_admin["id"],
            "action": "create_classroom",
            "resource_type": "classroom",
            "resource_id": result.data[0]["id"] if result.data else "",
            "details": {"class_name": req.class_name, "teacher_id": req.teacher_id},
        }).execute()

        return result.data[0] if result.data else {}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create classroom: {str(e)}")


@router.put("/classrooms/{classroom_id}")
async def edit_classroom(
    classroom_id: str,
    req: ClassroomEditRequest,
    current_admin: dict = Depends(get_current_admin),
):
    """Edit classroom details."""
    supabase_admin = get_supabase_admin()

    update_data = {}
    if req.class_name is not None:
        update_data["class_name"] = req.class_name.strip()
    if req.grade_level is not None:
        update_data["grade_level"] = req.grade_level
    if req.section is not None:
        update_data["section"] = req.section.strip() if req.section else None

    if not update_data:
        raise HTTPException(status_code=422, detail="No fields to update")

    try:
        result = supabase_admin.table("classrooms").update(update_data).eq("id", classroom_id).execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Classroom not found")

        supabase_admin.table("admin_audit_log").insert({
            "admin_id": current_admin["id"],
            "action": "edit_classroom",
            "resource_type": "classroom",
            "resource_id": classroom_id,
            "details": update_data,
        }).execute()

        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to edit classroom: {str(e)}")


@router.delete("/classrooms/{classroom_id}")
async def delete_classroom(
    classroom_id: str,
    current_admin: dict = Depends(get_current_admin),
):
    """Delete a classroom. Returns 409 if students still exist in it."""
    supabase_admin = get_supabase_admin()

    try:
        # Check for students
        students = supabase_admin.table("students").select("id").eq("classroom_id", classroom_id).execute()
        if students.data and len(students.data) > 0:
            raise HTTPException(
                status_code=409,
                detail=f"Cannot delete classroom with {len(students.data)} student(s). Remove or transfer students first.",
            )

        result = supabase_admin.table("classrooms").delete().eq("id", classroom_id).execute()

        if result.data is not None and len(result.data) == 0:
            raise HTTPException(status_code=404, detail="Classroom not found")

        supabase_admin.table("admin_audit_log").insert({
            "admin_id": current_admin["id"],
            "action": "delete_classroom",
            "resource_type": "classroom",
            "resource_id": classroom_id,
            "details": {},
        }).execute()

        return {"deleted": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete classroom: {str(e)}")
