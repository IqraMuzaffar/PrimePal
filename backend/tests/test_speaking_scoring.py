"""
Unit tests for submit_speaking_answer scoring logic.

Tests the keyword-contains fallback that credits students who say the
correct word inside a longer natural phrase (e.g. "it is a cat" when
expected answer is "cat").
"""
import pytest
from difflib import SequenceMatcher


# ---------------------------------------------------------------------------
# Inline copy of the scoring logic from missions.py (kept minimal so tests
# document exactly what the production function must do)
# ---------------------------------------------------------------------------

def score_speaking(expected_text: str, transcription: str) -> dict:
    """
    Mirrors the is_correct logic in submit_speaking_answer.
    Returns {"is_correct": bool, "similarity": float}
    """
    expected_lower = expected_text.lower().strip()
    transcription_lower = transcription.lower().strip()

    similarity = SequenceMatcher(None, expected_lower, transcription_lower).ratio()

    is_correct = similarity >= 0.6

    # Keyword-contains fallback: short expected answers (1-2 words) are
    # credited if every expected word appears as a standalone word in the
    # transcript.
    if not is_correct:
        expected_words = expected_lower.split()
        if len(expected_words) <= 2:
            spoken_set = {w.strip('.,!?;:\'"') for w in transcription_lower.split()}
            if all(ew in spoken_set for ew in expected_words):
                is_correct = True

    return {"is_correct": is_correct, "similarity": round(similarity, 2)}


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestExactMatches:
    def test_exact_single_word_correct(self):
        result = score_speaking("cat", "cat")
        assert result["is_correct"] is True

    def test_exact_full_sentence_correct(self):
        result = score_speaking("the cat is sleeping", "the cat is sleeping")
        assert result["is_correct"] is True

    def test_wrong_word(self):
        result = score_speaking("cat", "dog")
        assert result["is_correct"] is False

    def test_empty_transcript(self):
        result = score_speaking("cat", "")
        assert result["is_correct"] is False


class TestKeywordFallback:
    """keyword-contains fallback: expected 1-2 words, student says longer phrase"""

    def test_what_is_this_natural_phrase(self):
        # Student says "it is a cat" when expected is just "cat"
        result = score_speaking("cat", "it is a cat")
        assert result["is_correct"] is True

    def test_what_is_this_with_trailing_punctuation(self):
        # Whisper appends punctuation — "it is a cat." must still match "cat"
        result = score_speaking("cat", "it is a cat.")
        assert result["is_correct"] is True

    def test_what_is_this_with_article(self):
        # Student says "a cat" — similarity is already >=0.6 but keyword also works
        result = score_speaking("cat", "a cat")
        assert result["is_correct"] is True

    def test_two_word_expected_all_words_present(self):
        # expected "red ball", transcript "I see a red ball"
        result = score_speaking("red ball", "I see a red ball")
        assert result["is_correct"] is True

    def test_two_word_expected_partial_missing(self):
        # expected "red apple", student only says "I see a ball" — similarity <0.6 and keyword fallback fails
        # (only 1 of 2 expected words present)
        result = score_speaking("red apple", "I see a ball")
        assert result["is_correct"] is False

    def test_fallback_not_triggered_for_long_expected(self):
        # expected is 3+ words — keyword fallback must NOT fire, only similarity
        # "the cat is sleeping" vs "sleeping" — similarity ~0.32, no fallback
        result = score_speaking("the cat is sleeping", "sleeping")
        assert result["is_correct"] is False

    def test_keyword_in_unrelated_word_does_not_match(self):
        # "cat" should NOT match "education" even though "cat" is a substring
        # because we check word boundaries (split by space)
        result = score_speaking("cat", "education")
        assert result["is_correct"] is False


class TestFinishTheSentenceAfterFrontendFix:
    """After the frontend fix, expectedText = full sentence. Verify scoring."""

    def test_full_sentence_match(self):
        # Student says the complete sentence
        result = score_speaking("the cat is sleeping", "the cat is sleeping")
        assert result["is_correct"] is True

    def test_close_but_not_perfect(self):
        # Minor variation — similarity should still be >=0.6
        result = score_speaking("the cat is sleeping", "the cat is sleep")
        assert result["is_correct"] is True  # similarity ~0.89

    def test_only_completion_word_spoken(self):
        # Student says just "sleeping" — similarity is low, no fallback (>2 words)
        result = score_speaking("the cat is sleeping", "sleeping")
        assert result["is_correct"] is False
