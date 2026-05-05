"""
Tests for Feature 5 + Feature 7: The Guardrailed Bilingual AI Chatbot

Covers:
  - POST /api/v1/chat                       (endpoint integration)
  - Grade guardrail: Grade 3 student always gets Grade 3 filter,
    regardless of what vocabulary appears in their message.
  - retrieve_grade_filtered_chunks()         (unit — mocked OpenAI + Supabase RPC)
  - get_guardrailed_response()               (unit — mocked LangChain LLM)
  - Feature 7: translate_to_english()        (unit + endpoint integration)

Patching conventions (consistent with the rest of this codebase):
  - Supabase:    app.api.v1.endpoints.chat.get_supabase_admin
  - Translation: app.api.v1.endpoints.chat.translate_to_english
  - Retrieval:   app.api.v1.endpoints.chat.retrieve_grade_filtered_chunks
  - LLM:         app.api.v1.endpoints.chat.get_guardrailed_response
  - Student auth is overridden via app.dependency_overrides[get_current_student]
"""
from unittest.mock import AsyncMock, MagicMock, call, patch

import pytest
from httpx import AsyncClient

# ── Constants ─────────────────────────────────────────────────────────────────

CLASSROOM_ID = "cccccccc-0000-0000-0000-000000000003"
STUDENT_ID   = "dddddddd-0000-0000-0000-000000000004"

MOCK_STUDENT_GRADE_3 = {"sub": STUDENT_ID, "classroom_id": CLASSROOM_ID, "role": "student"}
MOCK_STUDENT_GRADE_5 = {"sub": STUDENT_ID, "classroom_id": "eeeeeeee-0000-0000-0000-000000000005", "role": "student"}

FAKE_CHUNKS_GRADE_3 = [
    "The cat sat on the mat. It is a big cat.",
    "Look at the red ball. The ball is round.",
]

FAKE_REPLY = "🐱 Great question! **Cat** — ek chota sa animal hai jo 'meow' kehta hai. Well done!"

ADVANCED_GRADE5_QUESTION = (
    "What is the difference between photosynthesis and cellular respiration "
    "in terms of metabolic processes and enzymatic reactions?"
)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _make_classroom_supabase_mock(grade_level: int):
    """
    Mock supabase_admin that returns a classroom row with the given grade_level.
    Simulates: .table("classrooms").select(...).eq(...).maybe_single().execute()
    """
    mock_client = MagicMock()
    classroom_result = MagicMock()
    classroom_result.data = {"grade_level": grade_level}
    (
        mock_client.table.return_value
        .select.return_value
        .eq.return_value
        .maybe_single.return_value
        .execute.return_value
    ) = classroom_result
    return mock_client


def _make_missing_classroom_mock():
    """Mock supabase_admin where classroom lookup returns None (no data)."""
    mock_client = MagicMock()
    classroom_result = MagicMock()
    classroom_result.data = None
    (
        mock_client.table.return_value
        .select.return_value
        .eq.return_value
        .maybe_single.return_value
        .execute.return_value
    ) = classroom_result
    return mock_client


def _make_tutor_response_mock(
    reply: str = FAKE_REPLY,
) -> MagicMock:
    """Create a mock TutorResponse object with reply."""
    mock_response = MagicMock()
    mock_response.reply = reply
    return mock_response


# ── Endpoint tests ────────────────────────────────────────────────────────────

class TestChatEndpoint:
    """Integration tests for POST /api/v1/chat."""

    pytestmark = pytest.mark.asyncio

    @pytest.fixture(autouse=True)
    def _override_student_auth(self):
        """Inject a Grade 3 student JWT payload for all tests in this class."""
        from app.core.security import get_current_student
        from app.main import app

        app.dependency_overrides[get_current_student] = lambda: MOCK_STUDENT_GRADE_3
        yield
        app.dependency_overrides.clear()

    async def test_happy_path_returns_reply(self, client: AsyncClient):
        """Valid message → classroom lookup → translate → retrieval → LLM → 200 with reply."""
        with (
            patch(
                "app.api.v1.endpoints.chat.get_supabase_admin",
                return_value=_make_classroom_supabase_mock(grade_level=3),
            ),
            patch(
                "app.api.v1.endpoints.chat.translate_to_english",
                new=AsyncMock(return_value="What is a cat?"),
            ),
            patch(
                "app.api.v1.endpoints.chat.retrieve_grade_filtered_chunks",
                new=AsyncMock(return_value=FAKE_CHUNKS_GRADE_3),
            ),
            patch(
                "app.api.v1.endpoints.chat.get_guardrailed_response",
                new=AsyncMock(return_value=_make_tutor_response_mock()),
            ),
        ):
            resp = await client.post(
                "/api/v1/chat",
                json={"message": "What is a cat?"},
                headers={"Authorization": "Bearer fake-student-token"},
            )

        assert resp.status_code == 200
        body = resp.json()
        assert body["reply"] == FAKE_REPLY
        assert body["grade_level"] == 3
        assert body["context_used"] is True

    async def test_context_used_false_when_no_chunks(self, client: AsyncClient):
        """When retrieval returns empty list, context_used must be False."""
        with (
            patch(
                "app.api.v1.endpoints.chat.get_supabase_admin",
                return_value=_make_classroom_supabase_mock(grade_level=3),
            ),
            patch(
                "app.api.v1.endpoints.chat.translate_to_english",
                new=AsyncMock(return_value="Tell me about dogs."),
            ),
            patch(
                "app.api.v1.endpoints.chat.retrieve_grade_filtered_chunks",
                new=AsyncMock(return_value=[]),
            ),
            patch(
                "app.api.v1.endpoints.chat.get_guardrailed_response",
                new=AsyncMock(return_value=_make_tutor_response_mock(
                    reply="I don't know that yet!",
                )),
            ),
        ):
            resp = await client.post(
                "/api/v1/chat",
                json={"message": "Tell me about dogs."},
                headers={"Authorization": "Bearer fake-student-token"},
            )

        assert resp.status_code == 200
        assert resp.json()["context_used"] is False

    async def test_grade_level_echoed_in_response(self, client: AsyncClient):
        """The grade_level in the response must match the classroom's grade_level."""
        with (
            patch(
                "app.api.v1.endpoints.chat.get_supabase_admin",
                return_value=_make_classroom_supabase_mock(grade_level=3),
            ),
            patch(
                "app.api.v1.endpoints.chat.translate_to_english",
                new=AsyncMock(return_value="Hello"),
            ),
            patch(
                "app.api.v1.endpoints.chat.retrieve_grade_filtered_chunks",
                new=AsyncMock(return_value=[]),
            ),
            patch(
                "app.api.v1.endpoints.chat.get_guardrailed_response",
                new=AsyncMock(return_value=_make_tutor_response_mock(
                    reply="Hello!",
                )),
            ),
        ):
            resp = await client.post(
                "/api/v1/chat",
                json={"message": "Hello"},
                headers={"Authorization": "Bearer fake-student-token"},
            )

        assert resp.json()["grade_level"] == 3

    async def test_classroom_not_found_returns_404(self, client: AsyncClient):
        """If the classroom from the JWT cannot be found, must return HTTP 404."""
        with patch(
            "app.api.v1.endpoints.chat.get_supabase_admin",
            return_value=_make_missing_classroom_mock(),
        ):
            resp = await client.post(
                "/api/v1/chat",
                json={"message": "Hello"},
                headers={"Authorization": "Bearer fake-student-token"},
            )

        assert resp.status_code == 404
        assert "Classroom not found" in resp.json()["detail"]

    async def test_empty_message_rejected(self, client: AsyncClient):
        """An empty string must be rejected by Pydantic validation (HTTP 422)."""
        resp = await client.post(
            "/api/v1/chat",
            json={"message": ""},
            headers={"Authorization": "Bearer fake-student-token"},
        )
        assert resp.status_code == 422

    async def test_no_auth_token_rejected(self, client: AsyncClient):
        """Request without Authorization header must be rejected with HTTP 403."""
        from app.main import app
        app.dependency_overrides.clear()   # remove the student override

        resp = await client.post(
            "/api/v1/chat",
            json={"message": "Hello"},
        )
        assert resp.status_code == 403


# ── THE CRITICAL GUARDRAIL TEST ───────────────────────────────────────────────

class TestGradeGuardrail:
    """
    Verify that the grade filter comes from the classroom record, NOT from the
    message content. A Grade 3 student asking a highly advanced question must
    still trigger a Grade 3 vector search — never Grade 5.
    """

    pytestmark = pytest.mark.asyncio

    @pytest.fixture(autouse=True)
    def _override_student_auth_grade3(self):
        from app.core.security import get_current_student
        from app.main import app

        app.dependency_overrides[get_current_student] = lambda: MOCK_STUDENT_GRADE_3
        yield
        app.dependency_overrides.clear()

    async def test_grade3_student_asking_advanced_question_uses_grade3_filter(
        self, client: AsyncClient
    ):
        """
        CRITICAL: A Grade 3 student sends a message containing advanced Grade 5+
        vocabulary (photosynthesis, metabolic processes, enzymatic reactions).
        The retrieval function must still be called with grade_level=3.

        This proves the guardrail reads from the classroom DB record, not from
        the message content.
        """
        retrieval_mock = AsyncMock(return_value=[])
        llm_mock = AsyncMock(return_value=_make_tutor_response_mock(
            reply="Let's ask your teacher about that!",
        ))

        with (
            patch(
                "app.api.v1.endpoints.chat.get_supabase_admin",
                return_value=_make_classroom_supabase_mock(grade_level=3),
            ),
            patch(
                "app.api.v1.endpoints.chat.translate_to_english",
                new=AsyncMock(return_value=ADVANCED_GRADE5_QUESTION),
            ),
            patch(
                "app.api.v1.endpoints.chat.retrieve_grade_filtered_chunks",
                new=retrieval_mock,
            ),
            patch(
                "app.api.v1.endpoints.chat.get_guardrailed_response",
                new=llm_mock,
            ),
        ):
            resp = await client.post(
                "/api/v1/chat",
                json={"message": ADVANCED_GRADE5_QUESTION},
                headers={"Authorization": "Bearer fake-student-token"},
            )

        assert resp.status_code == 200

        # THE GUARDRAIL ASSERTION: retrieval was called with grade_level=3
        retrieval_mock.assert_called_once()
        _, kwargs = retrieval_mock.call_args
        assert kwargs["grade_level"] == 3, (
            f"Expected grade_level=3 but retrieval was called with "
            f"grade_level={kwargs.get('grade_level')}. "
            f"The guardrail is broken — Grade 5 content could leak to Grade 3 students."
        )

    async def test_grade_is_not_overridable_via_request_body(
        self, client: AsyncClient
    ):
        """
        Even if the student could craft a JSON body with grade_level=5,
        the endpoint ignores it — grade always comes from the DB.
        The classroom mock returns grade_level=3 regardless of request content.
        """
        retrieval_mock = AsyncMock(return_value=[])

        with (
            patch(
                "app.api.v1.endpoints.chat.get_supabase_admin",
                return_value=_make_classroom_supabase_mock(grade_level=3),
            ),
            patch(
                "app.api.v1.endpoints.chat.translate_to_english",
                new=AsyncMock(return_value="Hello"),
            ),
            patch(
                "app.api.v1.endpoints.chat.retrieve_grade_filtered_chunks",
                new=retrieval_mock,
            ),
            patch(
                "app.api.v1.endpoints.chat.get_guardrailed_response",
                new=AsyncMock(return_value=_make_tutor_response_mock(
                    reply="Hello!",
                )),
            ),
        ):
            # Attempt to inject a higher grade via request body (should be ignored)
            resp = await client.post(
                "/api/v1/chat",
                json={"message": "Hello", "grade_level": 5},  # extra field ignored
                headers={"Authorization": "Bearer fake-student-token"},
            )

        assert resp.status_code == 200
        assert resp.json()["grade_level"] == 3   # DB value wins

        # Retrieval must still use grade 3
        _, kwargs = retrieval_mock.call_args
        assert kwargs["grade_level"] == 3


# ── Unit tests: retrieve_grade_filtered_chunks() ──────────────────────────────

class TestRetrieveGradeFilteredChunks:
    """Unit tests — OpenAI embeddings and Supabase RPC are both mocked."""

    pytestmark = pytest.mark.asyncio

    async def test_calls_rpc_with_correct_grade_filter(self):
        """RPC must be called with grade_level_filter matching the requested grade."""
        fake_vector = [0.1] * 1536

        mock_embeddings = MagicMock()
        mock_embeddings.aembed_query = AsyncMock(return_value=fake_vector)

        mock_supabase = MagicMock()
        rpc_result = MagicMock()
        rpc_result.data = [
            {"content": "Grade 3 chunk A"},
            {"content": "Grade 3 chunk B"},
        ]
        mock_supabase.rpc.return_value.execute.return_value = rpc_result

        with patch(
            "app.agents.tutor_agent.chatbot.OpenAIEmbeddings",
            return_value=mock_embeddings,
        ):
            from app.agents.tutor_agent.chatbot import retrieve_grade_filtered_chunks

            result = await retrieve_grade_filtered_chunks(
                query="What is a cat?",
                grade_level=3,
                supabase_admin_client=mock_supabase,
            )

        # Verify the RPC was invoked with the correct grade filter
        mock_supabase.rpc.assert_called_once_with(
            "match_snc_documents",
            {
                "query_embedding": fake_vector,
                "grade_level_filter": 3,
                "match_count": 5,
            },
        )
        assert result == ["Grade 3 chunk A", "Grade 3 chunk B"]

    async def test_returns_empty_list_when_rpc_returns_no_data(self):
        """When RPC returns None or empty data, the function returns an empty list."""
        mock_embeddings = MagicMock()
        mock_embeddings.aembed_query = AsyncMock(return_value=[0.0] * 1536)

        mock_supabase = MagicMock()
        rpc_result = MagicMock()
        rpc_result.data = None
        mock_supabase.rpc.return_value.execute.return_value = rpc_result

        with patch(
            "app.agents.tutor_agent.chatbot.OpenAIEmbeddings",
            return_value=mock_embeddings,
        ):
            from app.agents.tutor_agent.chatbot import retrieve_grade_filtered_chunks

            result = await retrieve_grade_filtered_chunks(
                query="Something",
                grade_level=2,
                supabase_admin_client=mock_supabase,
            )

        assert result == []

    async def test_grade5_filter_does_not_bleed_into_grade3_call(self):
        """
        Calling retrieve_grade_filtered_chunks with grade_level=3 must pass
        grade_level_filter=3 to the RPC — never a different value.
        This test documents that the filter parameter is forwarded verbatim.
        """
        mock_embeddings = MagicMock()
        mock_embeddings.aembed_query = AsyncMock(return_value=[0.0] * 1536)

        mock_supabase = MagicMock()
        mock_supabase.rpc.return_value.execute.return_value = MagicMock(data=[])

        with patch(
            "app.agents.tutor_agent.chatbot.OpenAIEmbeddings",
            return_value=mock_embeddings,
        ):
            from app.agents.tutor_agent.chatbot import retrieve_grade_filtered_chunks

            await retrieve_grade_filtered_chunks(
                query="Advanced vocabulary question",
                grade_level=3,
                supabase_admin_client=mock_supabase,
            )

        call_kwargs = mock_supabase.rpc.call_args[0][1]
        assert call_kwargs["grade_level_filter"] == 3
        assert call_kwargs["grade_level_filter"] != 5


# ── Unit tests: get_guardrailed_response() ────────────────────────────────────

class TestGetGuardrailedResponse:
    """Unit tests — LangChain LLM is mocked so no real OpenAI calls."""

    pytestmark = pytest.mark.asyncio

    async def test_returns_tutor_response_object(self):
        """get_guardrailed_response must return a TutorResponse with reply field."""
        from app.agents.tutor_agent.chatbot import TutorResponse

        fake_tutor_response = TutorResponse(
            reply="🐱 **Cat** — ek chota animal hai — a cat is a small animal!",
        )

        mock_llm = MagicMock()
        mock_llm.with_structured_output = MagicMock(return_value=mock_llm)

        mock_chain = MagicMock()
        mock_chain.ainvoke = AsyncMock(return_value=fake_tutor_response)

        with patch("app.agents.tutor_agent.chatbot.ChatOpenAI", return_value=mock_llm):
            with patch("app.agents.tutor_agent.chatbot._TUTOR_PROMPT") as mock_prompt:
                mock_prompt.__or__ = MagicMock(return_value=mock_chain)

                from app.agents.tutor_agent.chatbot import get_guardrailed_response

                result = await get_guardrailed_response(
                    original_message="What is a cat?",
                    translated_message="What is a cat?",
                    grade_level=3,
                    context_chunks=FAKE_CHUNKS_GRADE_3,
                )

        assert isinstance(result, TutorResponse)
        assert result.reply == "🐱 **Cat** — ek chota animal hai — a cat is a small animal!"

    async def test_handles_empty_context_chunks_gracefully(self):
        """When context_chunks is empty, the function must not raise — uses fallback text."""
        from app.agents.tutor_agent.chatbot import TutorResponse

        fake_tutor_response = TutorResponse(
            reply="I don't know that yet — let's ask your teacher!",
        )

        mock_llm = MagicMock()
        mock_llm.with_structured_output = MagicMock(return_value=mock_llm)

        mock_chain = MagicMock()
        mock_chain.ainvoke = AsyncMock(return_value=fake_tutor_response)

        with patch("app.agents.tutor_agent.chatbot.ChatOpenAI", return_value=mock_llm):
            with patch("app.agents.tutor_agent.chatbot._TUTOR_PROMPT") as mock_prompt:
                mock_prompt.__or__ = MagicMock(return_value=mock_chain)

                from app.agents.tutor_agent.chatbot import get_guardrailed_response

                result = await get_guardrailed_response(
                    original_message="Tell me about nuclear physics.",
                    translated_message="Tell me about nuclear physics.",
                    grade_level=2,
                    context_chunks=[],   # no SNC content ingested yet
                )

        # Verify ainvoke was called — the fallback context path ran without error
        mock_chain.ainvoke.assert_called_once()
        invoke_args = mock_chain.ainvoke.call_args[0][0]
        # The grade_level=2 must appear in the invocation payload
        assert invoke_args["grade_level"] == 2
        # The context must contain the fallback string (no chunks path)
        assert "No curriculum content" in invoke_args["context"]

    async def test_invoked_with_original_and_translated_message(self):
        """Both original_message and translated_message must appear in the ainvoke payload."""
        from app.agents.tutor_agent.chatbot import TutorResponse

        fake_tutor_response = TutorResponse(
            reply="📚 **Noun** — aisa lafz jo naam batata hai — is a naming word!",
        )

        mock_llm = MagicMock()
        mock_llm.with_structured_output = MagicMock(return_value=mock_llm)

        mock_chain = MagicMock()
        mock_chain.ainvoke = AsyncMock(return_value=fake_tutor_response)

        with patch("app.agents.tutor_agent.chatbot.ChatOpenAI", return_value=mock_llm):
            with patch("app.agents.tutor_agent.chatbot._TUTOR_PROMPT") as mock_prompt:
                mock_prompt.__or__ = MagicMock(return_value=mock_chain)

                from app.agents.tutor_agent.chatbot import get_guardrailed_response

                await get_guardrailed_response(
                    original_message="Noun kya hota hai?",
                    translated_message="What is a noun?",
                    grade_level=3,
                    context_chunks=[],
                )

        invoke_args = mock_chain.ainvoke.call_args[0][0]
        assert invoke_args["original_message"] == "Noun kya hota hai?"
        assert invoke_args["translated_message"] == "What is a noun?"


# ── Feature 7 Tests: Translation ──────────────────────────────────────────────

class TestFeature7Translation:
    """
    Tests for Feature 7: bilingual (Urdu/Minglish → English) translation pipeline.
    Verifies that translate_to_english is called before retrieval and that its
    output is used for the vector search instead of the raw student message.
    """

    pytestmark = pytest.mark.asyncio

    @pytest.fixture(autouse=True)
    def _override_student_auth(self):
        """Inject a Grade 3 student JWT payload for all tests in this class."""
        from app.core.security import get_current_student
        from app.main import app

        app.dependency_overrides[get_current_student] = lambda: MOCK_STUDENT_GRADE_3
        yield
        app.dependency_overrides.clear()

    async def test_translate_to_english_called_before_retrieval(self, client: AsyncClient):
        """translate_to_english must be called with the raw student message."""
        translate_mock = AsyncMock(return_value="What is a cat?")
        retrieval_mock = AsyncMock(return_value=[])
        llm_mock = AsyncMock(return_value=_make_tutor_response_mock())

        with (
            patch(
                "app.api.v1.endpoints.chat.get_supabase_admin",
                return_value=_make_classroom_supabase_mock(grade_level=3),
            ),
            patch(
                "app.api.v1.endpoints.chat.translate_to_english",
                new=translate_mock,
            ),
            patch(
                "app.api.v1.endpoints.chat.retrieve_grade_filtered_chunks",
                new=retrieval_mock,
            ),
            patch(
                "app.api.v1.endpoints.chat.get_guardrailed_response",
                new=llm_mock,
            ),
        ):
            resp = await client.post(
                "/api/v1/chat",
                json={"message": "Billi kya hoti hai?"},
                headers={"Authorization": "Bearer fake-student-token"},
            )

        assert resp.status_code == 200
        translate_mock.assert_called_once_with("Billi kya hoti hai?")

    async def test_translated_query_passed_to_retrieval_not_original(self, client: AsyncClient):
        """retrieve_grade_filtered_chunks must receive the TRANSLATED query, not the original."""
        translate_mock = AsyncMock(return_value="What is a noun?")
        retrieval_mock = AsyncMock(return_value=[])
        llm_mock = AsyncMock(return_value=_make_tutor_response_mock())

        with (
            patch(
                "app.api.v1.endpoints.chat.get_supabase_admin",
                return_value=_make_classroom_supabase_mock(grade_level=3),
            ),
            patch(
                "app.api.v1.endpoints.chat.translate_to_english",
                new=translate_mock,
            ),
            patch(
                "app.api.v1.endpoints.chat.retrieve_grade_filtered_chunks",
                new=retrieval_mock,
            ),
            patch(
                "app.api.v1.endpoints.chat.get_guardrailed_response",
                new=llm_mock,
            ),
        ):
            resp = await client.post(
                "/api/v1/chat",
                json={"message": "Noun kya hota hai?"},
                headers={"Authorization": "Bearer fake-student-token"},
            )

        assert resp.status_code == 200
        retrieval_mock.assert_called_once()
        _, kwargs = retrieval_mock.call_args
        assert kwargs["query"] == "What is a noun?", (
            f"Expected retrieval query='What is a noun?' but got query='{kwargs.get('query')}'. "
            f"The translated query must be used for vector search, not the original Roman Urdu."
        )
        # Confirm the original Urdu message was NOT passed to retrieval
        assert kwargs["query"] != "Noun kya hota hai?"

    async def test_response_contains_adaptive_reply(self, client: AsyncClient):
        """Response body must include 'reply' field with adaptive content."""
        expected_reply = "📚 **Noun** — aisa lafz jo naam batata hai — is a naming word!"

        with (
            patch(
                "app.api.v1.endpoints.chat.get_supabase_admin",
                return_value=_make_classroom_supabase_mock(grade_level=3),
            ),
            patch(
                "app.api.v1.endpoints.chat.translate_to_english",
                new=AsyncMock(return_value="What is a noun?"),
            ),
            patch(
                "app.api.v1.endpoints.chat.retrieve_grade_filtered_chunks",
                new=AsyncMock(return_value=[]),
            ),
            patch(
                "app.api.v1.endpoints.chat.get_guardrailed_response",
                new=AsyncMock(return_value=_make_tutor_response_mock(
                    reply=expected_reply,
                )),
            ),
        ):
            resp = await client.post(
                "/api/v1/chat",
                json={"message": "Noun kya hota hai?"},
                headers={"Authorization": "Bearer fake-student-token"},
            )

        assert resp.status_code == 200
        body = resp.json()
        assert body["reply"] == expected_reply

    async def test_translated_query_in_response(self, client: AsyncClient):
        """The response must include 'translated_query' with the English translation."""
        with (
            patch(
                "app.api.v1.endpoints.chat.get_supabase_admin",
                return_value=_make_classroom_supabase_mock(grade_level=3),
            ),
            patch(
                "app.api.v1.endpoints.chat.translate_to_english",
                new=AsyncMock(return_value="What is a verb?"),
            ),
            patch(
                "app.api.v1.endpoints.chat.retrieve_grade_filtered_chunks",
                new=AsyncMock(return_value=[]),
            ),
            patch(
                "app.api.v1.endpoints.chat.get_guardrailed_response",
                new=AsyncMock(return_value=_make_tutor_response_mock()),
            ),
        ):
            resp = await client.post(
                "/api/v1/chat",
                json={"message": "Verb kya hota hai?"},
                headers={"Authorization": "Bearer fake-student-token"},
            )

        assert resp.status_code == 200
        assert resp.json()["translated_query"] == "What is a verb?"

    async def test_translate_to_english_unit_called_with_roman_urdu(self):
        """
        Unit test (no HTTP): translate_to_english must invoke the LLM chain
        with the original Roman Urdu query as the 'query' key.
        """
        mock_result = MagicMock()
        mock_result.content = "What is a noun?"

        mock_chain = MagicMock()
        mock_chain.ainvoke = AsyncMock(return_value=mock_result)

        mock_llm = MagicMock()

        with patch("app.agents.tutor_agent.chatbot.ChatOpenAI", return_value=mock_llm):
            with patch("app.agents.tutor_agent.chatbot._TRANSLATE_PROMPT") as mock_translate_prompt:
                mock_translate_prompt.__or__ = MagicMock(return_value=mock_chain)

                from app.agents.tutor_agent.chatbot import translate_to_english

                result = await translate_to_english("Noun kya hota hai?")

        mock_chain.ainvoke.assert_called_once_with({"query": "Noun kya hota hai?"})
        assert result == "What is a noun?"
