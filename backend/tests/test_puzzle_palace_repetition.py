"""
Tests for Puzzle Palace repetition fixes.

Verifies:
  - Cache key includes session counter (different content per session).
  - Cache TTL is 3600 (1 hour), not 86400 (24 hours).
"""
import inspect
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.cache import make_cache_key


CLASSROOM_ID = "aaaaaaaa-0000-0000-0000-000000000001"
STUDENT_ID = "bbbbbbbb-0000-0000-0000-000000000001"
TOPICS_HASH = "abc123def456"


class TestPuzzlePalaceCacheKey:

    def test_session_0_and_session_1_produce_different_cache_keys(self):
        """Cache key must differ between session 0 and session 1."""
        key_s0 = make_cache_key("puzzle_palace", CLASSROOM_ID, TOPICS_HASH, "0")
        key_s1 = make_cache_key("puzzle_palace", CLASSROOM_ID, TOPICS_HASH, "1")
        assert key_s0 != key_s1


class TestPuzzlePalaceTTL:

    async def test_cache_set_uses_1_hour_ttl(self):
        """Puzzle Palace cache TTL must be 3600 (1 hour), not 86400."""
        from app.api.v1.endpoints import puzzle_palace

        source = inspect.getsource(puzzle_palace.get_puzzle_palace_rooms)
        assert "ttl=3600" in source, (
            "Expected ttl=3600 in puzzle_palace cache_set call. "
            f"Found source containing: {[l.strip() for l in source.splitlines() if 'cache_set' in l]}"
        )
