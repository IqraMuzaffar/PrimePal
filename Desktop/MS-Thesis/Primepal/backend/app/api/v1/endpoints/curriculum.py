"""
Feature 3 & 4: SNC Document Ingestion + Vector Storage (Agent A - Curriculum Guardrail)
- Ingest SNC PDF documents
- Trigger embedding pipeline
- Query curriculum by grade/week/topic
"""
from fastapi import APIRouter, UploadFile, File

router = APIRouter()


@router.post("/ingest")
async def ingest_document(file: UploadFile = File(...)):
    # TODO: parse PDF, chunk text, embed via Agent A, store in Qdrant
    raise NotImplementedError


@router.get("/query")
async def query_curriculum(grade: int, week: int, topic: str | None = None):
    # TODO: retrieve SNC-tagged chunks from Qdrant
    raise NotImplementedError


@router.get("/collections")
async def list_collections():
    # TODO: list available SNC collections in Qdrant
    raise NotImplementedError
