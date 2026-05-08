"""
Question Validator & Repair — post-LLM validation for pillar mission questions.

Pipeline position:
  LLM generates 5 questions → validate → repair from bank → merge with 5 bank questions → 10 final

Responsibilities:
  1. validate_questions():  Check field completeness, task_type distribution, topic alignment.
  2. repair_questions():    Fill gaps from bank questions, replace invalid items, re-number IDs.
  3. merge_bank_and_llm():  Combine 5 bank + 5 LLM questions, de-duplicate, enforce distribution.
"""
from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass, field
from difflib import SequenceMatcher

from app.agents.tutor_agent.mission_generator import (
    MULTIPLE_CHOICE_OPTIONS,
    PILLAR_TASK_CONFIGS,
    validate_topic_alignment,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Required fields per task type
# ---------------------------------------------------------------------------

# Base fields every question must have regardless of task_type
BASE_REQUIRED_FIELDS = [
    "id", "task_type", "pillar", "question", "difficulty",
    "points_value", "correct_answer",
]

# Additional mandatory fields per task_type.
# A field listed here means it must be non-empty / non-null for the question
# to be considered valid.
TASK_TYPE_REQUIRED_FIELDS: dict[str, list[str]] = {
    # -- Reading --
    "sentence_picture_match": ["image_options"],
    "odd_one_out":            ["options"],
    "fill_blank_word_bank":   ["options"],
    "passage_true_false":     ["passage"],

    # -- Writing --
    "sentence_scramble":      ["word_bank", "correct_order"],
    "missing_letter":         ["word_with_blanks", "letter_options"],
    "guided_translation":     ["word_bank", "correct_order"],

    # -- Listening --
    "listen_and_choose":      ["audio_text", "image_options"],
    "simon_says":             ["audio_text", "options"],
    "listen_and_spell":       ["audio_text"],

    # -- Speaking --
    "repeat_after_me":        ["audio_text"],
    "what_is_this":           ["image_context"],
    "finish_the_sentence":    ["sentence_start"],
}

# Task types that require exactly 4 options (multiple-choice style)
TASK_TYPES_WITH_OPTIONS = {
    "odd_one_out":          "options",
    "fill_blank_word_bank": "options",
    "simon_says":           "options",
}

TASK_TYPES_WITH_IMAGE_OPTIONS = {
    "sentence_picture_match": "image_options",
    "listen_and_choose":      "image_options",
}

# Similarity threshold for de-duplication (0.0 – 1.0)
DEDUP_SIMILARITY_THRESHOLD = 0.98  # Only catch near-exact duplicates (same sentence)


# ---------------------------------------------------------------------------
# Validated result container
# ---------------------------------------------------------------------------

@dataclass
class ValidatedResult:
    """Output of validate_questions()."""
    valid_questions: list[dict] = field(default_factory=list)
    invalid_questions: list[dict] = field(default_factory=list)
    issues: list[str] = field(default_factory=list)
    missing_types: dict[str, int] = field(default_factory=dict)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_expected_distribution(pillar: str, target_count: int = 10) -> dict[str, int]:
    """
    Return {task_type: count} for the given pillar, scaled proportionally to
    *target_count*.  When target_count equals the sum defined in
    PILLAR_TASK_CONFIGS (always 10 today) the raw counts are used directly.
    For partial sets (e.g. 5) the distribution is scaled down, with any
    rounding remainder assigned to the first task type.
    """
    config = PILLAR_TASK_CONFIGS[pillar]
    raw_total = sum(c for _, c in config["task_types"])

    if target_count == raw_total:
        return {tt: c for tt, c in config["task_types"]}

    # Proportional scaling
    dist: dict[str, int] = {}
    allocated = 0
    for tt, raw_count in config["task_types"]:
        scaled = round(raw_count * target_count / raw_total)
        dist[tt] = scaled
        allocated += scaled

    # Fix rounding drift — add/remove from the first task type
    diff = target_count - allocated
    first_tt = config["task_types"][0][0]
    dist[first_tt] = max(0, dist[first_tt] + diff)

    return dist


def _field_is_present(question: dict, field_name: str) -> bool:
    """Return True if *field_name* exists in *question* and is non-empty."""
    val = question.get(field_name)
    if val is None:
        return False
    if isinstance(val, (str, list, dict)) and len(val) == 0:
        return False
    return True


def _question_text_key(q: dict) -> str:
    """Normalised text used for similarity comparison."""
    return (q.get("question") or "").strip().lower()


def _are_similar(a: str, b: str, threshold: float = DEDUP_SIMILARITY_THRESHOLD) -> bool:
    """Fuzzy match two strings using SequenceMatcher."""
    if not a or not b:
        return False
    return SequenceMatcher(None, a, b).ratio() >= threshold


# ---------------------------------------------------------------------------
# 1. Validate questions
# ---------------------------------------------------------------------------

def validate_questions(
    questions: list[dict],
    pillar: str,
    active_topics: list[str],
    target_count: int = 10,
) -> ValidatedResult:
    """
    Validate a list of LLM-generated question dicts.

    Checks performed:
      1. Total count matches *target_count*.
      2. Task-type distribution matches PILLAR_TASK_CONFIGS (proportional).
      3. All required fields present per task_type.
      4. Topic alignment via validate_topic_alignment().
      5. correct_answer is non-empty.
      6. Options / image_options have exactly 4 items where required.

    Returns a ValidatedResult with valid_questions, issues, and missing_types.
    """
    result = ValidatedResult()
    expected_dist = _get_expected_distribution(pillar, target_count)

    # --- Check 1: Count ---
    if len(questions) != target_count:
        result.issues.append(
            f"Expected {target_count} questions, received {len(questions)}"
        )

    # --- Per-question checks (3, 5, 6) ---
    field_valid: list[dict] = []
    for q in questions:
        q_issues: list[str] = []
        tt = q.get("task_type", "")
        qid = q.get("id", "?")

        # Check 5: correct_answer non-empty
        if not _field_is_present(q, "correct_answer"):
            q_issues.append(f"Q{qid}: missing correct_answer")

        # Check 3: required fields for this task_type
        extra_fields = TASK_TYPE_REQUIRED_FIELDS.get(tt, [])
        for fld in BASE_REQUIRED_FIELDS + extra_fields:
            if not _field_is_present(q, fld):
                q_issues.append(f"Q{qid}: missing required field '{fld}' for {tt}")

        # Check 6: option counts
        if tt in TASK_TYPES_WITH_OPTIONS:
            opts = q.get(TASK_TYPES_WITH_OPTIONS[tt]) or []
            if len(opts) != MULTIPLE_CHOICE_OPTIONS:
                q_issues.append(
                    f"Q{qid}: {TASK_TYPES_WITH_OPTIONS[tt]} has {len(opts)} items, "
                    f"expected {MULTIPLE_CHOICE_OPTIONS}"
                )

        if tt in TASK_TYPES_WITH_IMAGE_OPTIONS:
            opts = q.get(TASK_TYPES_WITH_IMAGE_OPTIONS[tt]) or []
            if len(opts) != MULTIPLE_CHOICE_OPTIONS:
                q_issues.append(
                    f"Q{qid}: {TASK_TYPES_WITH_IMAGE_OPTIONS[tt]} has {len(opts)} items, "
                    f"expected {MULTIPLE_CHOICE_OPTIONS}"
                )

        if q_issues:
            result.issues.extend(q_issues)
            result.invalid_questions.append(q)
        else:
            field_valid.append(q)

    # --- Check 4: Topic alignment (uses existing helper) ---
    topic_aligned = validate_topic_alignment(field_valid, active_topics, pillar)
    # Questions that were field-valid but failed topic alignment
    topic_rejected = [q for q in field_valid if q not in topic_aligned]
    for q in topic_rejected:
        result.issues.append(
            f"Q{q.get('id', '?')}: failed topic alignment for topics {active_topics}"
        )
        result.invalid_questions.append(q)

    result.valid_questions = topic_aligned

    # --- Check 2: Task-type distribution ---
    actual_dist: dict[str, int] = {}
    for q in result.valid_questions:
        tt = q.get("task_type", "unknown")
        actual_dist[tt] = actual_dist.get(tt, 0) + 1

    for tt, expected_count in expected_dist.items():
        actual_count = actual_dist.get(tt, 0)
        if actual_count < expected_count:
            shortfall = expected_count - actual_count
            result.missing_types[tt] = shortfall
            result.issues.append(
                f"Task type '{tt}' has {actual_count}/{expected_count} questions "
                f"(need {shortfall} more)"
            )

    logger.info(
        f"Validation complete for {pillar}: "
        f"{len(result.valid_questions)} valid, "
        f"{len(result.invalid_questions)} invalid, "
        f"{len(result.issues)} issues, "
        f"missing_types={result.missing_types}"
    )

    return result


# ---------------------------------------------------------------------------
# 2. Repair questions
# ---------------------------------------------------------------------------

def repair_questions(
    validated_result: ValidatedResult,
    bank_questions: list[dict],
    pillar: str,
    target_count: int = 10,
) -> list[dict]:
    """
    Repair a validated set of questions using bank questions as backfill.

    Strategy:
      1. Start with the valid questions from validation.
      2. For each missing task_type, pick matching bank questions.
      3. If bank cannot fill a slot, pick any unused bank question.
      4. Trim or pad to exactly *target_count*.
      5. Re-number IDs 1..N.

    Returns a list of exactly *target_count* question dicts.
    """
    expected_dist = _get_expected_distribution(pillar, target_count)
    final: list[dict] = list(validated_result.valid_questions)

    # Index bank questions by task_type for efficient lookup
    bank_by_type: dict[str, list[dict]] = {}
    for bq in bank_questions:
        tt = bq.get("task_type", "unknown")
        bank_by_type.setdefault(tt, []).append(bq)

    used_bank_ids: set[str] = set()

    def _pick_from_bank(task_type: str) -> dict | None:
        """Pop one unused bank question of the given task_type, or None."""
        candidates = bank_by_type.get(task_type, [])
        for bq in candidates:
            bq_key = bq.get("question", "") or str(uuid.uuid4())
            if bq_key not in used_bank_ids:
                used_bank_ids.add(bq_key)
                return bq
        return None

    def _pick_any_bank() -> dict | None:
        """Pop any unused bank question regardless of type."""
        for tt_list in bank_by_type.values():
            for bq in tt_list:
                bq_key = bq.get("question", "") or str(uuid.uuid4())
                if bq_key not in used_bank_ids:
                    used_bank_ids.add(bq_key)
                    return bq
        return None

    # Mark already-used bank questions (those that ended up in valid_questions)
    for q in final:
        used_bank_ids.add(q.get("question", ""))

    # Fill missing task_type slots
    for tt, needed in validated_result.missing_types.items():
        for _ in range(needed):
            if len(final) >= target_count:
                break
            replacement = _pick_from_bank(tt)
            if replacement:
                replacement = dict(replacement)  # shallow copy
                replacement["pillar"] = pillar
                final.append(replacement)
                logger.debug(f"Repair: filled {tt} slot from bank")
            else:
                logger.warning(f"Repair: no bank question available for task_type '{tt}'")

    # If still under target, pad with any available bank questions
    while len(final) < target_count:
        filler = _pick_any_bank()
        if filler:
            filler = dict(filler)
            filler["pillar"] = pillar
            final.append(filler)
        else:
            logger.warning(
                f"Repair: exhausted bank questions, only {len(final)}/{target_count} filled"
            )
            break

    # Trim excess (prefer keeping questions that match expected distribution)
    if len(final) > target_count:
        # Keep first target_count, preferring correct task_type distribution
        final = final[:target_count]

    # Re-number IDs 1..N and ensure consistent points_value
    for i, q in enumerate(final):
        q["id"] = i + 1
        q["pillar"] = pillar
        q.setdefault("difficulty", "medium")
        q["points_value"] = 10  # consistent scoring

    logger.info(
        f"Repair complete for {pillar}: {len(final)} questions "
        f"(target was {target_count})"
    )

    return final


# ---------------------------------------------------------------------------
# 3. Merge bank and LLM questions
# ---------------------------------------------------------------------------

def merge_bank_and_llm(
    bank_questions: list[dict],
    llm_questions: list[dict],
    pillar: str,
    target_count: int = 10,
) -> list[dict]:
    """
    Combine bank questions and LLM-generated questions into a single set of
    exactly *target_count* questions.

    Strategy:
      1. De-duplicate by fuzzy text similarity (DEDUP_SIMILARITY_THRESHOLD).
      2. Allocate slots by task_type distribution from PILLAR_TASK_CONFIGS.
      3. For each task_type, prefer LLM questions first, then bank.
      4. If LLM returned fewer than expected, fill remaining from bank.
      5. Re-number IDs 1..target_count.

    Args:
        bank_questions:  Pre-authored questions from the question bank.
        llm_questions:   Questions returned by the LLM (already validated/repaired).
        pillar:          One of reading, writing, listening, speaking.
        target_count:    Final question count (default 10).

    Returns:
        List of exactly *target_count* question dicts (or fewer if both sources
        are exhausted).
    """
    expected_dist = _get_expected_distribution(pillar, target_count)

    # --- Step 1: De-duplicate across sources ---
    # Build a list of (question_dict, source) tuples.  LLM questions take
    # priority in de-duplication: if an LLM question is similar to a bank
    # question, keep the LLM version.
    llm_texts = [_question_text_key(q) for q in llm_questions]

    deduped_bank: list[dict] = []
    for bq in bank_questions:
        bq_text = _question_text_key(bq)
        is_dup = any(_are_similar(bq_text, lt) for lt in llm_texts)
        if is_dup:
            logger.debug(
                f"Merge: dropping duplicate bank question: "
                f"{bq.get('question', '')[:50]}..."
            )
        else:
            deduped_bank.append(bq)

    # --- Step 2: Index by task_type (with unique indices for tracking) ---
    llm_indexed: list[tuple[int, dict]] = list(enumerate(llm_questions))
    bank_indexed: list[tuple[int, dict]] = list(enumerate(deduped_bank))

    llm_by_type: dict[str, list[tuple[int, dict]]] = {}
    for idx, q in llm_indexed:
        tt = q.get("task_type", "unknown")
        llm_by_type.setdefault(tt, []).append((idx, q))

    bank_by_type: dict[str, list[tuple[int, dict]]] = {}
    for idx, q in bank_indexed:
        tt = q.get("task_type", "unknown")
        bank_by_type.setdefault(tt, []).append((idx, q))

    # --- Step 3: Allocate by distribution ---
    merged: list[dict] = []
    used_llm: set[int] = set()
    used_bank: set[int] = set()

    for tt, needed in expected_dist.items():
        added = 0

        # Prefer LLM questions for this task_type
        for idx, q in llm_by_type.get(tt, []):
            if added >= needed:
                break
            if idx not in used_llm:
                used_llm.add(idx)
                merged.append(q)
                added += 1

        # Fill remaining from bank
        for idx, q in bank_by_type.get(tt, []):
            if added >= needed:
                break
            if idx not in used_bank:
                used_bank.add(idx)
                merged.append(q)
                added += 1

        if added < needed:
            logger.warning(
                f"Merge: could only fill {added}/{needed} slots for task_type '{tt}'"
            )

    # --- Step 4: Fill any remaining slots from unused questions ---
    remaining_slots = target_count - len(merged)
    if remaining_slots > 0:
        # Try unused LLM questions first, then unused bank questions
        for idx, q in llm_indexed:
            if remaining_slots <= 0:
                break
            if idx not in used_llm:
                used_llm.add(idx)
                merged.append(q)
                remaining_slots -= 1

        for idx, q in bank_indexed:
            if remaining_slots <= 0:
                break
            if idx not in used_bank:
                used_bank.add(idx)
                merged.append(q)
                remaining_slots -= 1

    # Trim to target if somehow over
    merged = merged[:target_count]

    # --- Step 5: Re-number IDs and normalise ---
    for i, q in enumerate(merged):
        q["id"] = i + 1
        q["pillar"] = pillar
        q.setdefault("difficulty", "medium")
        q["points_value"] = 10

    llm_count = len(used_llm)
    bank_count = len(used_bank)
    logger.info(
        f"Merge complete for {pillar}: {len(merged)} questions "
        f"(target {target_count}, {llm_count} from LLM, {bank_count} from bank)"
    )

    return merged
