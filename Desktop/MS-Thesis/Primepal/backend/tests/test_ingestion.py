"""
Tests for Feature 3: SNC Document Ingestion (RAG Pipeline)

Covers:
  - POST /api/v1/curriculum/upload  (endpoint behaviour)
  - clean_snc_text()                (unit — text cleaning)
  - chunk_documents()               (unit — chunking + metadata)
"""
from unittest.mock import MagicMock, patch

import pytest
from httpx import AsyncClient
from langchain_core.documents import Document

# ── Constants ─────────────────────────────────────────────────────────────────

MOCK_TEACHER = {"id": "teacher-uuid-001"}

# A Document with ~1500 chars — enough to produce multiple 1000-char chunks
_LONG_TEXT = ("word sentence paragraph ") * 80          # ≈ 1920 chars
_SHORT_TEXT = "Hi"                                       # will be filtered (< 50 chars)

MOCK_DOCUMENTS = [Document(page_content=_LONG_TEXT)]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _make_mock_loader(documents=MOCK_DOCUMENTS):
    """Return a mock PyMuPDFLoader class whose instances return `documents`."""
    mock_instance = MagicMock()
    mock_instance.load.return_value = documents
    mock_cls = MagicMock(return_value=mock_instance)
    return mock_cls


def _make_mock_admin():
    """Return a mock Supabase admin client that accepts storage uploads silently."""
    mock = MagicMock()
    mock.storage.from_.return_value.upload.return_value = MagicMock()
    return mock


# ── Tests: POST /api/v1/curriculum/upload ─────────────────────────────────────

class TestUploadSNCTextbook:
    """Upload endpoint tests — teacher auth is overridden for all tests in this class."""

    @pytest.fixture(autouse=True)
    def _override_teacher_auth(self):
        from app.core.security import get_current_teacher
        from app.main import app

        app.dependency_overrides[get_current_teacher] = lambda: MOCK_TEACHER
        yield
        app.dependency_overrides.clear()

    async def test_upload_valid_pdf_returns_success(self, client: AsyncClient):
        """Happy path: valid PDF + form fields → 200 with processed chunks."""
        with (
            patch(
                "app.api.v1.endpoints.curriculum.get_supabase_admin",
                return_value=_make_mock_admin(),
            ),
            patch(
                "app.api.v1.endpoints.curriculum.PyMuPDFLoader",
                _make_mock_loader(),
            ),
        ):
            resp = await client.post(
                "/api/v1/curriculum/upload",
                files={"file": ("grade3_english.pdf", b"%PDF-1.4 fake content", "application/pdf")},
                data={"grade_level": "3", "book_title": "Punjab Board Grade 3 English"},
            )

        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "success"
        assert body["total_chunks"] >= 1
        assert body["sample_chunk"] is not None
        assert "content" in body["sample_chunk"]
        assert "metadata" in body["sample_chunk"]

    async def test_upload_valid_pdf_metadata_tagged(self, client: AsyncClient):
        """Chunks in the response must carry grade_level and book_title metadata."""
        with (
            patch(
                "app.api.v1.endpoints.curriculum.get_supabase_admin",
                return_value=_make_mock_admin(),
            ),
            patch(
                "app.api.v1.endpoints.curriculum.PyMuPDFLoader",
                _make_mock_loader(),
            ),
        ):
            resp = await client.post(
                "/api/v1/curriculum/upload",
                files={"file": ("textbook.pdf", b"%PDF fake", "application/pdf")},
                data={"grade_level": "4", "book_title": "SNC Grade 4"},
            )

        sample = resp.json()["sample_chunk"]
        assert sample["metadata"]["grade_level"] == 4
        assert sample["metadata"]["book_title"] == "SNC Grade 4"
        assert "chunk_id" in sample["metadata"]

    async def test_upload_txt_file_rejected(self, client: AsyncClient):
        """A .txt file must be rejected with HTTP 400."""
        resp = await client.post(
            "/api/v1/curriculum/upload",
            files={"file": ("notes.txt", b"Some plain text", "text/plain")},
            data={"grade_level": "3", "book_title": "Test"},
        )

        assert resp.status_code == 400
        assert "PDF" in resp.json()["detail"]

    async def test_upload_jpg_file_rejected(self, client: AsyncClient):
        """A .jpg file must be rejected with HTTP 400."""
        resp = await client.post(
            "/api/v1/curriculum/upload",
            files={"file": ("scan.jpg", b"\xff\xd8\xff fake jpeg", "image/jpeg")},
            data={"grade_level": "3", "book_title": "Test"},
        )

        assert resp.status_code == 400
        assert "PDF" in resp.json()["detail"]

    async def test_upload_pdf_all_short_chunks_returns_zero(self, client: AsyncClient):
        """If every extracted chunk is too short (< 50 chars), total_chunks == 0."""
        tiny_docs = [Document(page_content="Hi")]
        with (
            patch(
                "app.api.v1.endpoints.curriculum.get_supabase_admin",
                return_value=_make_mock_admin(),
            ),
            patch(
                "app.api.v1.endpoints.curriculum.PyMuPDFLoader",
                _make_mock_loader(documents=tiny_docs),
            ),
        ):
            resp = await client.post(
                "/api/v1/curriculum/upload",
                files={"file": ("empty.pdf", b"%PDF fake", "application/pdf")},
                data={"grade_level": "1", "book_title": "Tiny"},
            )

        assert resp.status_code == 200
        body = resp.json()
        assert body["total_chunks"] == 0
        assert body["sample_chunk"] is None


class TestUploadSNCTextbookAuth:
    """Auth tests — no dependency override so HTTPBearer enforces authentication."""

    async def test_upload_no_token_forbidden(self, client: AsyncClient):
        """Request with no Authorization header must be rejected with HTTP 403."""
        resp = await client.post(
            "/api/v1/curriculum/upload",
            files={"file": ("textbook.pdf", b"%PDF fake", "application/pdf")},
            data={"grade_level": "3", "book_title": "Test"},
        )

        assert resp.status_code == 403


# ── Tests: clean_snc_text() ───────────────────────────────────────────────────

class TestCleanSNCText:

    def test_removes_isolated_page_numbers(self):
        """Lines containing only digits (page numbers) must be stripped."""
        from app.agents.curriculum_agent.ingestion import clean_snc_text

        text = "Lesson one content\n\n  5  \n\nLesson two content"
        result = clean_snc_text(text)

        assert "5" not in result
        assert "Lesson one content" in result
        assert "Lesson two content" in result

    def test_removes_snc_header_text(self):
        """The phrase 'Single National Curriculum' must be removed (case-insensitive)."""
        from app.agents.curriculum_agent.ingestion import clean_snc_text

        text = "Single National Curriculum Grade 3\nVocabulary lesson begins here."
        result = clean_snc_text(text)

        assert "Single National Curriculum" not in result
        assert "Vocabulary lesson begins here." in result

    def test_collapses_excessive_blank_lines(self):
        """Three or more consecutive newlines are collapsed to two."""
        from app.agents.curriculum_agent.ingestion import clean_snc_text

        text = "Part A\n\n\n\n\nPart B"
        result = clean_snc_text(text)

        assert "\n\n\n" not in result
        assert "Part A" in result
        assert "Part B" in result


# ── Tests: chunk_documents() ─────────────────────────────────────────────────

class TestChunkDocuments:

    def test_splits_long_text_into_multiple_chunks(self):
        """Text longer than CHUNK_SIZE (1000 chars) must produce ≥ 2 chunks."""
        from app.agents.curriculum_agent.ingestion import chunk_documents

        long_text = "word " * 500          # ≈ 2500 chars
        docs = [Document(page_content=long_text)]
        chunks = chunk_documents(docs, grade_level=3, book_title="Test Book")

        assert len(chunks) >= 2

    def test_chunks_do_not_split_mid_word(self):
        """Chunk boundaries should fall on word/sentence separators, not mid-word."""
        from app.agents.curriculum_agent.ingestion import chunk_documents

        # Repeating distinct whole words so any mid-word split is detectable
        words = ["education", "language", "vocabulary", "curriculum"] * 80
        text = " ".join(words)
        docs = [Document(page_content=text)]
        chunks = chunk_documents(docs, grade_level=2, book_title="SNC Book")

        for chunk in chunks:
            content = chunk["content"]
            # After strip (applied by clean_snc_text), content should still
            # start with a complete word from our known vocabulary
            first_word = content.split()[0] if content.split() else ""
            assert first_word in {"education", "language", "vocabulary", "curriculum"}

    def test_applies_grade_and_title_metadata(self):
        """Every chunk must carry grade_level, book_title, and chunk_id metadata."""
        from app.agents.curriculum_agent.ingestion import chunk_documents

        text = "word " * 60           # ≈ 300 chars, passes the 50-char filter
        docs = [Document(page_content=text)]
        chunks = chunk_documents(docs, grade_level=5, book_title="Punjab Board Grade 5")

        assert len(chunks) >= 1
        meta = chunks[0]["metadata"]
        assert meta["grade_level"] == 5
        assert meta["book_title"] == "Punjab Board Grade 5"
        assert "chunk_id" in meta
        assert "Punjab Board Grade 5_chunk_" in meta["chunk_id"]

    def test_filters_short_chunks(self):
        """Chunks shorter than 50 chars after cleaning must be discarded."""
        from app.agents.curriculum_agent.ingestion import chunk_documents

        docs = [Document(page_content="Hi")]          # 2 chars — will be filtered
        chunks = chunk_documents(docs, grade_level=1, book_title="Test")

        assert chunks == []
