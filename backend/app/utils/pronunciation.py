"""
Pronunciation Analysis Utility

Performs word-level comparison between target phrase and student's spoken audio.
Uses Whisper word-level timestamps and Levenshtein distance for fuzzy matching.
"""

import logging
from difflib import SequenceMatcher
from typing import List, Literal

logger = logging.getLogger(__name__)


class PronunciationWord:
    """Represents a word with its pronunciation assessment."""
    word: str
    status: Literal["correct", "incorrect", "omitted"]

    def __init__(self, word: str, status: Literal["correct", "incorrect", "omitted"]):
        self.word = word
        self.status = status

    def to_dict(self) -> dict:
        return {"word": self.word, "status": self.status}


def levenshtein_similarity(s1: str, s2: str) -> float:
    """
    Calculate similarity ratio between two strings using Levenshtein distance.
    Returns a value between 0 and 1 (1 = identical).
    """
    matcher = SequenceMatcher(None, s1.lower(), s2.lower())
    return matcher.ratio()


def compare_phrases(target_phrase: str, spoken_words: List[str], threshold: float = 0.75) -> List[dict]:
    """
    Compare target phrase against spoken words from Whisper.

    Args:
        target_phrase: The phrase the student was supposed to say (e.g., "I like to play football")
        spoken_words: Array of words recognized by Whisper (e.g., ["I", "like", "to", "play", "football"])
        threshold: Similarity threshold (0-1). Words with similarity >= threshold are marked correct.

    Returns:
        List of dicts: [{"word": "I", "status": "correct"}, {"word": "play", "status": "correct"}, ...]

    Logic:
        1. Split target phrase into target words
        2. Use sequence matching to align spoken words with target words
        3. For each target word:
           - If matched to a spoken word with similarity >= threshold: "correct"
           - If matched to a spoken word with similarity < threshold: "incorrect"
           - If no match found (omitted): "omitted"
    """
    target_words = target_phrase.lower().split()
    spoken_words_lower = [w.lower() for w in spoken_words]

    pronunciation_data = []
    matched_spoken_indices = set()

    for target_word in target_words:
        best_match_idx = -1
        best_similarity = 0

        # Find the best matching spoken word (not yet matched)
        for idx, spoken_word in enumerate(spoken_words_lower):
            if idx in matched_spoken_indices:
                continue
            similarity = levenshtein_similarity(target_word, spoken_word)
            if similarity > best_similarity:
                best_similarity = similarity
                best_match_idx = idx

        if best_match_idx == -1:
            # No match found
            status = "omitted"
        elif best_similarity >= threshold:
            # Good match
            status = "correct"
            matched_spoken_indices.add(best_match_idx)
        else:
            # Poor match
            status = "incorrect"
            matched_spoken_indices.add(best_match_idx)

        pronunciation_data.append({"word": target_word, "status": status})

    logger.info(f"Pronunciation analysis: {len(target_words)} target words, {len(spoken_words)} spoken words, {sum(1 for p in pronunciation_data if p['status'] == 'correct')} correct")

    return pronunciation_data


def calculate_pronunciation_score(pronunciation_data: List[dict]) -> int:
    """
    Calculate overall pronunciation score (0-100) based on word-level accuracy.

    Scoring:
    - Correct: 10 points per word
    - Incorrect: 5 points per word
    - Omitted: 0 points per word

    Returns score as percentage of maximum possible (all words correct).
    """
    if not pronunciation_data:
        return 0

    max_points = len(pronunciation_data) * 10
    earned_points = 0

    for item in pronunciation_data:
        status = item.get("status")
        if status == "correct":
            earned_points += 10
        elif status == "incorrect":
            earned_points += 5
        # omitted = 0 points

    score = round((earned_points / max_points) * 100) if max_points > 0 else 0
    return min(100, max(0, score))
