"""
Tests for Feature 4: Vector Storage & Curricular Tagging

Covers:
  - embed_and_store_chunks()       (unit — mocked OpenAI, mocked Supabase)
  - POST /api/v1/curriculum/embed  (endpoint — teacher auth + mocked embedder)
"""
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import AsyncClient

# ── Constants ─────────────────────────────────────────────────────────────────

MOCK_TEACHER = {"id": "teacher-uuid-001"}

SAMPLE_CHUNKS = [
    {
        "content": "The cat sat on the mat. " * 10,  # > 50 chars
        "metadata": {
            "grade_level": 3,
            "book_title": "SNC Grade 3",
            "chunk_id": "SNC Grade 3_chunk_0",
        },
    },
    {
        "content": "Vocabulary exercise: circle the correct word. " * 5,
        "metadata": {
            "grade_level": 3,
            "book_title": "SNC Grade 3",
            "chunk_id": "SNC Grade 3_chunk_1",
        },
    },
]

FAKE_VECTORS = [[0.1] * 1536, [0.2] * 1536]


# ── Tests: embed_and_store_chunks() ──────────────────────────────────────────

class TestEmbedAndStoreChunks:
    """Unit tests — OpenAI and Supabase are both mocked so no real API calls."""

    async def test_calls_openai_embed_documents(self):
        """embed_and_store_chunks must call aembed_documents with the chunk texts."""
        mock_embeddings = MagicMock()
        mock_embeddings.aembed_documents = AsyncMock(return_value=FAKE_VECTORS)

        mock_supabase = MagicMock()
        mock_supabase.table.return_value.insert.return_value.execute.return_value = (
            MagicMock()
        )

        with patch(
            "app.agents.curriculum_agent.embedder._get_embeddings_model",
            return_value=mock_embeddings,
        ):
            from app.agents.curriculum_agent.embedder import embed_and_store_chunks

            result = await embed_and_store_chunks(SAMPLE_CHUNKS, mock_supabase)

        mock_embeddings.aembed_documents.assert_called_once_with(
            [chunk["content"] for chunk in SAMPLE_CHUNKS]
        )
        assert result == len(SAMPLE_CHUNKS)

    async def test_inserts_correct_records_into_supabase(self):
        """Records inserted must contain content, metadata, and embedding for each chunk."""
        mock_embeddings = MagicMock()
        mock_embeddings.aembed_documents = AsyncMock(return_value=FAKE_VECTORS)

        mock_supabase = MagicMock()
        insert_mock = MagicMock()
        mock_supabase.table.return_value.insert = insert_mock
        insert_mock.return_value.execute.return_value = MagicMock()

        with patch(
            "app.agents.curriculum_agent.embedder._get_embeddings_model",
            return_value=mock_embeddings,
        ):
            from app.agents.curriculum_agent.embedder import embed_and_store_chunks

            await embed_and_store_chunks(SAMPLE_CHUNKS, mock_supabase)

        inserted_records = insert_mock.call_args[0][0]
        assert len(inserted_records) == 2

        for i, record in enumerate(inserted_records):
            assert record["content"] == SAMPLE_CHUNKS[i]["content"]
            assert record["metadata"] == SAMPLE_CHUNKS[i]["metadata"]
            assert record["embedding"] == FAKE_VECTORS[i]

    async def test_returns_zero_for_empty_chunks(self):
        """When called with an empty list, must return 0 without calling OpenAI."""
        mock_embeddings = MagicMock()
        mock_embeddings.aembed_documents = AsyncMock()
        mock_supabase = MagicMock()

        with patch(
            "app.agents.curriculum_agent.embedder._get_embeddings_model",
            return_value=mock_embeddings,
        ):
            from app.agents.curriculum_agent.embedder import embed_and_store_chunks

            result = await embed_and_store_chunks([], mock_supabase)

        mock_embeddings.aembed_documents.assert_not_called()
        assert result == 0

    async def test_uses_snc_knowledge_base_table(self):
        """Supabase insert must target the snc_knowledge_base table."""
        mock_embeddings = MagicMock()
        mock_embeddings.aembed_documents = AsyncMock(return_value=FAKE_VECTORS)

        mock_supabase = MagicMock()
        mock_supabase.table.return_value.insert.return_value.execute.return_value = (
            MagicMock()
        )

        with patch(
            "app.agents.curriculum_agent.embedder._get_embeddings_model",
            return_value=mock_embeddings,
        ):
            from app.agents.curriculum_agent.embedder import embed_and_store_chunks

            await embed_and_store_chunks(SAMPLE_CHUNKS, mock_supabase)

        mock_supabase.table.assert_called_once_with("snc_knowledge_base")


# ── Tests: POST /api/v1/curriculum/embed ─────────────────────────────────────

class TestEmbedEndpoint:
    """Integration tests for the standalone /embed endpoint."""

    @pytest.fixture(autouse=True)
    def _override_teacher_auth(self):
        from app.core.security import get_current_teacher
        from app.main import app

        app.dependency_overrides[get_current_teacher] = lambda: MOCK_TEACHER
        yield
        app.dependency_overrides.clear()

    async def test_embed_endpoint_returns_success(self, client: AsyncClient):
        """Happy path: valid chunks list → 200 with embedded_count."""
        with (
            patch(
                "app.api.v1.endpoints.curriculum.get_supabase_admin",
                return_value=MagicMock(),
            ),
            patch(
                "app.api.v1.endpoints.curriculum.embed_and_store_chunks",
                new=AsyncMock(return_value=2),
            ),
        ):
            resp = await client.post(
                "/api/v1/curriculum/embed",
                json={
                    "chunks": [
                        {
                            "content": chunk["content"],
                            "metadata": chunk["metadata"],
                        }
                        for chunk in SAMPLE_CHUNKS
                    ]
                },
            )

        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "success"
        assert body["embedded_count"] == 2

    async def test_embed_endpoint_rejects_empty_chunks(self, client: AsyncClient):
        """Empty chunks list must be rejected with HTTP 400."""
        resp = await client.post(
            "/api/v1/curriculum/embed",
            json={"chunks": []},
        )
        assert resp.status_code == 400
        assert "No chunks" in resp.json()["detail"]

    async def test_embed_endpoint_requires_auth(self, client: AsyncClient):
        """Without teacher auth, the endpoint must reject with HTTP 403."""
        # Clear dependency override so the real auth middleware runs
        from app.main import app

        app.dependency_overrides.clear()

        resp = await client.post(
            "/api/v1/curriculum/embed",
            json={"chunks": [{"content": "test content", "metadata": {}}]},
        )
        assert resp.status_code == 403
