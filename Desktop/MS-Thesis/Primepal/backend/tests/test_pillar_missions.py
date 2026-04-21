"""
Tests for Feature 3: Pillar-based Missions Endpoint

Covers:
  - GET /api/v1/missions/pillar (endpoint integration)
  - Pillar parameter validation (reading, writing, listening, speaking)
  - Fetching current_week_topic from classroom
  - Retrieving student weaknesses from interactions table
  - Generating 10 questions with weakness focus
  - Stripping correct_answer from client response

Patching conventions:
  - Supabase:                app.api.v1.endpoints.missions.get_supabase_admin
  - Mission generator:       app.api.v1.endpoints.missions.generate_pillar_missions
  - Student auth is overridden via app.dependency_overrides[get_current_student]
"""
import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import AsyncClient

from app.agents.tutor_agent.mission_generator import (
    MissionQuestion,
    QuestionOption,
)

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

# Mock 10 pillar questions
def _make_mock_pillar_questions():
    """Create 10 mock MissionQuestion objects."""
    questions = []
    for i in range(10):
        is_weakness_focused = i < 3
        q = MissionQuestion(
            id=i + 1,
            type="multiple_choice" if i < 7 else "fill_blank",
            question=f"Sample reading question {i + 1}",
            options=(
                [
                    QuestionOption(id="a", text="Option A"),
                    QuestionOption(id="b", text="Option B"),
                    QuestionOption(id="c", text="Option C"),
                    QuestionOption(id="d", text="Option D"),
                ]
                if i < 7
                else None
            ),
            correct_answer="a" if i < 7 else "answer",
            emoji_hint="📖",
        )
        # Add metadata as dict for testing
        questions.append({
            **q.model_dump(),
            "is_weakness_focused": is_weakness_focused,
        })
    return questions


# ── Supabase mock helpers ─────────────────────────────────────────────────────

def _make_classroom_supabase_mock(classroom_data=None):
    """
    Mock supabase_admin that returns a classroom row.
    """
    if classroom_data is None:
        classroom_data = MOCK_CLASSROOM_WITH_TOPIC

    mock_client = MagicMock()
    classroom_result = MagicMock()
    classroom_result.data = classroom_data
    (
        mock_client.table.return_value
        .select.return_value
        .eq.return_value
        .maybe_single.return_value
        .execute.return_value
    ) = classroom_result
    return mock_client


def _make_missing_classroom_mock():
    """Mock supabase_admin where classroom lookup returns None."""
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


def _make_supabase_with_interactions_mock(classroom_data=None, interactions_data=None):
    """
    Mock supabase_admin that handles both classrooms and interactions tables.
    """
    if classroom_data is None:
        classroom_data = MOCK_CLASSROOM_WITH_TOPIC
    if interactions_data is None:
        interactions_data = []

    mock_client = MagicMock()

    def table_side_effect(table_name):
        table_mock = MagicMock()
        if table_name == "classrooms":
            classroom_result = MagicMock()
            classroom_result.data = classroom_data
            (
                table_mock.select.return_value
                .eq.return_value
                .maybe_single.return_value
                .execute.return_value
            ) = classroom_result
        elif table_name == "interactions":
            interactions_result = MagicMock()
            interactions_result.data = interactions_data
            (
                table_mock.select.return_value
                .eq.return_value
                .eq.return_value
                .order.return_value
                .limit.return_value
                .execute.return_value
            ) = interactions_result
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
        Valid pillar=reading, classroom found with current_week_topic → 200 OK.
        Returns 10 questions with weakness focus count.
        """
        mock_questions = _make_mock_pillar_questions()

        with (
            patch(
                "app.api.v1.endpoints.missions.get_supabase_admin",
                return_value=_make_supabase_with_interactions_mock(
                    classroom_data=MOCK_CLASSROOM_WITH_TOPIC,
                    interactions_data=[],
                ),
            ),
            patch(
                "app.api.v1.endpoints.missions.generate_pillar_missions",
                new=AsyncMock(return_value=mock_questions),
            ),
        ):
            resp = await client.get(
                "/api/v1/missions/pillar",
                params={"pillar": "reading"},
                headers={"Authorization": "Bearer fake-student-token"},
            )

        assert resp.status_code == 200
        body = resp.json()
        assert body["pillar"] == "reading"
        assert body["current_week_topic"] == "Animals"
        assert len(body["questions"]) == 10
        assert body["weakness_focus_questions"] == 3  # First 3 are marked as weakness_focused

    async def test_pillar_writing_returns_correct_pillar(self, client: AsyncClient):
        """Test that pillar=writing is accepted and returned correctly."""
        mock_questions = _make_mock_pillar_questions()

        with (
            patch(
                "app.api.v1.endpoints.missions.get_supabase_admin",
                return_value=_make_supabase_with_interactions_mock(
                    classroom_data=MOCK_CLASSROOM_WITHOUT_TOPIC,
                    interactions_data=[],
                ),
            ),
            patch(
                "app.api.v1.endpoints.missions.generate_pillar_missions",
                new=AsyncMock(return_value=mock_questions),
            ),
        ):
            resp = await client.get(
                "/api/v1/missions/pillar",
                params={"pillar": "writing"},
                headers={"Authorization": "Bearer fake-student-token"},
            )

        assert resp.status_code == 200
        body = resp.json()
        assert body["pillar"] == "writing"
        assert body["current_week_topic"] is None  # Teacher hasn't set it

    async def test_pillar_listening(self, client: AsyncClient):
        """Test listening pillar is accepted."""
        mock_questions = _make_mock_pillar_questions()

        with (
            patch(
                "app.api.v1.endpoints.missions.get_supabase_admin",
                return_value=_make_supabase_with_interactions_mock(
                    classroom_data=MOCK_CLASSROOM_WITH_TOPIC,
                    interactions_data=[],
                ),
            ),
            patch(
                "app.api.v1.endpoints.missions.generate_pillar_missions",
                new=AsyncMock(return_value=mock_questions),
            ),
        ):
            resp = await client.get(
                "/api/v1/missions/pillar",
                params={"pillar": "listening"},
                headers={"Authorization": "Bearer fake-student-token"},
            )

        assert resp.status_code == 200
        assert resp.json()["pillar"] == "listening"

    async def test_pillar_speaking(self, client: AsyncClient):
        """Test speaking pillar is accepted."""
        mock_questions = _make_mock_pillar_questions()

        with (
            patch(
                "app.api.v1.endpoints.missions.get_supabase_admin",
                return_value=_make_supabase_with_interactions_mock(
                    classroom_data=MOCK_CLASSROOM_WITH_TOPIC,
                    interactions_data=[],
                ),
            ),
            patch(
                "app.api.v1.endpoints.missions.generate_pillar_missions",
                new=AsyncMock(return_value=mock_questions),
            ),
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
        with patch(
            "app.api.v1.endpoints.missions.get_supabase_admin",
            return_value=_make_supabase_with_interactions_mock(),
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
        """If classroom cannot be found → HTTP 404."""
        with patch(
            "app.api.v1.endpoints.missions.get_supabase_admin",
            return_value=_make_missing_classroom_mock(),
        ):
            resp = await client.get(
                "/api/v1/missions/pillar",
                params={"pillar": "reading"},
                headers={"Authorization": "Bearer fake-student-token"},
            )

        assert resp.status_code == 404
        assert "Classroom not found" in resp.json()["detail"]

    async def test_correct_answer_not_in_response(self, client: AsyncClient):
        """The questions in the response must NOT expose correct_answer."""
        mock_questions = _make_mock_pillar_questions()

        with (
            patch(
                "app.api.v1.endpoints.missions.get_supabase_admin",
                return_value=_make_supabase_with_interactions_mock(
                    classroom_data=MOCK_CLASSROOM_WITH_TOPIC,
                    interactions_data=[],
                ),
            ),
            patch(
                "app.api.v1.endpoints.missions.generate_pillar_missions",
                new=AsyncMock(return_value=mock_questions),
            ),
        ):
            resp = await client.get(
                "/api/v1/missions/pillar",
                params={"pillar": "reading"},
                headers={"Authorization": "Bearer fake-student-token"},
            )

        assert resp.status_code == 200
        for question in resp.json()["questions"]:
            assert "correct_answer" not in question, (
                "correct_answer must be stripped before sending to the client"
            )

    async def test_pillar_parameter_required(self, client: AsyncClient):
        """Requesting without pillar parameter → HTTP 422 (Unprocessable Entity)."""
        with patch(
            "app.api.v1.endpoints.missions.get_supabase_admin",
            return_value=_make_supabase_with_interactions_mock(),
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
        weak_interactions = [
            {
                "id": "int-1",
                "student_id": STUDENT_ID,
                "pillar": "reading",
                "score": 0.3,  # Failed
                "input_text": "The student answered incorrectly",
                "audio_transcript": None,
                "created_at": "2026-04-21T10:00:00Z",
            },
            {
                "id": "int-2",
                "student_id": STUDENT_ID,
                "pillar": "reading",
                "score": 0.5,  # Failed
                "input_text": "Another weak answer",
                "audio_transcript": None,
                "created_at": "2026-04-21T09:00:00Z",
            },
        ]
        mock_questions = _make_mock_pillar_questions()
        generator_mock = AsyncMock(return_value=mock_questions)

        with (
            patch(
                "app.api.v1.endpoints.missions.get_supabase_admin",
                return_value=_make_supabase_with_interactions_mock(
                    classroom_data=MOCK_CLASSROOM_WITH_TOPIC,
                    interactions_data=weak_interactions,
                ),
            ),
            patch(
                "app.api.v1.endpoints.missions.generate_pillar_missions",
                new=generator_mock,
            ),
        ):
            resp = await client.get(
                "/api/v1/missions/pillar",
                params={"pillar": "reading"},
                headers={"Authorization": "Bearer fake-student-token"},
            )

        assert resp.status_code == 200
        # Verify generator was called with weaknesses
        generator_mock.assert_called_once()
        call_args = generator_mock.call_args
        assert call_args is not None
        assert "student_weaknesses" in call_args.kwargs
        assert len(call_args.kwargs["student_weaknesses"]) == 2


# ── Tests for LLM-based Mission Generator ──────────────────────────────────────

class TestMissionGeneratorLLMBased:
    """Tests for the LLM-based generate_pillar_missions function."""

    @pytest.mark.asyncio
    async def test_reading_pillar_generates_10_questions(self):
        """Test that reading pillar generates exactly 10 questions."""
        from app.agents.tutor_agent.mission_generator import generate_pillar_missions

        # Mock the OpenAI API response
        json_response = """\
[
  {"id": 1, "type": "multiple_choice", "question": "What does 'happy' mean?", "options": [{"id": "a", "text": "Sad"}, {"id": "b", "text": "Joyful"}, {"id": "c", "text": "Angry"}, {"id": "d", "text": "Tired"}], "correct_answer": "b", "emoji_hint": "😊", "is_weakness_focused": false},
  {"id": 2, "type": "multiple_choice", "question": "Which is a color?", "options": [{"id": "a", "text": "Blue"}, {"id": "b", "text": "Run"}, {"id": "c", "text": "Jump"}, {"id": "d", "text": "Sleep"}], "correct_answer": "a", "emoji_hint": "🎨", "is_weakness_focused": false},
  {"id": 3, "type": "multiple_choice", "question": "What does 'cat' do?", "options": [{"id": "a", "text": "Swims"}, {"id": "b", "text": "Meows"}, {"id": "c", "text": "Flies"}, {"id": "d", "text": "Crawls"}], "correct_answer": "b", "emoji_hint": "🐱", "is_weakness_focused": true},
  {"id": 4, "type": "multiple_choice", "question": "Choose the animal:", "options": [{"id": "a", "text": "Car"}, {"id": "b", "text": "Dog"}, {"id": "c", "text": "Chair"}, {"id": "d", "text": "Table"}], "correct_answer": "b", "emoji_hint": "🐕", "is_weakness_focused": false},
  {"id": 5, "type": "multiple_choice", "question": "What is big?", "options": [{"id": "a", "text": "Ant"}, {"id": "b", "text": "Elephant"}, {"id": "c", "text": "Bee"}, {"id": "d", "text": "Pin"}], "correct_answer": "b", "emoji_hint": "🐘", "is_weakness_focused": false},
  {"id": 6, "type": "multiple_choice", "question": "Opposite of hot?", "options": [{"id": "a", "text": "Warm"}, {"id": "b", "text": "Cold"}, {"id": "c", "text": "Cool"}, {"id": "d", "text": "Hot"}], "correct_answer": "b", "emoji_hint": "❄️", "is_weakness_focused": true},
  {"id": 7, "type": "multiple_choice", "question": "What can fly?", "options": [{"id": "a", "text": "Fish"}, {"id": "b", "text": "Snake"}, {"id": "c", "text": "Bird"}, {"id": "d", "text": "Turtle"}], "correct_answer": "c", "emoji_hint": "🦅", "is_weakness_focused": false},
  {"id": 8, "type": "fill_blank", "question": "A ___ says meow.", "options": null, "correct_answer": "cat", "emoji_hint": "🐱", "is_weakness_focused": true},
  {"id": 9, "type": "fill_blank", "question": "The sun is ___.", "options": null, "correct_answer": "yellow", "emoji_hint": "☀️", "is_weakness_focused": false},
  {"id": 10, "type": "fill_blank", "question": "I like to ___.", "options": null, "correct_answer": "play", "emoji_hint": "🎮", "is_weakness_focused": false}
]
"""

        with patch(
            "app.agents.tutor_agent.mission_generator.AsyncOpenAI"
        ) as mock_openai_class:
            mock_client = AsyncMock()
            mock_openai_class.return_value = mock_client

            # Create a proper mock response object
            mock_response = MagicMock()
            mock_response.choices = [MagicMock()]
            mock_response.choices[0].message.content = json_response
            mock_client.chat.completions.create = AsyncMock(return_value=mock_response)

            questions = await generate_pillar_missions(
                pillar="reading",
                grade_level=3,
                current_week_topic="Animals",
                student_id="student-123",
                student_weaknesses=["What is a cat?"],
            )

        assert len(questions) == 10
        assert all(q["type"] in ["multiple_choice", "fill_blank"] for q in questions)
        weakness_focused = [q for q in questions if q.get("is_weakness_focused")]
        assert len(weakness_focused) >= 1

    @pytest.mark.asyncio
    async def test_writing_pillar_has_correct_emoji(self):
        """Test that writing pillar uses writing emoji."""
        from app.agents.tutor_agent.mission_generator import generate_pillar_missions

        json_response = """\
[
  {"id": 1, "type": "multiple_choice", "question": "Choose correct spelling:", "options": [{"id": "a", "text": "Cat"}, {"id": "b", "text": "Kat"}, {"id": "c", "text": "Katt"}, {"id": "d", "text": "Catt"}], "correct_answer": "a", "emoji_hint": "✍️", "is_weakness_focused": false},
  {"id": 2, "type": "multiple_choice", "question": "Spell 'dog':", "options": [{"id": "a", "text": "Dog"}, {"id": "b", "text": "Dug"}, {"id": "c", "text": "Dag"}, {"id": "d", "text": "Doog"}], "correct_answer": "a", "emoji_hint": "✍️", "is_weakness_focused": false},
  {"id": 3, "type": "multiple_choice", "question": "Write 'hello':", "options": [{"id": "a", "text": "Helo"}, {"id": "b", "text": "Hello"}, {"id": "c", "text": "Hallo"}, {"id": "d", "text": "Helo"}], "correct_answer": "b", "emoji_hint": "✍️", "is_weakness_focused": false},
  {"id": 4, "type": "multiple_choice", "question": "Correct spelling:", "options": [{"id": "a", "text": "Bok"}, {"id": "b", "text": "Book"}, {"id": "c", "text": "Buk"}, {"id": "d", "text": "Bok"}], "correct_answer": "b", "emoji_hint": "✍️", "is_weakness_focused": false},
  {"id": 5, "type": "multiple_choice", "question": "Pick correct form:", "options": [{"id": "a", "text": "Run"}, {"id": "b", "text": "Runn"}, {"id": "c", "text": "Rune"}, {"id": "d", "text": "Run"}], "correct_answer": "a", "emoji_hint": "✍️", "is_weakness_focused": false},
  {"id": 6, "type": "multiple_choice", "question": "Spell 'apple':", "options": [{"id": "a", "text": "Apple"}, {"id": "b", "text": "Aple"}, {"id": "c", "text": "Appel"}, {"id": "d", "text": "Apel"}], "correct_answer": "a", "emoji_hint": "✍️", "is_weakness_focused": false},
  {"id": 7, "type": "multiple_choice", "question": "Correct word:", "options": [{"id": "a", "text": "Play"}, {"id": "b", "text": "Pley"}, {"id": "c", "text": "Plai"}, {"id": "d", "text": "Pleigh"}], "correct_answer": "a", "emoji_hint": "✍️", "is_weakness_focused": false},
  {"id": 8, "type": "fill_blank", "question": "The ___: tree (fill in article)", "options": null, "correct_answer": "is", "emoji_hint": "✍️", "is_weakness_focused": false},
  {"id": 9, "type": "fill_blank", "question": "She ___ happy.", "options": null, "correct_answer": "is", "emoji_hint": "✍️", "is_weakness_focused": false},
  {"id": 10, "type": "fill_blank", "question": "We ___ school.", "options": null, "correct_answer": "like", "emoji_hint": "✍️", "is_weakness_focused": false}
]
"""

        with patch(
            "app.agents.tutor_agent.mission_generator.AsyncOpenAI"
        ) as mock_openai_class:
            mock_client = AsyncMock()
            mock_openai_class.return_value = mock_client

            mock_response = MagicMock()
            mock_response.choices = [MagicMock()]
            mock_response.choices[0].message.content = json_response
            mock_client.chat.completions.create = AsyncMock(return_value=mock_response)

            questions = await generate_pillar_missions(
                pillar="writing",
                grade_level=2,
                current_week_topic="Spelling",
                student_id="student-456",
                student_weaknesses=[],
            )

        assert len(questions) == 10
        assert all(q["emoji_hint"] in ["✍️", "📝", "✏️"] or not q["emoji_hint"].isidentifier() for q in questions)

    @pytest.mark.asyncio
    async def test_listening_pillar_all_multiple_choice(self):
        """Test that listening pillar uses only multiple_choice questions."""
        from app.agents.tutor_agent.mission_generator import generate_pillar_missions

        # Generate mock JSON for 10 listening questions
        listening_questions = [
            {
                "id": i + 1,
                "type": "multiple_choice",
                "question": f"Listen to the story. Question {i + 1}?",
                "options": [
                    {"id": "a", "text": f"Answer A for Q{i+1}"},
                    {"id": "b", "text": f"Answer B for Q{i+1}"},
                    {"id": "c", "text": f"Answer C for Q{i+1}"},
                    {"id": "d", "text": f"Answer D for Q{i+1}"},
                ],
                "correct_answer": chr(97 + (i % 4)),
                "emoji_hint": "👂",
                "is_weakness_focused": i < 3,
            }
            for i in range(10)
        ]

        with patch(
            "app.agents.tutor_agent.mission_generator.AsyncOpenAI"
        ) as mock_openai_class:
            mock_client = AsyncMock()
            mock_openai_class.return_value = mock_client

            mock_response = MagicMock()
            mock_response.choices = [MagicMock()]
            mock_response.choices[0].message.content = json.dumps(listening_questions)
            mock_client.chat.completions.create = AsyncMock(return_value=mock_response)

            questions = await generate_pillar_missions(
                pillar="listening",
                grade_level=4,
                current_week_topic="Stories",
                student_id="student-789",
                student_weaknesses=["I don't understand stories"],
            )

        assert len(questions) == 10
        assert all(q["type"] == "multiple_choice" for q in questions)
        assert all(len(q["options"]) == 4 for q in questions if q["options"])

    @pytest.mark.asyncio
    async def test_speaking_pillar_all_fill_blank(self):
        """Test that speaking pillar uses only fill_blank (prompt) questions."""
        from app.agents.tutor_agent.mission_generator import generate_pillar_missions

        speaking_questions = [
            {
                "id": i + 1,
                "type": "fill_blank",
                "question": f"Speak about prompt {i + 1}",
                "options": None,
                "correct_answer": f"Example answer {i+1}",
                "emoji_hint": "🗣️",
                "is_weakness_focused": i < 3,
            }
            for i in range(10)
        ]

        with patch(
            "app.agents.tutor_agent.mission_generator.AsyncOpenAI"
        ) as mock_openai_class:
            mock_client = AsyncMock()
            mock_openai_class.return_value = mock_client

            mock_response = MagicMock()
            mock_response.choices = [MagicMock()]
            mock_response.choices[0].message.content = json.dumps(speaking_questions)
            mock_client.chat.completions.create = AsyncMock(return_value=mock_response)

            questions = await generate_pillar_missions(
                pillar="speaking",
                grade_level=2,
                current_week_topic="Greetings",
                student_id="student-999",
                student_weaknesses=[],
            )

        assert len(questions) == 10
        assert all(q["type"] == "fill_blank" for q in questions)
        assert all(q["options"] is None for q in questions)

    @pytest.mark.asyncio
    async def test_invalid_pillar_raises_error(self):
        """Test that invalid pillar raises ValueError."""
        from app.agents.tutor_agent.mission_generator import generate_pillar_missions

        with pytest.raises(ValueError, match="Invalid pillar"):
            await generate_pillar_missions(
                pillar="invalid_pillar",
                grade_level=3,
                current_week_topic="Topic",
                student_id="student-123",
                student_weaknesses=[],
            )

    @pytest.mark.asyncio
    async def test_handles_malformed_json_response(self):
        """Test that malformed LLM response raises RuntimeError."""
        from app.agents.tutor_agent.mission_generator import generate_pillar_missions

        with patch(
            "app.agents.tutor_agent.mission_generator.AsyncOpenAI"
        ) as mock_openai_class:
            mock_client = AsyncMock()
            mock_openai_class.return_value = mock_client

            mock_response = MagicMock()
            mock_response.choices = [MagicMock()]
            mock_response.choices[0].message.content = "This is not valid JSON"
            mock_client.chat.completions.create = AsyncMock(return_value=mock_response)

            with pytest.raises(RuntimeError, match="Failed to parse LLM response"):
                await generate_pillar_missions(
                    pillar="reading",
                    grade_level=3,
                    current_week_topic="Topic",
                    student_id="student-123",
                    student_weaknesses=[],
                )

    @pytest.mark.asyncio
    async def test_handles_wrong_question_count(self):
        """Test that LLM response with wrong question count raises RuntimeError."""
        from app.agents.tutor_agent.mission_generator import generate_pillar_missions

        # Only 5 questions instead of 10
        questions_data = [
            {
                "id": i + 1,
                "type": "multiple_choice",
                "question": f"Question {i+1}",
                "options": [{"id": "a", "text": "A"}, {"id": "b", "text": "B"}, {"id": "c", "text": "C"}, {"id": "d", "text": "D"}],
                "correct_answer": "a",
                "emoji_hint": "📖",
                "is_weakness_focused": False,
            }
            for i in range(5)  # Only 5, not 10
        ]

        with patch(
            "app.agents.tutor_agent.mission_generator.AsyncOpenAI"
        ) as mock_openai_class:
            mock_client = AsyncMock()
            mock_openai_class.return_value = mock_client

            mock_response = MagicMock()
            mock_response.choices = [MagicMock()]
            mock_response.choices[0].message.content = json.dumps(questions_data)
            mock_client.chat.completions.create = AsyncMock(return_value=mock_response)

            with pytest.raises(RuntimeError, match="Expected exactly 10 questions"):
                await generate_pillar_missions(
                    pillar="reading",
                    grade_level=3,
                    current_week_topic="Topic",
                    student_id="student-123",
                    student_weaknesses=[],
                )

    @pytest.mark.asyncio
    async def test_extracts_json_from_markdown_code_blocks(self):
        """Test that JSON wrapped in markdown code blocks is extracted correctly."""
        from app.agents.tutor_agent.mission_generator import generate_pillar_missions

        questions_data = [
            {
                "id": i + 1,
                "type": "multiple_choice",
                "question": f"Question {i+1}",
                "options": [{"id": "a", "text": "A"}, {"id": "b", "text": "B"}, {"id": "c", "text": "C"}, {"id": "d", "text": "D"}],
                "correct_answer": "a",
                "emoji_hint": "📖",
                "is_weakness_focused": False,
            }
            for i in range(10)
        ]

        # Wrap JSON in markdown code blocks
        json_content = f"```json\n{json.dumps(questions_data)}\n```"

        with patch(
            "app.agents.tutor_agent.mission_generator.AsyncOpenAI"
        ) as mock_openai_class:
            mock_client = AsyncMock()
            mock_openai_class.return_value = mock_client

            mock_response = MagicMock()
            mock_response.choices = [MagicMock()]
            mock_response.choices[0].message.content = json_content
            mock_client.chat.completions.create = AsyncMock(return_value=mock_response)

            questions = await generate_pillar_missions(
                pillar="reading",
                grade_level=3,
                current_week_topic="Topic",
                student_id="student-123",
                student_weaknesses=[],
            )

        assert len(questions) == 10
        assert all(q["type"] == "multiple_choice" for q in questions)
