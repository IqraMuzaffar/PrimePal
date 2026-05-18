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
    Content-specific fields (correct_answer, audio_text, etc.) are deliberately
    distinct so the dedup logic in merge_bank_and_llm keeps all 10 questions.
    The dedup key is task-type-aware (correct_answer for sentence_scramble etc.)
    so each question must have a unique value for the field the dedup checks.
    """
    # Each entry: (task_type, question_text, extra_fields_dict)
    questions_by_pillar = {
        "reading": [
            ("sentence_picture_match", "Which picture matches: a red apple on the table?",
             {"correct_answer": "a", "image_options": [{"id":"a","text":"apple","emoji":"🍎"},{"id":"b","text":"dog","emoji":"🐶"},{"id":"c","text":"car","emoji":"🚗"},{"id":"d","text":"book","emoji":"📖"}]}),
            ("odd_one_out",            "Which word does NOT belong: cat, dog, table, bird?",
             {"correct_answer": "c", "options": [{"id":"a","text":"cat"},{"id":"b","text":"dog"},{"id":"c","text":"table"},{"id":"d","text":"bird"}]}),
            ("fill_blank_word_bank",   "The boy ___ to school every morning.",
             {"correct_answer": "b", "options": [{"id":"a","text":"runs"},{"id":"b","text":"goes"},{"id":"c","text":"flies"},{"id":"d","text":"swims"}]}),
            ("passage_true_false",     "Fish can breathe underwater.",
             {"correct_answer": "true", "passage": "Fish live in water and breathe through gills."}),
            ("sentence_picture_match", "Which image shows a child reading a book?",
             {"correct_answer": "b", "image_options": [{"id":"a","text":"running","emoji":"🏃"},{"id":"b","text":"reading","emoji":"📚"},{"id":"c","text":"sleeping","emoji":"😴"},{"id":"d","text":"eating","emoji":"🍽️"}]}),
            ("odd_one_out",            "Which is NOT a fruit: mango, banana, chair, orange?",
             {"correct_answer": "c", "options": [{"id":"a","text":"mango"},{"id":"b","text":"banana"},{"id":"c","text":"chair"},{"id":"d","text":"orange"}]}),
            ("fill_blank_word_bank",   "She drinks ___ with her breakfast.",
             {"correct_answer": "a", "options": [{"id":"a","text":"milk"},{"id":"b","text":"sand"},{"id":"c","text":"rock"},{"id":"d","text":"wind"}]}),
            ("passage_true_false",     "Elephants are the smallest animals on land.",
             {"correct_answer": "false", "passage": "Elephants are the largest land animals on Earth."}),
            ("sentence_picture_match", "Which photo shows the sun shining brightly?",
             {"correct_answer": "d", "image_options": [{"id":"a","text":"rain","emoji":"🌧️"},{"id":"b","text":"snow","emoji":"❄️"},{"id":"c","text":"cloud","emoji":"☁️"},{"id":"d","text":"sun","emoji":"☀️"}]}),
            ("odd_one_out",            "Find the word that does not fit: happy, sad, run, angry.",
             {"correct_answer": "c", "options": [{"id":"a","text":"happy"},{"id":"b","text":"sad"},{"id":"c","text":"run"},{"id":"d","text":"angry"}]}),
        ],
        "writing": [
            # sentence_scramble: dedup key = correct_answer (the sentence), must be distinct
            ("sentence_scramble",   "Put the words in the correct order",
             {"correct_answer": "Ahmed goes to school", "word_bank": ["goes","to","school","Ahmed"], "correct_order": ["Ahmed","goes","to","school"]}),
            # missing_letter: dedup key = correct_answer (the word), must be distinct
            ("missing_letter",      "Fill in the missing letter(s)",
             {"correct_answer": "butterfly", "word_with_blanks": "b_tterf_y", "letter_options": ["u","l","a","e","i","o"]}),
            # guided_translation: dedup key = correct_answer (English sentence), must be distinct
            ("guided_translation",  "بلی درخت پر بیٹھی ہے",
             {"correct_answer": "the cat sits on the tree", "word_bank": ["cat","the","on","tree","sits"], "correct_order": ["the","cat","sits","on","the","tree"]}),
            ("sentence_scramble",   "Put the words in the correct order",
             {"correct_answer": "she eats breakfast every day", "word_bank": ["eats","she","every","breakfast","day"], "correct_order": ["she","eats","breakfast","every","day"]}),
            ("missing_letter",      "Fill in the missing letter(s)",
             {"correct_answer": "sunflower", "word_with_blanks": "s_nfl_wer", "letter_options": ["u","o","a","e","i","w"]}),
            ("guided_translation",  "کتاب میز پر ہے",
             {"correct_answer": "the book is on the table", "word_bank": ["book","the","on","table","is"], "correct_order": ["the","book","is","on","the","table"]}),
            ("sentence_scramble",   "Put the words in the correct order",
             {"correct_answer": "my brother plays football", "word_bank": ["brother","plays","my","football"], "correct_order": ["my","brother","plays","football"]}),
            ("missing_letter",      "Fill in the missing letter(s)",
             {"correct_answer": "rainbow", "word_with_blanks": "r_inb_w", "letter_options": ["a","o","u","e","i","b"]}),
            ("guided_translation",  "پرندہ آسمان میں اڑتا ہے",
             {"correct_answer": "the bird flies in the sky", "word_bank": ["bird","the","in","sky","flies"], "correct_order": ["the","bird","flies","in","the","sky"]}),
            ("sentence_scramble",   "Put the words in the correct order",
             {"correct_answer": "the mother goes to the market", "word_bank": ["mother","goes","the","market","to"], "correct_order": ["the","mother","goes","to","the","market"]}),
        ],
        "listening": [
            # listen_and_choose / simon_says / listen_and_spell: dedup key = audio_text, must be distinct
            ("listen_and_choose", "Listen and choose.",
             {"audio_text": "The dog is barking loudly in the garden.", "correct_answer": "a", "image_options": [{"id":"a","text":"dog","emoji":"🐶"},{"id":"b","text":"cat","emoji":"🐱"},{"id":"c","text":"bird","emoji":"🐦"},{"id":"d","text":"fish","emoji":"🐟"}]}),
            ("simon_says",        "Do what Simon says.",
             {"audio_text": "Touch your nose.", "correct_answer": "a", "options": [{"id":"a","text":"Touch nose"},{"id":"b","text":"Clap hands"},{"id":"c","text":"Stamp feet"},{"id":"d","text":"Blink eyes"}]}),
            ("listen_and_spell",  "Spell the word you hear.",
             {"audio_text": "apple", "correct_answer": "apple"}),
            ("listen_and_choose", "Listen and choose.",
             {"audio_text": "It is raining outside and the sky is grey.", "correct_answer": "b", "image_options": [{"id":"a","text":"sun","emoji":"☀️"},{"id":"b","text":"rain","emoji":"🌧️"},{"id":"c","text":"snow","emoji":"❄️"},{"id":"d","text":"wind","emoji":"💨"}]}),
            ("simon_says",        "Do what Simon says.",
             {"audio_text": "Clap your hands twice.", "correct_answer": "b", "options": [{"id":"a","text":"Stamp feet"},{"id":"b","text":"Clap hands"},{"id":"c","text":"Touch head"},{"id":"d","text":"Close eyes"}]}),
            ("listen_and_spell",  "Spell the word you hear.",
             {"audio_text": "elephant", "correct_answer": "elephant"}),
            ("listen_and_choose", "Listen and choose.",
             {"audio_text": "The girl is jumping rope in the playground.", "correct_answer": "c", "image_options": [{"id":"a","text":"swimming","emoji":"🏊"},{"id":"b","text":"running","emoji":"🏃"},{"id":"c","text":"jumping","emoji":"⛹️"},{"id":"d","text":"sleeping","emoji":"😴"}]}),
            ("simon_says",        "Do what Simon says.",
             {"audio_text": "Stand on one leg.", "correct_answer": "d", "options": [{"id":"a","text":"Sit down"},{"id":"b","text":"Spin around"},{"id":"c","text":"Touch toes"},{"id":"d","text":"Stand on one leg"}]}),
            ("listen_and_spell",  "Spell the word you hear.",
             {"audio_text": "bicycle", "correct_answer": "bicycle"}),
            ("listen_and_choose", "Listen and choose.",
             {"audio_text": "It is very hot today and the sun is bright.", "correct_answer": "a", "image_options": [{"id":"a","text":"summer","emoji":"🌞"},{"id":"b","text":"winter","emoji":"🌨️"},{"id":"c","text":"spring","emoji":"🌸"},{"id":"d","text":"autumn","emoji":"🍂"}]}),
        ],
        "speaking": [
            # repeat_after_me: dedup key = audio_text, must be distinct
            ("repeat_after_me",     "Repeat after me.",
             {"audio_text": "The cat sat on the mat.", "correct_answer": "The cat sat on the mat."}),
            # what_is_this: dedup key = image_context, must be distinct
            ("what_is_this",        "What is this?",
             {"image_context": "🍎", "correct_answer": "apple"}),
            # finish_the_sentence: dedup key = sentence_start, must be distinct
            ("finish_the_sentence", "Finish this sentence:",
             {"sentence_start": "The sky is blue and the grass is", "correct_answer": "green"}),
            ("repeat_after_me",     "Repeat after me.",
             {"audio_text": "My name is Ahmed and I am eight years old.", "correct_answer": "My name is Ahmed and I am eight years old."}),
            ("what_is_this",        "What is this?",
             {"image_context": "🐶", "correct_answer": "dog"}),
            ("finish_the_sentence", "Finish this sentence:",
             {"sentence_start": "We use an umbrella when it", "correct_answer": "rains"}),
            ("repeat_after_me",     "Repeat after me.",
             {"audio_text": "She sells seashells by the seashore.", "correct_answer": "She sells seashells by the seashore."}),
            ("what_is_this",        "What is this?",
             {"image_context": "✏️", "correct_answer": "pencil"}),
            ("finish_the_sentence", "Finish this sentence:",
             {"sentence_start": "I brush my teeth before I go to", "correct_answer": "sleep"}),
            ("repeat_after_me",     "Repeat after me.",
             {"audio_text": "The quick brown fox jumps over the lazy dog.", "correct_answer": "The quick brown fox jumps over the lazy dog."}),
        ],
    }
    entries = questions_by_pillar.get(pillar, questions_by_pillar["reading"])
    questions = []
    for i, (task_type, question_text, extra) in enumerate(entries):
        q = {
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
        }
        q.update(extra)
        questions.append(q)
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
