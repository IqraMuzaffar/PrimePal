"""
Feature 3 & 4: SNC Document Ingestion + Vector Storage (Agent A — Curriculum Guardrail)

Feature 3 (this file): Accept SNC PDF uploads, extract + chunk text, return processed chunks.
Feature 4 (embedder.py): Embed chunks and store in Qdrant (stub — not yet implemented).
"""
import os
import tempfile

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from langchain_community.document_loaders import PyMuPDFLoader

from app.agents.curriculum_agent.ingestion import chunk_documents
from app.core.security import get_current_teacher
from app.core.supabase_client import get_supabase_admin

router = APIRouter()


@router.post("/upload", status_code=200)
async def upload_snc_textbook(
    file: UploadFile = File(...),
    grade_level: int = Form(...),
    book_title: str = Form(...),
    teacher: dict = Depends(get_current_teacher),
):
    """
    Accept an SNC PDF textbook, upload it to Supabase Storage for auditing,
    extract its text via PyMuPDF, chunk it, and return the processed chunks.

    Feature 4 will consume the returned chunks for embedding into Qdrant.
    """
    # ── 1. Validate file type ──────────────────────────────────────────────────
    filename = file.filename or ""
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are accepted. Please upload a .pdf file.",
        )

    # ── 2. Validate grade level ────────────────────────────────────────────────
    if not (1 <= grade_level <= 6):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="grade_level must be between 1 and 6.",
        )

    content = await file.read()
    tmp_path: str | None = None

    try:
        # ── 3. Write to temp file (PyMuPDFLoader reads from disk) ──────────────
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            tmp.write(content)
            tmp_path = tmp.name

        # ── 4. Upload raw PDF to Supabase Storage for auditing ─────────────────
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
            # The chunks are still useful even if backup fails.
            pass

        # ── 5. Extract text ────────────────────────────────────────────────────
        loader = PyMuPDFLoader(tmp_path)
        documents = loader.load()

        # ── 6. Chunk and apply metadata ────────────────────────────────────────
        processed_chunks = chunk_documents(documents, grade_level, book_title.strip())

    finally:
        # Always clean up the temp file to prevent disk leaks
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)

    return {
        "status": "success",
        "message": f"Successfully processed {len(processed_chunks)} chunks.",
        "total_chunks": len(processed_chunks),
        "sample_chunk": processed_chunks[0] if processed_chunks else None,
    }


# ── Feature 4 stubs (will be implemented next) ────────────────────────────────

@router.get("/query")
async def query_curriculum(grade: int, week: int, topic: str | None = None):
    # Feature 4: retrieve SNC-tagged chunks from Qdrant
    raise NotImplementedError


@router.get("/collections")
async def list_collections():
    # Feature 4: list available SNC collections in Qdrant
    raise NotImplementedError
