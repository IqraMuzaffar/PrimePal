"""
Feature 3 & 4: SNC Document Ingestion + Vector Storage (Agent A — Curriculum Guardrail)

Feature 3: Accept SNC PDF uploads, extract + chunk text.
Feature 4: Embed chunks and store in Supabase pgvector (snc_knowledge_base).
           After this feature, one /upload call triggers the full pipeline:
           PDF → extract → chunk → embed → store.
"""
import os
import tempfile
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from langchain_community.document_loaders import PyPDFLoader
from pydantic import BaseModel

from app.agents.curriculum_agent.embedder import embed_and_store_chunks
from app.agents.curriculum_agent.ingestion import chunk_documents
from app.core.security import get_current_teacher
from app.core.supabase_client import get_supabase_admin

def _log_upload(
    supabase,
    teacher_id: str,
    book_title: str,
    grade_level: int,
    filename: str,
    total_chunks: int,
    embedded_count: int,
) -> None:
    """Insert one row into snc_uploads. Non-fatal — errors are swallowed."""
    try:
        supabase.table("snc_uploads").insert({
            "teacher_id": teacher_id,
            "book_title": book_title,
            "grade_level": grade_level,
            "filename": filename,
            "total_chunks": total_chunks,
            "embedded_count": embedded_count,
        }).execute()
    except Exception:
        pass  # history logging is non-fatal


router = APIRouter()


# ── Pydantic models for /embed ─────────────────────────────────────────────────

class ChunkInput(BaseModel):
    content: str
    metadata: Dict[str, Any]


class EmbedRequest(BaseModel):
    chunks: List[ChunkInput]


# ── POST /upload  (Feature 3 + Feature 4 integrated pipeline) ─────────────────

@router.post("/upload", status_code=200)
async def upload_snc_textbook(
    file: UploadFile = File(...),
    grade_level: int = Form(...),
    book_title: str = Form(...),
    teacher: dict = Depends(get_current_teacher),
):
    """
    Full pipeline: accept a PDF → extract text → chunk → embed → store in pgvector.

    Steps:
    1. Validate file (.pdf only) and grade_level (1–6).
    2. Upload raw PDF to Supabase Storage for auditing.
    3. Extract text via PyPDF.
    4. Chunk via RecursiveCharacterTextSplitter with SNC metadata.
    5. Generate embeddings (OpenAI text-embedding-3-small) and insert into snc_knowledge_base.
    """
    # ── 1. Validate ────────────────────────────────────────────────────────────
    filename = file.filename or ""
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are accepted. Please upload a .pdf file.",
        )
    if not (1 <= grade_level <= 6):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="grade_level must be between 1 and 6.",
        )

    content = await file.read()
    tmp_path: str | None = None

    try:
        # ── 2. Write to temp file (PyPDFLoader reads from disk) ───────────────
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            tmp.write(content)
            tmp_path = tmp.name

        # ── 3. Upload raw PDF to Supabase Storage for auditing ─────────────────
        supabase = get_supabase_admin()
        storage_path = f"grade_{grade_level}/{filename}"
        try:
            supabase.storage.from_("snc-textbooks").upload(
                storage_path,
                content,
                {"content-type": "application/pdf"},
            )
        except Exception:
            # Storage upload failure is non-fatal — processing continues.
            pass

        # ── 4. Extract text ────────────────────────────────────────────────────
        loader = PyPDFLoader(tmp_path)
        documents = loader.load()

        # ── 5. Chunk and apply metadata ────────────────────────────────────────
        processed_chunks = chunk_documents(documents, grade_level, book_title.strip())

    finally:
        # Always clean up the temp file to prevent disk leaks
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)

    # ── 6. Embed and store in pgvector ────────────────────────────────────────
    # Runs after temp file cleanup — supabase admin client is reused.
    try:
        embedded_count = await embed_and_store_chunks(processed_chunks, supabase)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Chunking succeeded but embedding failed: {str(e)}",
        )

    # ── 7. Log to upload history ──────────────────────────────────────────────
    _log_upload(
        supabase=supabase,
        teacher_id=teacher["id"],
        book_title=book_title.strip(),
        grade_level=grade_level,
        filename=filename,
        total_chunks=len(processed_chunks),
        embedded_count=embedded_count,
    )

    return {
        "status": "success",
        "message": (
            f"Successfully processed {len(processed_chunks)} chunks "
            f"and stored {embedded_count} embeddings."
        ),
        "total_chunks": len(processed_chunks),
        "embedded_count": embedded_count,
        "sample_chunk": processed_chunks[0] if processed_chunks else None,
    }


# ── POST /embed  (Feature 4 standalone — embed pre-processed chunks) ──────────

@router.post("/embed", status_code=200)
async def embed_chunks(
    request: EmbedRequest,
    teacher: dict = Depends(get_current_teacher),
):
    """
    Standalone embedding endpoint: accepts pre-processed chunks, embeds them,
    and stores in snc_knowledge_base. Used for re-processing or batch uploads.
    """
    if not request.chunks:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No chunks provided for embedding.",
        )

    chunks_as_dicts = [
        {"content": c.content, "metadata": c.metadata}
        for c in request.chunks
    ]

    try:
        supabase = get_supabase_admin()
        embedded_count = await embed_and_store_chunks(chunks_as_dicts, supabase)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Vector embedding failed: {str(e)}",
        )

    return {
        "status": "success",
        "message": f"Successfully embedded and stored {embedded_count} chunks.",
        "embedded_count": embedded_count,
    }


# ── GET /uploads  — upload history for the current teacher ────────────────────

@router.get("/uploads", status_code=200)
async def get_uploads(
    grade_level: int | None = None,
    teacher: dict = Depends(get_current_teacher),
):
    """
    Return all snc_uploads rows for the current teacher, newest first.
    Optional query param: ?grade_level=3 to filter to one grade.
    """
    supabase = get_supabase_admin()
    teacher_id: str = teacher["id"]

    query = (
        supabase.table("snc_uploads")
        .select("id, book_title, grade_level, filename, total_chunks, embedded_count, created_at")
        .eq("teacher_id", teacher_id)
    )
    if grade_level is not None:
        query = query.eq("grade_level", grade_level)

    result = query.order("created_at", desc=True).execute()
    return result.data
