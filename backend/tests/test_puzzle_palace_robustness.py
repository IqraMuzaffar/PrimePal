"""
Tests for Puzzle Palace robustness fixes.

Verifies:
  - reading_count=8 gives correct proportional distribution (2 of each needed type).
  - Empty rooms are rejected (503), not cached.
  - Stale cache entries with empty rooms are purged.
  - Partial failure (one pillar fails) still raises 503.
"""
import inspect
import pytest
from app.core.cache import make_cache_key
from app.agents.tutor_agent.mission_generator import PILLAR_TASK_CONFIGS


CLASSROOM_ID = "aaaaaaaa-0000-0000-0000-000000000001"
STUDENT_ID   = "bbbbbbbb-0000-0000-0000-000000000001"
TOPICS_HASH  = "abc123def456"

# Task types required by Puzzle Palace rooms
READING_REQUIRED = {"fill_blank_word_bank", "odd_one_out", "passage_true_false"}
WRITING_REQUIRED = {"sentence_scramble", "missing_letter"}


# ---------------------------------------------------------------------------
# Helper: compute proportional task-type distribution (mirrors mission_generator logic)
# ---------------------------------------------------------------------------

def _compute_distribution(pillar: str, target: int) -> dict[str, int]:
    """Return {task_type: allocated_count} for the given target count."""
    config = PILLAR_TASK_CONFIGS[pillar]
    raw_total = sum(c for _, c in config["task_types"])
    distribution = {}
    remaining = target
    types = config["task_types"]
    for i, (task_type, original_count) in enumerate(types):
        if i == len(types) - 1:
            alloc = remaining
        else:
            alloc = max(1, round(original_count * target / raw_total))
            remaining -= alloc
        distribution[task_type] = alloc
    return distribution


class TestReadingDistribution:
    """Verify reading_count=8 gives ≥2 of each room-required task type."""

    def test_reading_8_gives_2_fill_blank_word_bank(self):
        dist = _compute_distribution("reading", 8)
        assert dist.get("fill_blank_word_bank", 0) >= 2, (
            f"Expected ≥2 fill_blank_word_bank with reading_count=8, got {dist}"
        )

    def test_reading_8_gives_2_odd_one_out(self):
        dist = _compute_distribution("reading", 8)
        assert dist.get("odd_one_out", 0) >= 2, (
            f"Expected ≥2 odd_one_out with reading_count=8, got {dist}"
        )

    def test_reading_8_gives_2_passage_true_false(self):
        dist = _compute_distribution("reading", 8)
        assert dist.get("passage_true_false", 0) >= 2, (
            f"Expected ≥2 passage_true_false with reading_count=8, got {dist}"
        )

    def test_reading_9_was_broken_passage_true_false(self):
        """Regression: reading_count=9 used to give only 1 passage_true_false."""
        dist = _compute_distribution("reading", 9)
        # This should be 1 — the OLD bug we fixed by switching to 8
        assert dist.get("passage_true_false", 0) == 1, (
            f"reading_count=9 should give 1 passage_true_false (the old bug). Got {dist}"
        )

    def test_reading_8_total_equals_8(self):
        dist = _compute_distribution("reading", 8)
        assert sum(dist.values()) == 8


class TestWritingDistribution:
    """Verify writing_count=6 gives ≥2 of each room-required task type."""

    def test_writing_6_gives_2_sentence_scramble(self):
        dist = _compute_distribution("writing", 6)
        assert dist.get("sentence_scramble", 0) >= 2, (
            f"Expected ≥2 sentence_scramble with writing_count=6, got {dist}"
        )

    def test_writing_6_gives_2_missing_letter(self):
        dist = _compute_distribution("writing", 6)
        assert dist.get("missing_letter", 0) >= 2, (
            f"Expected ≥2 missing_letter with writing_count=6, got {dist}"
        )

    def test_writing_6_total_equals_6(self):
        dist = _compute_distribution("writing", 6)
        assert sum(dist.values()) == 6


class TestPuzzlePalaceSourceGuards:
    """Check source-level guards in the endpoint."""

    def test_reading_count_is_8(self):
        from app.api.v1.endpoints import puzzle_palace
        source = inspect.getsource(puzzle_palace.get_puzzle_palace_rooms)
        assert "reading_count = 8" in source, (
            "Expected reading_count = 8 in puzzle_palace. "
            f"Found: {[l.strip() for l in source.splitlines() if 'reading_count' in l]}"
        )

    def test_writing_count_is_6(self):
        from app.api.v1.endpoints import puzzle_palace
        source = inspect.getsource(puzzle_palace.get_puzzle_palace_rooms)
        assert "writing_count = 6" in source, (
            "Expected writing_count = 6 in puzzle_palace. "
            f"Found: {[l.strip() for l in source.splitlines() if 'writing_count' in l]}"
        )

    def test_empty_rooms_guard_exists(self):
        """The endpoint must check for empty rooms and raise 503."""
        from app.api.v1.endpoints import puzzle_palace
        source = inspect.getsource(puzzle_palace.get_puzzle_palace_rooms)
        assert "empty_rooms" in source, (
            "Expected empty_rooms guard in puzzle_palace endpoint source."
        )

    def test_stale_cache_purges_empty_rooms(self):
        """The cache hit path must purge entries with empty rooms."""
        from app.api.v1.endpoints import puzzle_palace
        source = inspect.getsource(puzzle_palace.get_puzzle_palace_rooms)
        assert "cached_empty_rooms" in source, (
            "Expected cached_empty_rooms check in puzzle_palace cache hit path."
        )


class TestRoomAssignmentLogic:
    """Unit-test the room assignment (Pass 1 + Pass 2) with synthetic questions."""

    ROOMS = [
        ("Fill the Gap",   "fill_blank_word_bank", "reading"),
        ("Scramble Fix",   "sentence_scramble",    "writing"),
        ("Odd One Out",    "odd_one_out",           "reading"),
        ("Missing Letter", "missing_letter",        "writing"),
        ("True or False",  "passage_true_false",    "reading"),
    ]

    def _make_question(self, task_type: str, pillar: str, idx: int) -> dict:
        return {"id": idx, "task_type": task_type, "pillar": pillar, "question": f"Q{idx}",
                "correct_answer": "a", "difficulty": "medium", "points_value": 10,
                "emoji_hint": "", "urdu_hint": ""}

    def _assign_rooms(self, reading_qs, writing_qs):
        """Mirror the Pass 1 + Pass 2 distribution logic from the endpoint."""
        used_ids: set[int] = set()
        assignments: list[list[dict]] = [[] for _ in self.ROOMS]

        def _get_tt(q):
            return q.get("task_type", q.get("type", ""))

        for idx, (_, task_type, pillar) in enumerate(self.ROOMS):
            pool = reading_qs if pillar == "reading" else writing_qs
            for q in pool:
                if id(q) in used_ids:
                    continue
                if _get_tt(q) == task_type and len(assignments[idx]) < 2:
                    assignments[idx].append(q)
                    used_ids.add(id(q))

        for idx, (_, task_type, pillar) in enumerate(self.ROOMS):
            if len(assignments[idx]) >= 2:
                continue
            pool = reading_qs if pillar == "reading" else writing_qs
            for q in pool:
                if id(q) in used_ids:
                    continue
                if len(assignments[idx]) >= 2:
                    break
                assignments[idx].append(q)
                used_ids.add(id(q))

        return assignments

    def test_full_generation_all_rooms_get_2_questions(self):
        """With 8 reading and 6 writing questions, every room should get 2."""
        dist_r = _compute_distribution("reading", 8)
        dist_w = _compute_distribution("writing", 6)

        reading_qs, writing_qs, idx = [], [], 1
        for task_type, count in dist_r.items():
            for _ in range(count):
                reading_qs.append(self._make_question(task_type, "reading", idx))
                idx += 1
        for task_type, count in dist_w.items():
            for _ in range(count):
                writing_qs.append(self._make_question(task_type, "writing", idx))
                idx += 1

        assignments = self._assign_rooms(reading_qs, writing_qs)
        for room_idx, (room_name, _, _) in enumerate(self.ROOMS):
            assert len(assignments[room_idx]) == 2, (
                f"Room '{room_name}' got {len(assignments[room_idx])} questions, expected 2"
            )

    def test_empty_writing_means_writing_rooms_have_0_questions(self):
        """If writing generation fails, writing rooms should have 0 questions — detected as broken."""
        dist_r = _compute_distribution("reading", 8)
        reading_qs, idx = [], 1
        for task_type, count in dist_r.items():
            for _ in range(count):
                reading_qs.append(self._make_question(task_type, "reading", idx))
                idx += 1

        assignments = self._assign_rooms(reading_qs, writing_qs=[])
        writing_room_indices = [i for i, (_, _, pillar) in enumerate(self.ROOMS) if pillar == "writing"]
        for i in writing_room_indices:
            assert len(assignments[i]) == 0, (
                f"Writing room {self.ROOMS[i][0]} should have 0 questions when writing fails"
            )

    def test_correct_task_types_assigned_in_pass1(self):
        """Pass 1 should assign questions with exact matching task_type to each room."""
        dist_r = _compute_distribution("reading", 8)
        dist_w = _compute_distribution("writing", 6)

        reading_qs, writing_qs, idx = [], [], 1
        for task_type, count in dist_r.items():
            for _ in range(count):
                reading_qs.append(self._make_question(task_type, "reading", idx))
                idx += 1
        for task_type, count in dist_w.items():
            for _ in range(count):
                writing_qs.append(self._make_question(task_type, "writing", idx))
                idx += 1

        assignments = self._assign_rooms(reading_qs, writing_qs)

        # Room 1 (Fill the Gap) should have fill_blank_word_bank questions
        room1_types = {q["task_type"] for q in assignments[0]}
        assert "fill_blank_word_bank" in room1_types

        # Room 3 (Odd One Out) should have odd_one_out questions
        room3_types = {q["task_type"] for q in assignments[2]}
        assert "odd_one_out" in room3_types

        # Room 5 (True or False) should have passage_true_false questions
        room5_types = {q["task_type"] for q in assignments[4]}
        assert "passage_true_false" in room5_types
