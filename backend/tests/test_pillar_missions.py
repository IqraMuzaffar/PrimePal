"""
Tests for Feature 3: Pillar-based Missions Endpoint

Covers:
  - GET /api/v1/missions/pillar (endpoint integration)
  - Pillar parameter validation (reading, writing, listening, speaking)
  - Retrieving student weaknesses from interactions table
  - Generating questions with weakness focus
  - correct_answer included in response (frontend validation)
  - generate_pillar_missions signature and LangChain integration

Patching conventions:
  - Supabase:                app.api.v1.endpoints.missions.get_supabase_admin
  - Mission generator:       app.api.v1.endpoints.missions.generate_pillar_missions
  - Bank pull:               app.api.v1.endpoints.missions.pull_from_bank
  - Grade level cache:       app.api.v1.endpoints.missions.get_cached_grade_level (via cache module)
  - Student auth is overridden via app.dependency_overrides[get_current_student]
"""
import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import AsyncClient

# ── Constants ─────────────────────────────────────────────────────────────────

STUDENT_ID = "dddddddd-0000-0000-0000-000000000001"
CLASSROOM_ID = "cccccccc-0000-0000-0000-000000000001"

MOCK_STUDENT = {
    "sub": STUDENT_ID,
    "classroom_id": CLASSROOM_ID,
    "role": "student",
}

MOCK_CLASSROOM_WITH_TOPIC = {
    "id": CLASSROOM_ID,
    "grade_level": 3,
    "current_week_topic": "Animals",
}

MOCK_CLASSROOM_WITHOUT_TOPIC = {
    "id": CLASSROOM_ID,
    "grade_level": 5,
    "current_week_topic": None,
}


def _make_mock_pillar_questions(pillar: str = "reading"):
    """Create 10 mock mission question dicts (not MissionQuestion objects).

    Uses task_type (the current required field, not the legacy 'type' alias).
    Question texts are deliberately distinct to avoid the 0.85 fuzzy-dedup threshold.
    """
    # (task_type, question_text) pairs — each text must be clearly unique
    questions_by_pillar = {
        "reading": [
            ("sentence_picture_match", "Which picture best matches the sentence about a red apple?"),
            ("odd_one_out",            "Which word does NOT belong: cat, dog, table, bird?"),
            ("fill_blank_word_bank",   "The boy ___ to school every morning."),
            ("passage_true_false",     "Is it true that fish can breathe underwater?"),
            ("sentence_picture_match", "Choose the image that shows a child reading a book."),
            ("odd_one_out",            "Circle the item that is not a fruit: mango, banana, chair, orange."),
            ("fill_blank_word_bank",   "She drinks ___ with her breakfast."),
            ("passage_true_false",     "Elephants are the smallest animals on land — true or false?"),
            ("sentence_picture_match", "Which photo matches the sentence: the sun is shining brightly?"),
            ("odd_one_out",            "Find the word that does not fit: happy, sad, run, angry."),
        ],
        "writing": [
            ("sentence_scramble",    "Arrange these words: school / goes / Ahmed / to."),
            ("missing_letter",       "Complete the word: b_tter_ly"),
            ("guided_translation",   "Write in English: بلی درخت پر بیٹھی ہے"),
            ("sentence_scramble",    "Put in order: breakfast / eats / she / every day."),
            ("missing_letter",       "Fill the blank: s_nfl_wer"),
            ("guided_translation",   "Translate: کتاب میز پر ہے"),
            ("sentence_scramble",    "Arrange: plays / football / brother / my."),
            ("missing_letter",       "Complete: r_inb_w"),
            ("guided_translation",   "Write in English: پرندہ آسمان میں اڑتا ہے"),
            ("sentence_scramble",    "Order the words: market / goes / mother / the / to."),
        ],
        "listening": [
            ("listen_and_choose", "Listen and choose the animal you heard described."),
            ("simon_says",        "Touch your nose when you hear the command."),
            ("listen_and_spell",  "Spell the word you hear for a type of fruit."),
            ("listen_and_choose", "Pick the correct picture for the weather word you heard."),
            ("simon_says",        "Clap twice when you hear a colour word."),
            ("listen_and_spell",  "Write the animal name that was spoken aloud."),
            ("listen_and_choose", "Select the image matching the action described in the audio."),
            ("simon_says",        "Stand up when you hear a number greater than five."),
            ("listen_and_spell",  "Spell the vehicle name from the audio clip."),
            ("listen_and_choose", "Choose the correct season based on what you heard."),
        ],
        "speaking": [
            ("repeat_after_me",      "Repeat: The cat sat on the mat."),
            ("what_is_this",         "What is this object used for in a kitchen?"),
            ("finish_the_sentence",  "The sky is blue and the grass is ___."),
            ("repeat_after_me",      "Say aloud: My name is Ahmed and I am eight years old."),
            ("what_is_this",         "Name the animal shown in the picture."),
            ("finish_the_sentence",  "We use an umbrella when it ___."),
            ("repeat_after_me",      "Repeat clearly: She sells seashells by the seashore."),
            ("what_is_this",         "What do we call this tool used for writing?"),
            ("finish_the_sentence",  "I brush my teeth before I go to ___."),
            ("repeat_after_me",      "Say: The quick brown fox jumps over the lazy dog."),
        ],
    }
    entries = questions_by_pillar.get(pillar, questions_by_pillar["reading"])
    questions = []
    for i, (task_type, question_text) in enumerate(entries):
        questions.append({
            "id": i + 1,
            "task_type": task_type,
            "pillar": pillar,
            "question": question_text,
            "difficulty": "medium",
            "points_value": 10,
            "correct_answer": "a",
            "emoji_hint": "📖",
            "urdu_hint": "",
            "is_weakness_focused": i < 3,
            "source": "llm",
        })
    return questions


# ── Supabase mock helpers ─────────────────────────────────────────────────────

def _make_full_supabase_mock(grade_level: int = 3, session_count: int = 0):
    """
    Mock supabase_admin that handles classrooms, classroom_active_topics,
    snc_topics, grade_topic_selections, and student_interactions tables.
    """
    mock_client = MagicMock()

    def table_side_effect(table_name):
        table_mock = MagicMock()

        if table_name == "classrooms":
            result = MagicMock()
            result.data = {"grade_level": grade_level}
            table_mock.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = result

        elif table_name == "classroom_active_topics":
            result = MagicMock()
            result.data = []  # No saved topic IDs → use all grade topics
            table_mock.select.return_value.eq.return_value.execute.return_value = result

        elif table_name == "snc_topics":
            result = MagicMock()
            result.data = [
                {"id": 1, "grade_level": grade_level, "skill": "listening", "topic_name": "Animals"},
                {"id": 2, "grade_level": grade_level, "skill": "reading",   "topic_name": "Colors"},
            ]
            table_mock.select.return_value.eq.return_value.order.return_value.execute.return_value = result
            table_mock.select.return_value.in_.return_value.order.return_value.execute.return_value = result

        elif table_name == "grade_topic_selections":
            result = MagicMock()
            result.data = []  # No deactivated topics
            table_mock.select.return_value.eq.return_value.eq.return_value.execute.return_value = result

        elif table_name == "student_interactions":
            result = MagicMock()
            result.data = []
            result.count = session_count
            # Handle any chain of calls
            chain = table_mock.select.return_value
            for _ in range(6):
                chain = chain.eq.return_value
            chain.execute.return_value = result
            chain.gte.return_value.execute.return_value = result
            table_mock.select.return_value.eq.return_value.eq.return_value.gte.return_value.execute.return_value = result
            table_mock.select.return_value.eq.return_value.not_.is_.return_value.gte.return_value.execute.return_value = result
            table_mock.select.return_value.eq.return_value.eq.return_value.gte.return_value.lte.return_value.limit.return_value.execute.return_value = result

        return table_mock

    mock_client.table.side_effect = table_side_effect
    return mock_client


def _make_missing_classroom_mock():
    """Mock supabase_admin where classroom grade lookup returns 0 (not found)."""
    mock_client = MagicMock()

    def table_side_effect(table_name):
        table_mock = MagicMock()
        result = MagicMock()
        result.data = None
        result.count = 0
        # Return None data for any call
        table_mock.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = result
        table_mock.select.return_value.eq.return_value.execute.return_value = result
        table_mock.select.return_value.eq.return_value.eq.return_value.gte.return_value.execute.return_value = result
        return table_mock

    mock_client.table.side_effect = table_side_effect
    return mock_client


# ── TestGetPillarMissions ─────────────────────────────────────────────────────

class TestGetPillarMissions:
    """Integration tests for GET /api/v1/missions/pillar."""

    @pytest.fixture(autouse=True)
    def _override_student_auth(self):
        from app.core.security import get_current_student
        from app.main import app

        app.dependency_overrides[get_current_student] = lambda: MOCK_STUDENT
        yield
        app.dependency_overrides.clear()

    async def test_happy_path_reading_pillar(self, client: AsyncClient):
        """
        Valid pillar=reading, classroom found → 200 OK with 10 questions.
        """
        mock_questions = _make_mock_pillar_questions("reading")

        with (
            patch("app.api.v1.endpoints.missions.get_supabase_admin",
                  return_value=_make_full_supabase_mock()),
            patch("app.core.cache.get_cached_grade_level",
                  new=AsyncMock(return_value=3)),
            patch("app.api.v1.endpoints.missions.pull_from_bank",
                  new=AsyncMock(return_value=[])),
            patch("app.api.v1.endpoints.missions.generate_pillar_missions",
                  new=AsyncMock(return_value=mock_questions)),
            patch("app.api.v1.endpoints.missions.retrieve_grade_filtered_chunks",
                  new=AsyncMock(return_value=[])),
            patch("app.api.v1.endpoints.missions.cache_get",
                  new=AsyncMock(return_value=None)),
            patch("app.api.v1.endpoints.missions.cache_set",
                  new=AsyncMock()),
        ):
            resp = await client.get(
                "/api/v1/missions/pillar",
                params={"pillar": "reading"},
                headers={"Authorization": "Bearer fake-student-token"},
            )

        assert resp.status_code == 200
        body = resp.json()
        assert body["pillar"] == "reading"
        assert len(body["questions"]) == 10
        assert body["weakness_focus_questions"] == 3  # First 3 are marked as weakness_focused

    async def test_pillar_writing_returns_correct_pillar(self, client: AsyncClient):
        """Test that pillar=writing is accepted and returned correctly."""
        mock_questions = _make_mock_pillar_questions("writing")

        with (
            patch("app.api.v1.endpoints.missions.get_supabase_admin",
                  return_value=_make_full_supabase_mock(grade_level=5)),
            patch("app.core.cache.get_cached_grade_level",
                  new=AsyncMock(return_value=5)),
            patch("app.api.v1.endpoints.missions.pull_from_bank",
                  new=AsyncMock(return_value=[])),
            patch("app.api.v1.endpoints.missions.generate_pillar_missions",
                  new=AsyncMock(return_value=mock_questions)),
            patch("app.api.v1.endpoints.missions.retrieve_grade_filtered_chunks",
                  new=AsyncMock(return_value=[])),
            patch("app.api.v1.endpoints.missions.cache_get",
                  new=AsyncMock(return_value=None)),
            patch("app.api.v1.endpoints.missions.cache_set",
                  new=AsyncMock()),
        ):
            resp = await client.get(
                "/api/v1/missions/pillar",
                params={"pillar": "writing"},
                headers={"Authorization": "Bearer fake-student-token"},
            )

        assert resp.status_code == 200
        body = resp.json()
        assert body["pillar"] == "writing"

    async def test_pillar_listening(self, client: AsyncClient):
        """Test listening pillar is accepted and returns listening questions."""
        mock_questions = _make_mock_pillar_questions("listening")

        with (
            patch("app.api.v1.endpoints.missions.get_supabase_admin",
                  return_value=_make_full_supabase_mock()),
            patch("app.core.cache.get_cached_grade_level",
                  new=AsyncMock(return_value=3)),
            patch("app.api.v1.endpoints.missions.pull_from_bank",
                  new=AsyncMock(return_value=[])),
            patch("app.api.v1.endpoints.missions.generate_pillar_missions",
                  new=AsyncMock(return_value=mock_questions)),
            patch("app.api.v1.endpoints.missions.retrieve_grade_filtered_chunks",
                  new=AsyncMock(return_value=[])),
            patch("app.api.v1.endpoints.missions.cache_get",
                  new=AsyncMock(return_value=None)),
            patch("app.api.v1.endpoints.missions.cache_set",
                  new=AsyncMock()),
        ):
            resp = await client.get(
                "/api/v1/missions/pillar",
                params={"pillar": "listening"},
                headers={"Authorization": "Bearer fake-student-token"},
            )

        assert resp.status_code == 200
        body = resp.json()
        assert body["pillar"] == "listening"
        assert len(body["questions"]) == 10
        # Verify listening-specific task types are present
        task_types = {q["task_type"] for q in body["questions"]}
        assert task_types <= {"listen_and_choose", "simon_says", "listen_and_spell"}

    async def test_pillar_speaking(self, client: AsyncClient):
        """Test speaking pillar is accepted."""
        mock_questions = _make_mock_pillar_questions("speaking")

        with (
            patch("app.api.v1.endpoints.missions.get_supabase_admin",
                  return_value=_make_full_supabase_mock()),
            patch("app.core.cache.get_cached_grade_level",
                  new=AsyncMock(return_value=3)),
            patch("app.api.v1.endpoints.missions.pull_from_bank",
                  new=AsyncMock(return_value=[])),
            patch("app.api.v1.endpoints.missions.generate_pillar_missions",
                  new=AsyncMock(return_value=mock_questions)),
            patch("app.api.v1.endpoints.missions.retrieve_grade_filtered_chunks",
                  new=AsyncMock(return_value=[])),
            patch("app.api.v1.endpoints.missions.cache_get",
                  new=AsyncMock(return_value=None)),
            patch("app.api.v1.endpoints.missions.cache_set",
                  new=AsyncMock()),
        ):
            resp = await client.get(
                "/api/v1/missions/pillar",
                params={"pillar": "speaking"},
                headers={"Authorization": "Bearer fake-student-token"},
            )

        assert resp.status_code == 200
        assert resp.json()["pillar"] == "speaking"

    async def test_invalid_pillar_returns_400(self, client: AsyncClient):
        """Invalid pillar value → HTTP 400 with descriptive error."""
        with (
            patch("app.api.v1.endpoints.missions.get_supabase_admin",
                  return_value=_make_full_supabase_mock()),
            patch("app.core.cache.get_cached_grade_level",
                  new=AsyncMock(return_value=3)),
        ):
            resp = await client.get(
                "/api/v1/missions/pillar",
                params={"pillar": "invalid_pillar"},
                headers={"Authorization": "Bearer fake-student-token"},
            )

        assert resp.status_code == 400
        assert "Invalid pillar" in resp.json()["detail"]
        assert "reading" in resp.json()["detail"]

    async def test_classroom_not_found_returns_404(self, client: AsyncClient):
        """If classroom grade cannot be resolved → HTTP 404."""
        with (
            patch("app.api.v1.endpoints.missions.get_supabase_admin",
                  return_value=_make_missing_classroom_mock()),
            patch("app.core.cache.get_cached_grade_level",
                  new=AsyncMock(return_value=0)),  # 0 = not found
        ):
            resp = await client.get(
                "/api/v1/missions/pillar",
                params={"pillar": "reading"},
                headers={"Authorization": "Bearer fake-student-token"},
            )

        assert resp.status_code == 404
        assert "Classroom not found" in resp.json()["detail"]

    async def test_correct_answer_included_in_response(self, client: AsyncClient):
        """correct_answer IS included in the response for frontend validation."""
        mock_questions = _make_mock_pillar_questions("reading")

        with (
            patch("app.api.v1.endpoints.missions.get_supabase_admin",
                  return_value=_make_full_supabase_mock()),
            patch("app.core.cache.get_cached_grade_level",
                  new=AsyncMock(return_value=3)),
            patch("app.api.v1.endpoints.missions.pull_from_bank",
                  new=AsyncMock(return_value=[])),
            patch("app.api.v1.endpoints.missions.generate_pillar_missions",
                  new=AsyncMock(return_value=mock_questions)),
            patch("app.api.v1.endpoints.missions.retrieve_grade_filtered_chunks",
                  new=AsyncMock(return_value=[])),
            patch("app.api.v1.endpoints.missions.cache_get",
                  new=AsyncMock(return_value=None)),
            patch("app.api.v1.endpoints.missions.cache_set",
                  new=AsyncMock()),
        ):
            resp = await client.get(
                "/api/v1/missions/pillar",
                params={"pillar": "reading"},
                headers={"Authorization": "Bearer fake-student-token"},
            )

        assert resp.status_code == 200
        # correct_answer is included for frontend validation (primary students, learning-focused)
        for question in resp.json()["questions"]:
            assert "correct_answer" in question, (
                "correct_answer must be present for frontend validation"
            )

    async def test_pillar_parameter_required(self, client: AsyncClient):
        """Requesting without pillar parameter → HTTP 422 (Unprocessable Entity)."""
        with (
            patch("app.api.v1.endpoints.missions.get_supabase_admin",
                  return_value=_make_full_supabase_mock()),
        ):
            resp = await client.get(
                "/api/v1/missions/pillar",
                headers={"Authorization": "Bearer fake-student-token"},
            )

        assert resp.status_code == 422  # FastAPI query parameter validation

    async def test_no_auth_returns_403(self, client: AsyncClient):
        """Request without Authorization header → HTTP 403."""
        from app.main import app

        app.dependency_overrides.clear()

        resp = await client.get(
            "/api/v1/missions/pillar",
            params={"pillar": "reading"},
        )
        assert resp.status_code == 403

    async def test_student_weaknesses_passed_to_generator(self, client: AsyncClient):
        """
        Student weaknesses from interactions table are fetched and passed to generator.
        """
        mock_questions = _make_mock_pillar_questions("reading")
        generator_mock = AsyncMock(return_value=mock_questions)

        # Build a supabase mock that returns some weakness interactions
        mock_sb = _make_full_supabase_mock()
        # Override student_interactions to return some data for weakness calc
        interactions_result = MagicMock()
        interactions_result.data = [
            {"pillar": "reading", "correct": False, "interaction_type": "mission_mc"},
            {"pillar": "reading", "correct": False, "interaction_type": "mission_mc"},
            {"pillar": "reading", "correct": False, "interaction_type": "mission_mc"},
        ]
        interactions_result.count = 3

        def _table(name):
            if name == "student_interactions":
                tbl = MagicMock()
                tbl.select.return_value.eq.return_value.not_.is_.return_value.order.return_value.limit.return_value.execute.return_value = interactions_result
                tbl.select.return_value.eq.return_value.eq.return_value.gte.return_value.execute.return_value = interactions_result
                tbl.select.return_value.eq.return_value.not_.is_.return_value.gte.return_value.execute.return_value = interactions_result
                return tbl
            return mock_sb.table(name)

        mock_sb_patched = MagicMock()
        mock_sb_patched.table.side_effect = _table

        with (
            patch("app.api.v1.endpoints.missions.get_supabase_admin",
                  return_value=mock_sb_patched),
            patch("app.core.cache.get_cached_grade_level",
                  new=AsyncMock(return_value=3)),
            patch("app.api.v1.endpoints.missions.pull_from_bank",
                  new=AsyncMock(return_value=[])),
            patch("app.api.v1.endpoints.missions.generate_pillar_missions",
                  new=generator_mock),
            patch("app.api.v1.endpoints.missions.retrieve_grade_filtered_chunks",
                  new=AsyncMock(return_value=[])),
            patch("app.api.v1.endpoints.missions.cache_get",
                  new=AsyncMock(return_value=None)),
            patch("app.api.v1.endpoints.missions.cache_set",
                  new=AsyncMock()),
            patch("app.api.v1.endpoints.missions.get_student_performance_profile",
                  new=AsyncMock(return_value=None)),
        ):
            resp = await client.get(
                "/api/v1/missions/pillar",
                params={"pillar": "reading"},
                headers={"Authorization": "Bearer fake-student-token"},
            )

        assert resp.status_code == 200
        generator_mock.assert_called_once()
        call_kwargs = generator_mock.call_args.kwargs
        assert "student_weaknesses" in call_kwargs


# ── Tests for generate_pillar_missions function ────────────────────────────────

def _make_wait_for_mock(mock_result):
    """Return a drop-in for asyncio.wait_for that yields mock_result immediately.

    LangChain's RunnableSequence.ainvoke uses internal dispatch that bypasses a
    plain mock on ``runnable.ainvoke``.  Patching asyncio.wait_for is the most
    reliable interception point — it's the single call site in generate_pillar_missions
    that wraps the chain invocation, so returning mock_result here skips the chain
    entirely while leaving asyncio.sleep (used by the retry loop) untouched.
    """
    async def _fake_wait_for(coro, timeout=None):
        # Drain the coroutine cleanly so Python does not warn about it never
        # being awaited.  We ignore any exception it raises — we are replacing it.
        try:
            coro.close()
        except Exception:
            pass
        return mock_result
    return _fake_wait_for


class TestGeneratePillarMissions:
    """Unit tests for the generate_pillar_missions function."""

    @pytest.mark.asyncio
    async def test_invalid_pillar_raises_value_error(self):
        """Invalid pillar raises ValueError immediately (no LLM call needed)."""
        from app.agents.tutor_agent.mission_generator import generate_pillar_missions

        with pytest.raises(ValueError, match="Invalid pillar"):
            await generate_pillar_missions(
                pillar="invalid_pillar",
                grade_level=3,
                active_topics=["Animals"],
                student_id="student-123",
                student_weaknesses=[],
            )

    @pytest.mark.asyncio
    async def test_listening_pillar_accepted(self):
        """Listening pillar is a valid pillar — returns at least one question dict."""
        from app.agents.tutor_agent.mission_generator import (
            generate_pillar_missions,
            PillarMissions,
            MissionQuestion,
        )

        mock_questions = [
            MissionQuestion(
                id=i + 1,
                task_type="listen_and_choose",
                pillar="listening",
                question=f"Which image matches the word '{('cat','dog','fish')[i]}'?",
                difficulty="medium",
                points_value=10,
                correct_answer="a",
                emoji_hint="👂",
                audio_text=f"A {('cat','dog','fish')[i]} is sleeping",
                image_options=[
                    {"id": "a", "text": "cat",  "emoji": "🐱"},
                    {"id": "b", "text": "dog",  "emoji": "🐶"},
                    {"id": "c", "text": "fish", "emoji": "🐟"},
                    {"id": "d", "text": "bird", "emoji": "🐦"},
                ],
            )
            for i in range(2)
        ]
        mock_result = PillarMissions(questions=mock_questions)

        mock_llm_instance = MagicMock()
        mock_llm_instance.with_structured_output.return_value = MagicMock()

        mock_semantic = MagicMock()
        mock_semantic.validate_questions.return_value = (
            [q.model_dump() for q in mock_questions],  # all valid
            [],                                          # none invalid
            [],                                          # no issues
        )

        with (
            patch("app.agents.tutor_agent.mission_generator.ChatOpenAI",
                  return_value=mock_llm_instance),
            patch("app.agents.tutor_agent.mission_generator.asyncio.wait_for",
                  _make_wait_for_mock(mock_result)),
            patch("app.agents.tutor_agent.semantic_quality_validator.SemanticQualityValidator",
                  return_value=mock_semantic),
        ):
            questions = await generate_pillar_missions(
                pillar="listening",
                grade_level=3,
                active_topics=["Animals"],
                student_id="student-123",
                student_weaknesses=[],
            )

        assert isinstance(questions, list)
        assert len(questions) >= 1
        assert all(isinstance(q, dict) for q in questions)

    @pytest.mark.asyncio
    async def test_function_signature_has_no_current_week_topic(self):
        """generate_pillar_missions does NOT accept current_week_topic parameter."""
        from app.agents.tutor_agent.mission_generator import generate_pillar_missions
        import inspect

        sig = inspect.signature(generate_pillar_missions)
        assert "current_week_topic" not in sig.parameters, (
            "current_week_topic was removed from generate_pillar_missions — "
            "use active_topics instead"
        )
        assert "active_topics" in sig.parameters, (
            "active_topics is the replacement for current_week_topic"
        )

    @pytest.mark.asyncio
    async def test_returns_list_of_dicts(self):
        """generate_pillar_missions returns list[dict], not list[MissionQuestion]."""
        from app.agents.tutor_agent.mission_generator import (
            generate_pillar_missions,
            PillarMissions,
            MissionQuestion,
        )

        mock_q = MissionQuestion(
            id=1,
            task_type="sentence_picture_match",
            pillar="reading",
            question="Which picture shows a red apple on the table?",
            difficulty="medium",
            points_value=10,
            correct_answer="a",
            emoji_hint="📖",
            image_options=[
                {"id": "a", "text": "cat",  "emoji": "🐱"},
                {"id": "b", "text": "dog",  "emoji": "🐶"},
                {"id": "c", "text": "fish", "emoji": "🐟"},
                {"id": "d", "text": "bird", "emoji": "🐦"},
            ],
        )
        mock_result = PillarMissions(questions=[mock_q])

        mock_llm_instance = MagicMock()
        mock_llm_instance.with_structured_output.return_value = MagicMock()

        mock_semantic = MagicMock()
        mock_semantic.validate_questions.return_value = (
            [mock_q.model_dump()],  # all valid
            [],
            [],
        )

        with (
            patch("app.agents.tutor_agent.mission_generator.ChatOpenAI",
                  return_value=mock_llm_instance),
            patch("app.agents.tutor_agent.mission_generator.asyncio.wait_for",
                  _make_wait_for_mock(mock_result)),
            patch("app.agents.tutor_agent.semantic_quality_validator.SemanticQualityValidator",
                  return_value=mock_semantic),
        ):
            result = await generate_pillar_missions(
                pillar="reading",
                grade_level=3,
                active_topics=["Animals"],
                student_id="student-123",
                student_weaknesses=[],
            )

        assert isinstance(result, list)
        assert all(isinstance(q, dict) for q in result), (
            "generate_pillar_missions must return list[dict], not list[MissionQuestion]"
        )
        assert all("task_type" in q for q in result), (
            "Each question dict must have a 'task_type' key"
        )

    @pytest.mark.asyncio
    async def test_questions_get_pillar_tag(self):
        """All returned questions have the correct pillar set."""
        from app.agents.tutor_agent.mission_generator import (
            generate_pillar_missions,
            PillarMissions,
            MissionQuestion,
        )

        mock_q = MissionQuestion(
            id=1,
            task_type="listen_and_spell",
            pillar="listening",
            question="Spell the animal name you hear in the audio clip.",
            difficulty="medium",
            points_value=10,
            correct_answer="cat",
            emoji_hint="👂",
            audio_text="cat",
        )
        mock_result = PillarMissions(questions=[mock_q])

        mock_llm_instance = MagicMock()
        mock_llm_instance.with_structured_output.return_value = MagicMock()

        mock_semantic = MagicMock()
        mock_semantic.validate_questions.return_value = (
            [mock_q.model_dump()],
            [],
            [],
        )

        with (
            patch("app.agents.tutor_agent.mission_generator.ChatOpenAI",
                  return_value=mock_llm_instance),
            patch("app.agents.tutor_agent.mission_generator.asyncio.wait_for",
                  _make_wait_for_mock(mock_result)),
            patch("app.agents.tutor_agent.semantic_quality_validator.SemanticQualityValidator",
                  return_value=mock_semantic),
        ):
            questions = await generate_pillar_missions(
                pillar="listening",
                grade_level=3,
                active_topics=["Animals"],
                student_id="student-abc",
                student_weaknesses=[],
            )

        assert all(q["pillar"] == "listening" for q in questions)
