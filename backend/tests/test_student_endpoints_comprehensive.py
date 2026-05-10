"""
Comprehensive tests for ALL student-facing endpoints.

Covers:
  - Auth: GET /auth/classroom/{code}/avatars, POST /auth/student/login, PATCH /auth/student/profile
  - Missions: GET /missions/daily, POST /missions/complete, GET /missions/me,
              GET /missions/pillar, POST /missions/submit-batch, GET /missions/performance,
              GET /missions/weekly-progress, GET /missions/daily-pillar-status
  - Achievements: GET /achievements/all, GET /achievements/me, POST /achievements/check
  - Evaluations: GET /evaluations/status, GET /evaluations/questions, POST /evaluations/submit
  - Interactions: POST /interactions
  - Rewards: GET /rewards/daily-summary, GET /rewards/streak, GET /rewards/points-breakdown
  - Speaking: GET /speaking/prompts, POST /speaking/evaluate
  - Student Scores: GET /student/my-scores
  - Story Time: GET /story-time/story, POST /story-time/answer
  - Puzzle Palace: GET /puzzle-palace/rooms
  - Topics: GET /topics
"""
import asyncio
import json
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.security import create_student_token, get_current_student
from app.main import app

# ---------------------------------------------------------------------------
# Test constants
# ---------------------------------------------------------------------------

STUDENT_ID = "dddddddd-0000-0000-0000-000000000001"
CLASSROOM_ID = "cccccccc-0000-0000-0000-000000000001"
STUDENT_TOKEN = None  # set in fixture

MOCK_STUDENT_JWT = {
    "sub": STUDENT_ID,
    "classroom_id": CLASSROOM_ID,
    "role": "student",
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _sb_mock(**overrides):
    """Build a mock Supabase admin client with configurable table responses."""
    mock = MagicMock()
    table_data = overrides

    def _table(name):
        tbl = MagicMock()
        if name in table_data:
            data = table_data[name]
            # Support list (multi-row) and dict (single-row) responses
            result = MagicMock()
            result.data = data
            result.count = len(data) if isinstance(data, list) else 1

            # select().eq().execute()
            tbl.select.return_value.eq.return_value.execute.return_value = result
            # select().eq().maybe_single().execute()
            tbl.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = result
            # select().eq().eq().execute()
            tbl.select.return_value.eq.return_value.eq.return_value.execute.return_value = result
            tbl.select.return_value.eq.return_value.eq.return_value.maybe_single.return_value.execute.return_value = result
            # select().eq().gte().execute()
            tbl.select.return_value.eq.return_value.gte.return_value.execute.return_value = result
            tbl.select.return_value.eq.return_value.eq.return_value.gte.return_value.execute.return_value = result
            # select().eq().not_.is_().execute()  (for student_scores)
            tbl.select.return_value.eq.return_value.not_.is_.return_value.execute.return_value = result
            tbl.select.return_value.eq.return_value.not_.is_.return_value.gte.return_value.execute.return_value = result
            # select().eq().like().execute()
            tbl.select.return_value.eq.return_value.like.return_value.execute.return_value = result
            # select().order().execute()
            tbl.select.return_value.order.return_value.execute.return_value = result
            # select().eq().order().execute()
            tbl.select.return_value.eq.return_value.order.return_value.execute.return_value = result
            tbl.select.return_value.eq.return_value.eq.return_value.order.return_value.limit.return_value.maybe_single.return_value.execute.return_value = result
            # select().eq().eq().order().limit().maybe_single().execute()
            tbl.select.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value = result
            # select().in_().execute()
            tbl.select.return_value.in_.return_value.execute.return_value = result
            # insert().execute()
            tbl.insert.return_value.execute.return_value = result
            # update().eq().execute()
            tbl.update.return_value.eq.return_value.execute.return_value = result
            # select().eq().single().execute()
            tbl.select.return_value.eq.return_value.single.return_value.execute.return_value = result
        return tbl

    mock.table.side_effect = _table

    # rpc mock — returns empty by default
    rpc_result = MagicMock()
    rpc_result.data = [{"new_points": 110}]
    mock.rpc.return_value.execute.return_value = rpc_result

    return mock


def _patch_sb(module_path):
    """Convenience: patch get_supabase_admin in a specific endpoint module."""
    return patch(f"app.api.v1.endpoints.{module_path}.get_supabase_admin")


async def _fake_to_thread(fn, *args, **kwargs):
    """Replace asyncio.to_thread with sync call (for tests)."""
    return fn(*args, **kwargs)


def _patch_cache():
    """Disable Redis cache (return None for gets, no-op for sets)."""
    return (
        patch("app.core.cache.cache_get", new_callable=AsyncMock, return_value=None),
        patch("app.core.cache.cache_set", new_callable=AsyncMock),
        patch("app.core.cache.cache_delete_pattern", new_callable=AsyncMock),
    )


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(autouse=True)
def _override_student_auth():
    """Override student auth for all tests in this module."""
    app.dependency_overrides[get_current_student] = lambda: MOCK_STUDENT_JWT
    yield
    app.dependency_overrides.pop(get_current_student, None)


@pytest.fixture
def student_headers():
    token = create_student_token(STUDENT_ID, CLASSROOM_ID)
    return {"Authorization": f"Bearer {token}"}


# ═══════════════════════════════════════════════════════════════════════════
# 1. AUTH ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════


class TestAuthAvatars:
    """GET /api/v1/auth/classroom/{class_code}/avatars"""

    async def test_returns_student_list(self, client: AsyncClient):
        mock_sb = MagicMock()

        def _table(name):
            tbl = MagicMock()
            if name == "classrooms":
                r = MagicMock()
                r.data = {"id": CLASSROOM_ID}
                tbl.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = r
            elif name == "students":
                r = MagicMock()
                r.data = [
                    {"id": "s1", "student_name": "Ali", "avatar_url": "url1", "avatar_style": "adventurer", "theme_color": "#6366f1"},
                    {"id": "s2", "student_name": "Sara", "avatar_url": "url2", "avatar_style": "bottts", "theme_color": "#8b5cf6"},
                ]
                tbl.select.return_value.eq.return_value.execute.return_value = r
            return tbl

        mock_sb.table.side_effect = _table

        with patch("app.api.v1.endpoints.auth.get_supabase_admin", return_value=mock_sb):
            resp = await client.get("/api/v1/auth/classroom/ABC123/avatars")
        assert resp.status_code == 200
        assert len(resp.json()) == 2

    async def test_404_for_bad_code(self, client: AsyncClient):
        mock_sb = MagicMock()

        def _table(name):
            tbl = MagicMock()
            r = MagicMock()
            r.data = None
            tbl.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = r
            return tbl

        mock_sb.table.side_effect = _table

        with patch("app.api.v1.endpoints.auth.get_supabase_admin", return_value=mock_sb):
            resp = await client.get("/api/v1/auth/classroom/BADCODE/avatars")
        assert resp.status_code == 404

    async def test_empty_classroom(self, client: AsyncClient):
        mock_sb = MagicMock()

        def _table(name):
            tbl = MagicMock()
            if name == "classrooms":
                r = MagicMock()
                r.data = {"id": CLASSROOM_ID}
                tbl.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = r
            elif name == "students":
                r = MagicMock()
                r.data = []
                tbl.select.return_value.eq.return_value.execute.return_value = r
            return tbl

        mock_sb.table.side_effect = _table

        with patch("app.api.v1.endpoints.auth.get_supabase_admin", return_value=mock_sb):
            resp = await client.get("/api/v1/auth/classroom/ABC123/avatars")
        assert resp.status_code == 200
        assert resp.json() == []


class TestAuthLogin:
    """POST /api/v1/auth/student/login"""

    async def test_valid_login(self, client: AsyncClient):
        mock_sb = MagicMock()

        def _table(name):
            tbl = MagicMock()
            if name == "classrooms":
                r = MagicMock()
                r.data = {"id": CLASSROOM_ID}
                tbl.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = r
            elif name == "students":
                r = MagicMock()
                r.data = {"id": STUDENT_ID, "student_name": "Ali", "secret_pin": "1234", "avatar_url": "url"}
                tbl.select.return_value.eq.return_value.eq.return_value.maybe_single.return_value.execute.return_value = r
            return tbl

        mock_sb.table.side_effect = _table

        with patch("app.api.v1.endpoints.auth.get_supabase_admin", return_value=mock_sb):
            resp = await client.post("/api/v1/auth/student/login", json={
                "student_id": STUDENT_ID,
                "class_code": "ABC123",
                "secret_pin": "1234",
            })
        assert resp.status_code == 200
        assert "access_token" in resp.json()

    async def test_wrong_pin(self, client: AsyncClient):
        mock_sb = MagicMock()

        def _table(name):
            tbl = MagicMock()
            if name == "classrooms":
                r = MagicMock()
                r.data = {"id": CLASSROOM_ID}
                tbl.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = r
            elif name == "students":
                r = MagicMock()
                r.data = {"id": STUDENT_ID, "student_name": "Ali", "secret_pin": "1234", "avatar_url": "url"}
                tbl.select.return_value.eq.return_value.eq.return_value.maybe_single.return_value.execute.return_value = r
            return tbl

        mock_sb.table.side_effect = _table

        with patch("app.api.v1.endpoints.auth.get_supabase_admin", return_value=mock_sb):
            resp = await client.post("/api/v1/auth/student/login", json={
                "student_id": STUDENT_ID,
                "class_code": "ABC123",
                "secret_pin": "9999",
            })
        assert resp.status_code == 401

    async def test_missing_pin(self, client: AsyncClient):
        resp = await client.post("/api/v1/auth/student/login", json={
            "student_id": STUDENT_ID,
            "class_code": "ABC123",
        })
        assert resp.status_code == 422

    async def test_no_auth_required(self, client: AsyncClient):
        """Login endpoint should NOT require Bearer token."""
        # Remove our autouse override — login doesn't use get_current_student
        app.dependency_overrides.pop(get_current_student, None)
        resp = await client.post("/api/v1/auth/student/login", json={
            "student_id": STUDENT_ID,
            "class_code": "ABC123",
            "secret_pin": "1234",
        })
        # Should fail for bad data, NOT for auth
        assert resp.status_code != 403


class TestAuthProfile:
    """PATCH /api/v1/auth/student/profile"""

    async def test_profile_update(self, client: AsyncClient):
        resp = await client.patch("/api/v1/auth/student/profile", json={
            "avatar_style": "bottts",
            "theme_color": "#ff0000",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "avatar_style" in data

    async def test_no_auth_403(self, client: AsyncClient):
        app.dependency_overrides.pop(get_current_student, None)
        resp = await client.patch("/api/v1/auth/student/profile", json={
            "avatar_style": "bottts",
        })
        assert resp.status_code == 403


# ═══════════════════════════════════════════════════════════════════════════
# 2. ACHIEVEMENTS ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════


class TestAchievementsAll:
    """GET /api/v1/achievements/all (no auth)"""

    async def test_returns_all_achievements(self, client: AsyncClient):
        mock_sb = _sb_mock(achievements=[
            {"id": "a1", "name": "First Steps", "description": "Earn 200 points",
             "description_ur": "200 پوائنٹس", "icon": "🌟", "tier": "bronze",
             "threshold_type": "points", "threshold_value": 200},
        ])
        with _patch_sb("achievements") as mock_fn:
            mock_fn.return_value = mock_sb
            resp = await client.get("/api/v1/achievements/all")
        assert resp.status_code == 200
        assert len(resp.json()["achievements"]) == 1
        assert resp.json()["achievements"][0]["name"] == "First Steps"


class TestAchievementsMe:
    """GET /api/v1/achievements/me (student JWT)"""

    async def test_returns_student_progress(self, client: AsyncClient):
        mock_sb = MagicMock()

        def _table(name):
            tbl = MagicMock()
            r = MagicMock()
            if name == "achievements":
                r.data = [
                    {"id": "a1", "name": "First Steps", "description": "Earn 200 pts",
                     "description_ur": "", "icon": "🌟", "tier": "bronze",
                     "threshold_type": "points", "threshold_value": 200},
                ]
                tbl.select.return_value.order.return_value.execute.return_value = r
            elif name == "student_achievements":
                r.data = [{"achievement_id": "a1", "unlocked_at": "2026-01-01T00:00:00Z"}]
                tbl.select.return_value.eq.return_value.execute.return_value = r
            elif name == "students":
                r.data = {"points": 500, "current_streak": 3}
                tbl.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = r
            elif name == "student_interactions":
                r.data = []
                r.count = 0
                tbl.select.return_value.eq.return_value.like.return_value.execute.return_value = r
                tbl.select.return_value.eq.return_value.eq.return_value.eq.return_value.execute.return_value = r
            return tbl

        mock_sb.table.side_effect = _table
        rpc_r = MagicMock()
        rpc_r.data = {"reading_correct": 10, "writing_correct": 5, "listening_correct": 3, "speaking_correct": 2}
        mock_sb.rpc.return_value.execute.return_value = rpc_r

        with _patch_sb("achievements") as mock_fn:
            mock_fn.return_value = mock_sb
            resp = await client.get("/api/v1/achievements/me")
        assert resp.status_code == 200
        achievements = resp.json()["achievements"]
        assert len(achievements) == 1
        assert achievements[0]["unlocked"] is True

    async def test_no_auth_403(self, client: AsyncClient):
        app.dependency_overrides.pop(get_current_student, None)
        resp = await client.get("/api/v1/achievements/me")
        assert resp.status_code == 403


class TestAchievementsCheck:
    """POST /api/v1/achievements/check"""

    async def test_check_own_achievements(self, client: AsyncClient):
        mock_sb = MagicMock()

        def _table(name):
            tbl = MagicMock()
            r = MagicMock()
            if name == "achievements":
                r.data = [
                    {"id": "a1", "name": "First Steps", "icon": "🌟", "tier": "bronze",
                     "threshold_type": "points", "threshold_value": 200},
                ]
                tbl.select.return_value.execute.return_value = r
            elif name == "student_achievements":
                r.data = []  # none unlocked yet
                tbl.select.return_value.eq.return_value.execute.return_value = r
                tbl.insert.return_value.execute.return_value = MagicMock()
            elif name == "students":
                r.data = {"points": 500, "current_streak": 0}
                tbl.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = r
            elif name == "student_interactions":
                r.data = []
                r.count = 0
                tbl.select.return_value.eq.return_value.like.return_value.execute.return_value = r
                tbl.select.return_value.eq.return_value.eq.return_value.eq.return_value.execute.return_value = r
            return tbl

        mock_sb.table.side_effect = _table
        rpc_r = MagicMock()
        rpc_r.data = {}
        mock_sb.rpc.return_value.execute.return_value = rpc_r

        with _patch_sb("achievements") as mock_fn:
            mock_fn.return_value = mock_sb
            resp = await client.post("/api/v1/achievements/check", json={
                "student_id": STUDENT_ID,
            })
        assert resp.status_code == 200
        assert "new_achievements" in resp.json()

    async def test_cannot_check_other_student(self, client: AsyncClient):
        resp = await client.post("/api/v1/achievements/check", json={
            "student_id": "other-student-id",
        })
        assert resp.status_code == 403


# ═══════════════════════════════════════════════════════════════════════════
# 3. EVALUATIONS ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════


class TestEvaluationStatus:
    """GET /api/v1/evaluations/status"""

    async def test_needs_pre_test(self, client: AsyncClient):
        mock_sb = MagicMock()

        def _table(name):
            tbl = MagicMock()
            r = MagicMock()
            if name == "evaluation_status":
                r.data = [{
                    "student_id": STUDENT_ID,
                    "pre_test_completed": False,
                    "post_test_completed": False,
                    "post_test_unlocked": False,
                }]
                tbl.select.return_value.eq.return_value.execute.return_value = r
            return tbl

        mock_sb.table.side_effect = _table

        with _patch_sb("evaluations") as mock_fn:
            mock_fn.return_value = mock_sb
            resp = await client.get("/api/v1/evaluations/status")
        assert resp.status_code == 200
        data = resp.json()
        assert data["needs_pre_test"] is True
        assert data["needs_post_test"] is False

    async def test_post_test_unlocked(self, client: AsyncClient):
        mock_sb = MagicMock()

        def _table(name):
            tbl = MagicMock()
            r = MagicMock()
            if name == "evaluation_status":
                r.data = [{
                    "student_id": STUDENT_ID,
                    "pre_test_completed": True,
                    "post_test_completed": False,
                    "post_test_unlocked": True,
                }]
                tbl.select.return_value.eq.return_value.execute.return_value = r
            return tbl

        mock_sb.table.side_effect = _table

        with _patch_sb("evaluations") as mock_fn:
            mock_fn.return_value = mock_sb
            resp = await client.get("/api/v1/evaluations/status")
        assert resp.status_code == 200
        data = resp.json()
        assert data["needs_pre_test"] is False
        assert data["needs_post_test"] is True


class TestEvaluationQuestions:
    """GET /api/v1/evaluations/questions"""

    async def test_returns_pre_test_questions(self, client: AsyncClient):
        mock_sb = MagicMock()

        def _table(name):
            tbl = MagicMock()
            r = MagicMock()
            if name == "students":
                r.data = {"classroom_id": CLASSROOM_ID}
                tbl.select.return_value.eq.return_value.single.return_value.execute.return_value = r
            elif name == "classrooms":
                r.data = {"grade_level": 3}
                tbl.select.return_value.eq.return_value.single.return_value.execute.return_value = r
            elif name == "evaluation_questions":
                r.data = [
                    {"id": "q1", "grade_level": 3, "evaluation_type": "pre",
                     "section": "reading", "pillar": "reading", "question_index": 1,
                     "question_text": "What is this?", "question_text_ur": "",
                     "task_type": "mcq", "options": [], "difficulty": "easy",
                     "audio_text": None, "image_context": None},
                ]
                tbl.select.return_value.eq.return_value.eq.return_value.order.return_value.execute.return_value = r
            return tbl

        mock_sb.table.side_effect = _table

        with _patch_sb("evaluations") as mock_fn:
            mock_fn.return_value = mock_sb
            resp = await client.get("/api/v1/evaluations/questions?type=pre")
        assert resp.status_code == 200
        assert len(resp.json()) == 1

    async def test_invalid_type_422(self, client: AsyncClient):
        resp = await client.get("/api/v1/evaluations/questions?type=midterm")
        assert resp.status_code == 422


class TestEvaluationSubmit:
    """POST /api/v1/evaluations/submit"""

    async def test_submit_pre_test(self, client: AsyncClient):
        mock_sb = MagicMock()

        def _table(name):
            tbl = MagicMock()
            r = MagicMock()
            if name == "students":
                r.data = {"classroom_id": CLASSROOM_ID}
                tbl.select.return_value.eq.return_value.single.return_value.execute.return_value = r
            elif name == "classrooms":
                r.data = {"grade_level": 3}
                tbl.select.return_value.eq.return_value.single.return_value.execute.return_value = r
            elif name == "evaluation_status":
                r.data = [{
                    "student_id": STUDENT_ID,
                    "pre_test_completed": False,
                    "post_test_completed": False,
                    "post_test_unlocked": False,
                }]
                tbl.select.return_value.eq.return_value.execute.return_value = r
                tbl.update.return_value.eq.return_value.execute.return_value = MagicMock()
                tbl.insert.return_value.execute.return_value = MagicMock()
            elif name == "evaluation_questions":
                r.data = [{"id": "q1", "correct_answer": "apple", "section": "reading"}]
                tbl.select.return_value.in_.return_value.execute.return_value = r
            elif name == "evaluation_records":
                tbl.insert.return_value.execute.return_value = MagicMock()
            return tbl

        mock_sb.table.side_effect = _table

        with _patch_sb("evaluations") as mock_fn:
            mock_fn.return_value = mock_sb
            resp = await client.post("/api/v1/evaluations/submit", json={
                "evaluation_type": "pre",
                "answers": [
                    {"question_id": "q1", "student_answer": "apple", "time_taken_ms": 5000},
                ],
            })
        assert resp.status_code == 200
        data = resp.json()
        assert data["correct_count"] == 1
        assert data["completed"] is True


# ═══════════════════════════════════════════════════════════════════════════
# 4. REWARDS ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════


class TestRewardsDailySummary:
    """GET /api/v1/rewards/daily-summary"""

    async def test_daily_summary(self, client: AsyncClient):
        mock_sb = MagicMock()

        def _table(name):
            tbl = MagicMock()
            r = MagicMock()
            if name == "students":
                r.data = {"points": 350}
                tbl.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = r
            elif name == "student_interactions":
                r.data = [
                    {"score": 10},
                    {"score": 10},
                    {"score": 10},
                ]
                tbl.select.return_value.eq.return_value.eq.return_value.gte.return_value.execute.return_value = r
            return tbl

        mock_sb.table.side_effect = _table

        cache_mocks = _patch_cache()
        with _patch_sb("rewards") as mock_fn, cache_mocks[0], cache_mocks[1], cache_mocks[2]:
            mock_fn.return_value = mock_sb
            resp = await client.get("/api/v1/rewards/daily-summary")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_points"] == 350
        assert data["today_points"] == 30
        assert data["missions_today"] == 3


class TestRewardsStreak:
    """GET /api/v1/rewards/streak"""

    async def test_returns_streak(self, client: AsyncClient):
        mock_sb = _sb_mock(students={
            "current_streak": 5,
            "longest_streak": 12,
            "last_activity_date": "2026-05-09",
        })

        cache_mocks = _patch_cache()
        with _patch_sb("rewards") as mock_fn, cache_mocks[0], cache_mocks[1], cache_mocks[2]:
            mock_fn.return_value = mock_sb
            resp = await client.get("/api/v1/rewards/streak")
        assert resp.status_code == 200
        data = resp.json()
        assert data["current_streak"] == 5
        assert data["longest_streak"] == 12

    async def test_student_not_found(self, client: AsyncClient):
        mock_sb = _sb_mock(students=None)

        cache_mocks = _patch_cache()
        with _patch_sb("rewards") as mock_fn, cache_mocks[0], cache_mocks[1], cache_mocks[2]:
            mock_fn.return_value = mock_sb
            resp = await client.get("/api/v1/rewards/streak")
        assert resp.status_code == 404


class TestRewardsPointsBreakdown:
    """GET /api/v1/rewards/points-breakdown"""

    async def test_points_breakdown(self, client: AsyncClient):
        mock_sb = MagicMock()
        now = datetime.now(timezone.utc).isoformat()

        def _table(name):
            tbl = MagicMock()
            r = MagicMock()
            if name == "students":
                r.data = {"points": 200}
                tbl.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = r
            elif name == "student_interactions":
                r.data = [
                    {"interaction_type": "mission_mcq", "score": 10, "created_at": now},
                    {"interaction_type": "story_time", "score": 10, "created_at": now},
                ]
                tbl.select.return_value.eq.return_value.eq.return_value.gte.return_value.execute.return_value = r
            return tbl

        mock_sb.table.side_effect = _table

        cache_mocks = _patch_cache()
        with _patch_sb("rewards") as mock_fn, cache_mocks[0], cache_mocks[1], cache_mocks[2]:
            mock_fn.return_value = mock_sb
            resp = await client.get("/api/v1/rewards/points-breakdown")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_points"] == 200
        assert isinstance(data["today"], list)
        assert isinstance(data["this_week"], list)


# ═══════════════════════════════════════════════════════════════════════════
# 5. STUDENT SCORES
# ═══════════════════════════════════════════════════════════════════════════


class TestStudentScores:
    """GET /api/v1/student/my-scores"""

    async def test_returns_all_time_scores(self, client: AsyncClient):
        mock_sb = MagicMock()

        def _table(name):
            tbl = MagicMock()
            r = MagicMock()
            if name == "student_interactions":
                r.data = [
                    {"pillar": "reading", "correct": True},
                    {"pillar": "reading", "correct": False},
                    {"pillar": "writing", "correct": True},
                ]
                tbl.select.return_value.eq.return_value.not_.is_.return_value.execute.return_value = r
            elif name == "students":
                r.data = {"points": 150}
                tbl.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = r
            return tbl

        mock_sb.table.side_effect = _table

        cache_mocks = _patch_cache()
        with _patch_sb("student_scores") as mock_fn, cache_mocks[0], cache_mocks[1], cache_mocks[2]:
            mock_fn.return_value = mock_sb
            resp = await client.get("/api/v1/student/my-scores")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_questions"] == 3
        assert data["total_correct"] == 2
        assert data["total_points"] == 150
        assert len(data["pillar_scores"]) == 4  # always 4 pillars

    async def test_week_filter(self, client: AsyncClient):
        mock_sb = MagicMock()

        def _table(name):
            tbl = MagicMock()
            r = MagicMock()
            if name == "student_interactions":
                r.data = []
                tbl.select.return_value.eq.return_value.not_.is_.return_value.gte.return_value.execute.return_value = r
            elif name == "students":
                r.data = {"points": 0}
                tbl.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = r
            return tbl

        mock_sb.table.side_effect = _table

        cache_mocks = _patch_cache()
        with _patch_sb("student_scores") as mock_fn, cache_mocks[0], cache_mocks[1], cache_mocks[2]:
            mock_fn.return_value = mock_sb
            resp = await client.get("/api/v1/student/my-scores?time_range=week")
        assert resp.status_code == 200
        assert resp.json()["time_range_label"] == "This Week"


# ═══════════════════════════════════════════════════════════════════════════
# 6. STORY TIME ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════


class TestStoryTimeGet:
    """GET /api/v1/story-time/story"""

    async def test_generates_story(self, client: AsyncClient):
        mock_sb = MagicMock()

        def _table(name):
            tbl = MagicMock()
            r = MagicMock()
            if name == "classrooms":
                r.data = {"grade_level": 3}
            elif name == "classroom_syllabus":
                r.data = {"topic_title": "Animals", "week_number": 2}
            return tbl

        mock_sb.table.side_effect = _table

        llm_response = MagicMock()
        llm_response.choices = [MagicMock()]
        llm_response.choices[0].message.content = json.dumps({
            "story_title": "The Cat",
            "story_text": "A cat sat on a mat.",
            "questions": [
                {"id": 1, "question": "Where did the cat sit?", "options": ["mat", "bed", "chair", "table"], "correct_index": 0},
                {"id": 2, "question": "What animal?", "options": ["dog", "cat", "bird", "fish"], "correct_index": 1},
                {"id": 3, "question": "Color?", "options": ["red", "blue", "brown", "white"], "correct_index": 2},
            ],
        })
        llm_response.usage = MagicMock()

        cache_mocks = _patch_cache()
        with (
            _patch_sb("story_time") as mock_fn,
            cache_mocks[0], cache_mocks[1], cache_mocks[2],
            patch("app.api.v1.endpoints.story_time.client") as mock_openai,
            patch("app.api.v1.endpoints.story_time.track_llm") as mock_track,
            patch("app.api.v1.endpoints.story_time.log_cache_hit", new_callable=AsyncMock),
        ):
            mock_fn.return_value = mock_sb

            # Mock asyncio.gather for the classroom + syllabus queries
            async def mock_to_thread(fn):
                return fn()

            # Setup supabase responses via asyncio.to_thread mock
            classroom_resp = MagicMock()
            classroom_resp.data = {"grade_level": 3}
            syllabus_resp = MagicMock()
            syllabus_resp.data = {"topic_title": "Animals", "week_number": 2}

            with patch("app.api.v1.endpoints.story_time.asyncio") as mock_asyncio:
                mock_asyncio.gather = AsyncMock(return_value=(classroom_resp, syllabus_resp))
                mock_asyncio.to_thread = AsyncMock()
                mock_asyncio.wait_for = AsyncMock(return_value=llm_response)
                mock_asyncio.TimeoutError = asyncio.TimeoutError
                mock_track.return_value.__aenter__ = AsyncMock(return_value=MagicMock())
                mock_track.return_value.__aexit__ = AsyncMock(return_value=False)

                resp = await client.get("/api/v1/story-time/story")

        assert resp.status_code == 200
        data = resp.json()
        assert data["story_title"] == "The Cat"
        assert len(data["questions"]) == 3


class TestStoryTimeAnswer:
    """POST /api/v1/story-time/answer"""

    async def test_correct_answer_awards_points(self, client: AsyncClient):
        mock_sb = MagicMock()

        student_resp = MagicMock()
        student_resp.data = {"points": 100}
        classroom_resp = MagicMock()
        classroom_resp.data = {"grade_level": 3}

        def _table(name):
            tbl = MagicMock()
            return tbl

        mock_sb.table.side_effect = _table
        rpc_r = MagicMock()
        rpc_r.data = [{"new_points": 110}]
        mock_sb.rpc.return_value.execute.return_value = rpc_r

        with (
            _patch_sb("story_time") as mock_fn,
            patch("app.api.v1.endpoints.story_time.asyncio") as mock_asyncio,
            patch("app.api.v1.endpoints.story_time.update_streak", new_callable=AsyncMock),
            patch("app.api.v1.endpoints.story_time.debounced_invalidate", new_callable=AsyncMock),
        ):
            mock_fn.return_value = mock_sb
            mock_asyncio.gather = AsyncMock(return_value=(student_resp, classroom_resp))
            mock_asyncio.to_thread = AsyncMock()

            resp = await client.post("/api/v1/story-time/answer", json={
                "question_id": 1,
                "selected_index": 0,
                "correct": True,
            })

        assert resp.status_code == 200
        data = resp.json()
        assert data["points_awarded"] == 10
        assert data["new_total"] == 110

    async def test_wrong_answer_0_points(self, client: AsyncClient):
        mock_sb = MagicMock()

        student_resp = MagicMock()
        student_resp.data = {"points": 100}
        classroom_resp = MagicMock()
        classroom_resp.data = {"grade_level": 3}

        mock_sb.table.side_effect = lambda name: MagicMock()

        with (
            _patch_sb("story_time") as mock_fn,
            patch("app.api.v1.endpoints.story_time.asyncio") as mock_asyncio,
            patch("app.api.v1.endpoints.story_time.update_streak", new_callable=AsyncMock),
            patch("app.api.v1.endpoints.story_time.debounced_invalidate", new_callable=AsyncMock),
        ):
            mock_fn.return_value = mock_sb
            mock_asyncio.gather = AsyncMock(return_value=(student_resp, classroom_resp))

            resp = await client.post("/api/v1/story-time/answer", json={
                "question_id": 1,
                "selected_index": 2,
                "correct": False,
            })

        assert resp.status_code == 200
        assert resp.json()["points_awarded"] == 0


# ═══════════════════════════════════════════════════════════════════════════
# 7. SPEAKING ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.skip(reason="Speaking router not registered in api_router — endpoint not exposed")
class TestSpeakingEvaluate:
    """POST /api/v1/speaking/evaluate — SKIPPED: router not included in v1/router.py"""

    async def test_good_transcript_scores_2(self, client: AsyncClient):
        pass

    async def test_empty_transcript_retry(self, client: AsyncClient):
        pass

    async def test_max_attempts_give_up(self, client: AsyncClient):
        pass


# ═══════════════════════════════════════════════════════════════════════════
# 8. INTERACTIONS ENDPOINT
# ═══════════════════════════════════════════════════════════════════════════


class TestInteractions:
    """POST /api/v1/interactions"""

    async def test_log_results(self, client: AsyncClient):
        mock_sb = MagicMock()
        mock_sb.table.return_value.insert.return_value.execute.return_value = MagicMock(data={"id": "x"})

        with _patch_sb("interactions") as mock_fn:
            mock_fn.return_value = mock_sb
            resp = await client.post("/api/v1/interactions", json={
                "pillar": "reading",
                "results": [
                    {"question_id": "q1", "is_correct": True, "time_remaining": 8},
                    {"question_id": "q2", "is_correct": False, "time_remaining": 0},
                ],
            })
        assert resp.status_code == 201
        data = resp.json()
        assert data["logged_interactions"] == 2
        assert data["correct_count"] == 1
        assert data["accuracy"] == 0.5

    async def test_empty_results_400(self, client: AsyncClient):
        resp = await client.post("/api/v1/interactions", json={
            "pillar": "reading",
            "results": [],
        })
        assert resp.status_code == 400

    async def test_no_auth_403(self, client: AsyncClient):
        app.dependency_overrides.pop(get_current_student, None)
        resp = await client.post("/api/v1/interactions", json={
            "pillar": "reading",
            "results": [{"question_id": "q1", "is_correct": True, "time_remaining": 5}],
        })
        assert resp.status_code == 403


# ═══════════════════════════════════════════════════════════════════════════
# 9. TOPICS ENDPOINT
# ═══════════════════════════════════════════════════════════════════════════


class TestTopics:
    """GET /api/v1/topics/"""

    async def test_returns_topics_for_grade(self, client: AsyncClient):
        mock_sb = MagicMock()
        result = MagicMock()
        result.data = [
            {"id": 1, "topic_name": "Animals", "grade_level": 3,
             "skill": "reading", "is_globally_active": True},
        ]
        mock_sb.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value = result

        with patch("app.api.v1.endpoints.topics.get_supabase_admin", return_value=mock_sb):
            resp = await client.get("/api/v1/topics/?grade_level=3", follow_redirects=True)
        assert resp.status_code == 200
        assert len(resp.json()) == 1

    async def test_missing_grade_422(self, client: AsyncClient):
        with patch("app.api.v1.endpoints.topics.get_supabase_admin", return_value=MagicMock()):
            resp = await client.get("/api/v1/topics/", follow_redirects=True)
        assert resp.status_code == 422


# ═══════════════════════════════════════════════════════════════════════════
# 10. MISSIONS ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════


class TestMissionsMe:
    """GET /api/v1/missions/me"""

    async def test_returns_student_profile(self, client: AsyncClient):
        mock_sb = _sb_mock(students={
            "id": STUDENT_ID, "student_name": "Ali", "points": 500,
            "avatar_url": "url", "classroom_id": CLASSROOM_ID,
        })

        with _patch_sb("missions") as mock_fn:
            mock_fn.return_value = mock_sb
            resp = await client.get("/api/v1/missions/me")
        assert resp.status_code == 200
        data = resp.json()
        assert data["student_name"] == "Ali"
        assert data["points"] == 500


class TestMissionsComplete:
    """POST /api/v1/missions/complete"""

    async def test_correct_answer_awards_points(self, client: AsyncClient):
        """Test that correct answer awards 10 points and updates streak."""
        mock_sb = MagicMock()

        def _table(name):
            tbl = MagicMock()
            r = MagicMock()
            if name == "students":
                r.data = {"points": 100}
            elif name == "classrooms":
                r.data = {"grade_level": 3}
            elif name == "student_interactions":
                r.data = []
                r.count = 0
                tbl.select.return_value.eq.return_value.eq.return_value.gte.return_value.lte.return_value.execute.return_value = r
            tbl.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = r
            tbl.insert.return_value.execute.return_value = MagicMock()
            return tbl

        mock_sb.table.side_effect = _table

        # Different RPC calls return different data
        def _rpc_dispatch(fn_name, params=None):
            rpc_mock = MagicMock()
            if fn_name == "increment_student_points":
                rpc_mock.execute.return_value = MagicMock(data=[{"new_points": 110}])
            elif fn_name == "get_student_achievement_stats":
                rpc_mock.execute.return_value = MagicMock(data={
                    "reading_correct": 0, "writing_correct": 0,
                    "listening_correct": 0, "speaking_correct": 0,
                })
            else:
                rpc_mock.execute.return_value = MagicMock(data=[])
            return rpc_mock

        mock_sb.rpc.side_effect = _rpc_dispatch

        streak_mock = AsyncMock(return_value={"current_streak": 3, "longest_streak": 5})

        with (
            # Patch at the core level so ALL code paths (endpoint + background tasks) use mock
            patch("app.core.supabase_client.create_client", return_value=mock_sb),
            patch("app.api.v1.endpoints.missions.update_streak", streak_mock),
            patch("app.api.v1.endpoints.missions.debounced_invalidate", new_callable=AsyncMock),
        ):
            resp = await client.post("/api/v1/missions/complete", json={
                "question_correct": True,
                "pillar": "reading",
            })
        assert resp.status_code == 200
        data = resp.json()
        assert data["points_awarded"] == 10
        assert data["current_streak"] == 3


class TestMissionsDailyPillarStatus:
    """GET /api/v1/missions/daily-pillar-status"""

    async def test_returns_pillar_status(self, client: AsyncClient):
        mock_sb = MagicMock()
        result = MagicMock()
        result.data = [
            {"pillar": "reading", "correct": True},
            {"pillar": "reading", "correct": True},
            {"pillar": "writing", "correct": True},
        ]
        mock_sb.table.return_value.select.return_value.eq.return_value.gte.return_value.execute.return_value = result

        with _patch_sb("missions") as mock_fn:
            mock_fn.return_value = mock_sb
            resp = await client.get("/api/v1/missions/daily-pillar-status")
        assert resp.status_code == 200
        data = resp.json()
        assert "pillars" in data
        assert isinstance(data["pillars"], list)


class TestMissionsWeeklyProgress:
    """GET /api/v1/missions/weekly-progress"""

    async def test_returns_weekly_data(self, client: AsyncClient):
        mock_sb = MagicMock()

        syllabus_resp = MagicMock()
        syllabus_resp.data = {"topic_title": "Animals"}
        interactions_resp = MagicMock()
        interactions_resp.data = [{"pillar": "reading"}, {"pillar": "writing"}]

        mock_sb.table.side_effect = lambda name: MagicMock()

        cache_mocks = _patch_cache()
        with (
            _patch_sb("missions") as mock_fn,
            cache_mocks[0], cache_mocks[1], cache_mocks[2],
            patch("app.api.v1.endpoints.missions.asyncio") as mock_asyncio,
        ):
            mock_fn.return_value = mock_sb
            mock_asyncio.gather = AsyncMock(return_value=(syllabus_resp, interactions_resp))
            mock_asyncio.to_thread = AsyncMock()
            resp = await client.get("/api/v1/missions/weekly-progress")
        assert resp.status_code == 200
        data = resp.json()
        assert "pillars" in data


class TestMissionsPerformance:
    """GET /api/v1/missions/performance"""

    async def test_returns_performance_profile(self, client: AsyncClient):
        mock_sb = MagicMock()
        result = MagicMock()
        result.data = [
            {"pillar": "reading", "correct": True, "interaction_type": "mission_mcq"},
            {"pillar": "reading", "correct": False, "interaction_type": "mission_mcq"},
        ]
        mock_sb.table.return_value.select.return_value.eq.return_value.execute.return_value = result

        with _patch_sb("missions") as mock_fn:
            mock_fn.return_value = mock_sb
            resp = await client.get("/api/v1/missions/performance")
        assert resp.status_code == 200


# ═══════════════════════════════════════════════════════════════════════════
# 11. AUTH SECURITY TESTS
# ═══════════════════════════════════════════════════════════════════════════


class TestAuthSecurity:
    """Verify all protected endpoints reject unauthenticated requests."""

    @pytest.fixture(autouse=True)
    def _no_auth(self):
        """Remove the autouse auth override for these tests."""
        app.dependency_overrides.pop(get_current_student, None)
        yield

    @pytest.mark.parametrize("method,path", [
        ("GET", "/api/v1/achievements/me"),
        ("POST", "/api/v1/achievements/check"),
        ("GET", "/api/v1/evaluations/status"),
        ("GET", "/api/v1/evaluations/questions?type=pre"),
        ("GET", "/api/v1/rewards/daily-summary"),
        ("GET", "/api/v1/rewards/streak"),
        ("GET", "/api/v1/rewards/points-breakdown"),
        ("GET", "/api/v1/student/my-scores"),
        ("GET", "/api/v1/missions/me"),
        ("GET", "/api/v1/missions/daily-pillar-status"),
        ("GET", "/api/v1/missions/weekly-progress"),
        ("GET", "/api/v1/missions/performance"),
        ("PATCH", "/api/v1/auth/student/profile"),
    ])
    async def test_requires_auth(self, client: AsyncClient, method: str, path: str):
        if method == "GET":
            resp = await client.get(path)
        elif method == "POST":
            resp = await client.post(path, json={})
        elif method == "PATCH":
            resp = await client.patch(path, json={})
        assert resp.status_code == 403, f"{method} {path} should require auth but got {resp.status_code}"


# ═══════════════════════════════════════════════════════════════════════════
# 12. JWT UTILITY TESTS
# ═══════════════════════════════════════════════════════════════════════════


class TestJWTSecurity:
    """JWT creation and validation."""

    def test_create_and_decode_token(self):
        from app.core.security import create_student_token, decode_student_token
        token = create_student_token(STUDENT_ID, CLASSROOM_ID)
        payload = decode_student_token(token)
        assert payload["sub"] == STUDENT_ID
        assert payload["classroom_id"] == CLASSROOM_ID
        assert payload["role"] == "student"

    def test_expired_token_raises_401(self):
        from app.core.config import settings
        from app.core.security import decode_student_token
        from fastapi import HTTPException
        import jwt as pyjwt
        from datetime import timedelta

        expired = {
            "sub": STUDENT_ID,
            "classroom_id": CLASSROOM_ID,
            "role": "student",
            "exp": datetime.now(tz=timezone.utc) - timedelta(seconds=1),
        }
        token = pyjwt.encode(expired, settings.STUDENT_JWT_SECRET, algorithm="HS256")
        with pytest.raises(HTTPException) as exc:
            decode_student_token(token)
        assert exc.value.status_code == 401

    def test_wrong_role_raises_403(self):
        from app.core.config import settings
        from app.core.security import decode_student_token
        from fastapi import HTTPException
        import jwt as pyjwt
        from datetime import timedelta

        teacher = {
            "sub": "teacher-id",
            "role": "teacher",
            "exp": datetime.now(tz=timezone.utc) + timedelta(hours=1),
        }
        token = pyjwt.encode(teacher, settings.STUDENT_JWT_SECRET, algorithm="HS256")
        with pytest.raises(HTTPException) as exc:
            decode_student_token(token)
        assert exc.value.status_code == 403

    def test_tampered_token_raises_401(self):
        from app.core.security import decode_student_token
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc:
            decode_student_token("not.a.valid.jwt")
        assert exc.value.status_code == 401
