# Backend Utilities

**Directory:** `backend/app/utils/`

Utility modules providing shared helper functions used by endpoints and agents.

## Modules

| File | Description |
|------|-------------|
| `performance_profile.py` | Per-topic performance tracking for adaptive difficulty |
| `pronunciation.py` | Word-level pronunciation analysis using Levenshtein distance |
| `code_generation.py` | Memorable mnemonic classroom join code generator |
| `streak.py` | Daily streak tracking (consecutive activity days) |

---

## `performance_profile.py` -- Adaptive Difficulty

Computes per-topic accuracy maps for students to drive adaptive difficulty in mission generation.

### Class: `TopicPerformance`

```python
class TopicPerformance:
    def __init__(self, topic: str, pillar: str, total_attempts: int, correct_count: int):
        self.topic = topic
        self.pillar = pillar
        self.total_attempts = total_attempts
        self.correct_count = correct_count
        self.accuracy_pct = round((correct_count / total_attempts * 100) if total_attempts > 0 else 0)
```

**Properties:**
- `suggested_difficulty -> str`: Returns `"easy"` (<40%), `"medium"` (40-70%), `"hard"` (>70%)
- `is_mastered -> bool`: Returns `True` if accuracy > 90% AND total_attempts >= 5

### `get_student_performance_profile(student_id: str) -> dict`

Computes a full performance profile by calling the `get_performance_stats` Postgres RPC (last 14 days).

**Returns:**
```python
{
    "overall_accuracy": float,          # 0-100
    "pillar_accuracy": {
        "reading": float,
        "writing": float,
        "listening": float,
        "speaking": float,
    },
    "weak_topics": [
        {"topic": str, "accuracy": float, "suggested_difficulty": str}
    ],
    "strong_topics": [
        {"topic": str, "accuracy": float}
    ],
    "difficulty_recommendation": str,   # "easy", "medium", or "hard"
}
```

**Caching:** Results are cached in Redis with key `performance_profile:{student_id}` and TTL 3600s (1 hour).

**Difficulty recommendation logic:**
- Overall accuracy < 40% -> `"easy"`
- Overall accuracy 40-70% -> `"medium"`
- Overall accuracy > 70% -> `"hard"`

**Weak/strong classification:**
- Pillar needs >= 3 attempts to be classified
- Accuracy < 50% -> weak (suggested_difficulty: `"easy"`)
- Accuracy 50-70% -> weak (suggested_difficulty: `"medium"`)
- Accuracy > 85% -> strong

### `invalidate_performance_cache(student_id: str)`

Deletes the cached performance profile. Should be called after mission completion to ensure fresh data on next request.

---

## `pronunciation.py` -- Pronunciation Analysis

Performs word-level comparison between a target phrase and a student's spoken audio transcription. Used by the speaking endpoint.

### Class: `PronunciationWord`

```python
class PronunciationWord:
    word: str
    status: Literal["correct", "incorrect", "omitted"]

    def to_dict(self) -> dict:
        return {"word": self.word, "status": self.status}
```

### `levenshtein_similarity(s1: str, s2: str) -> float`

Calculates similarity ratio between two strings using `SequenceMatcher` (Levenshtein-like). Returns 0.0 to 1.0 (1.0 = identical). Case-insensitive comparison.

### `compare_phrases(target_phrase: str, spoken_words: List[str], threshold: float = 0.75) -> List[dict]`

Compares a target phrase against spoken words from Whisper transcription.

**Parameters:**
- `target_phrase` -- The phrase the student was supposed to say
- `spoken_words` -- Array of words recognized by Whisper
- `threshold` -- Similarity threshold (default 0.75)

**Algorithm:**
1. Split target phrase into words
2. For each target word, find best matching spoken word (not yet matched) using `levenshtein_similarity`
3. If similarity >= threshold: `"correct"`
4. If match found but similarity < threshold: `"incorrect"`
5. If no match found: `"omitted"`

**Returns:** List of dicts: `[{"word": "I", "status": "correct"}, ...]`

### `calculate_pronunciation_score(pronunciation_data: List[dict]) -> int`

Calculates overall pronunciation score (0-100) from word-level accuracy.

**Scoring:**
- Correct: 10 points per word
- Incorrect: 5 points per word
- Omitted: 0 points per word
- Score = (earned_points / max_points) * 100, clamped to [0, 100]

---

## `code_generation.py` -- Classroom Join Codes

Generates memorable mnemonic codes for classroom access, more friendly than random hex strings.

### `generate_memorable_code(grade: int, classroom_name: str) -> str`

Generates a 6-character memorable code.

**Format:** `{grade}{3-letter-identifier}{random-digits}`

**Examples:** `"1YEL42"`, `"3BLU19"`, `"5SEC93"`

**Algorithm:**
1. Extract grade number as first character
2. Clean classroom name: remove "Grade", remove grade number, strip non-alpha characters
3. Take first 3 letters as uppercase identifier (pad with `"X"` if < 3 letters, fallback to `"CLS"` if empty)
4. Append random digits to reach total length of 6

---

## `streak.py` -- Daily Streak Tracking

Updates a student's daily streak after any educational task completion.

### `update_streak(student_id: str) -> dict`

A "streak day" means the student completed at least one educational task on that calendar date.

**Logic:**
- `last_activity_date == today` -> no change (already counted today)
- `last_activity_date == yesterday` -> `current_streak += 1`
- `last_activity_date < yesterday` -> `current_streak = 1` (reset)
- `last_activity_date is null` -> `current_streak = 1` (first ever)

Updates `longest_streak` if `current_streak` exceeds it.

**Database operations:**
1. Reads `current_streak`, `longest_streak`, `last_activity_date` from `students` table
2. Computes new values
3. Updates `students` table with new streak data and `last_activity_date = today`

**Returns:**
```python
{
    "current_streak": int,
    "longest_streak": int,
    "streak_updated": bool,   # False if already counted today
}
```

Returns `{"current_streak": 0, "longest_streak": 0, "streak_updated": False}` if student not found.
