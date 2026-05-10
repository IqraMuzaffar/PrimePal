"""
Agent A — Curriculum Guardrail: Text extraction and chunking utilities (Feature 3).
Converts raw PDF documents (from PyMuPDFLoader) into clean, metadata-tagged chunks
ready for vectorisation in Feature 4.
"""
import re
from typing import Any

from langchain_text_splitters import RecursiveCharacterTextSplitter

CHUNK_SIZE = 1000
CHUNK_OVERLAP = 200
MIN_CHUNK_LENGTH = 50


def clean_snc_text(text: str) -> str:
    """
    Remove standard SNC textbook noise from extracted PDF text.

    Strips:
    - Isolated page numbers (lines containing only digits / whitespace)
    - Repeated "Single National Curriculum" header/footer text
    - Runs of 3+ blank lines collapsed to 2
    """
    # Remove lines that are only whitespace + digits (page numbers)
    text = re.sub(r'\n[ \t]*\d+[ \t]*\n', '\n', text)
    # Remove the recurring "Single National Curriculum" phrase
    text = re.sub(r'Single National Curriculum', '', text, flags=re.IGNORECASE)
    # Collapse excessive blank lines
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


def chunk_documents(
    documents: list,
    grade_level: int,
    book_title: str,
) -> list[dict[str, Any]]:
    """
    Split a list of LangChain Documents into overlapping chunks and tag each
    chunk with strict curricular metadata for the RAG pipeline.

    Chunks shorter than MIN_CHUNK_LENGTH characters after cleaning are discarded
    (these are typically artefacts like page headers or blank pages).

    Returns a list of dicts: {"content": str, "metadata": dict}
    """
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        separators=["\n\n", "\n", ".", " ", ""],
    )
    raw_chunks = splitter.split_documents(documents)

    processed: list[dict[str, Any]] = []
    for i, chunk in enumerate(raw_chunks):
        cleaned = clean_snc_text(chunk.page_content)
        if len(cleaned) < MIN_CHUNK_LENGTH:
            continue

        metadata: dict[str, Any] = {
            **chunk.metadata,
            "grade_level": grade_level,
            "book_title": book_title,
            "chunk_id": f"{book_title}_chunk_{i}",
        }
        processed.append({"content": cleaned, "metadata": metadata})

    return processed
