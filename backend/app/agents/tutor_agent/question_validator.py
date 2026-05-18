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
# 0.92: only drop near-identical questions; avoids over-deduplication when
# content-specific fields are used as the comparison key (see _question_text_key).
DEDUP_SIMILARITY_THRESHOLD = 0.92

# Task types where correct_answer must be an option ID ("a","b","c","d")
OPTION_ID_ANSWER_TYPES = {
    "sentence_picture_match", "odd_one_out", "fill_blank_word_bank",
    "listen_and_choose", "simon_says",
}

# Valid option IDs
VALID_OPTION_IDS = {"a", "b", "c", "d"}


# ---------------------------------------------------------------------------
# 0. Normalize correct_answer — repair LLM format mismatches
# ---------------------------------------------------------------------------

def normalize_correct_answer(question: dict) -> dict:
    """
    Fix correct_answer format mismatches from LLM output.

    For option-based tasks: if correct_answer is the option TEXT instead
    of the option ID, look it up and replace with the ID.

    For passage_true_false: lowercase "True"/"False"/"TRUE" to "true"/"false".

    For text-based tasks: strip whitespace.

    Returns the same dict (mutated in place).
    """
    tt = question.get("task_type", "")
    answer = question.get("correct_answer", "")
    if not answer:
        return question

    answer_str = str(answer).strip()

    if tt in OPTION_ID_ANSWER_TYPES:
        if answer_str.lower() in VALID_OPTION_IDS:
            question["correct_answer"] = answer_str.lower()
        else:
            # Not a valid ID — try to find the matching option by text
            options_field = "image_options" if tt in ("sentence_picture_match", "listen_and_choose") else "options"
            options = question.get(options_field) or []
            matched_id = None
            answer_lower = answer_str.lower()
            for opt in options:
                opt_text = (opt.get("text") or "").strip().lower()
                opt_emoji = (opt.get("emoji") or "").strip()
                if opt_text == answer_lower or opt_emoji == answer_str:
                    matched_id = opt.get("id", "").lower()
                    break
            if matched_id and matched_id in VALID_OPTION_IDS:
                logger.info(
                    f"Normalized correct_answer: '{answer_str}' -> '{matched_id}' "
                    f"(task_type={tt}, question={question.get('question', '')[:40]})"
                )
                question["correct_answer"] = matched_id
            else:
                logger.warning(
                    f"Cannot normalize correct_answer '{answer_str}' for {tt}. "
                    f"Options: {[o.get('text') for o in options]}"
                )

    elif tt == "passage_true_false":
        # Normalize to lowercase "true" or "false"
        if answer_str.lower() in ("true", "false"):
            question["correct_answer"] = answer_str.lower()
        else:
            logger.warning(f"Invalid passage_true_false answer: '{answer_str}'")

    else:
        # Text-based tasks — just trim
        question["correct_answer"] = answer_str

    # Auto-fill audio_text for listening/speaking tasks if missing
    tt = question.get("task_type", "")
    if tt in ("listen_and_choose", "simon_says", "listen_and_spell", "repeat_after_me"):
        if not question.get("audio_text"):
            # Use the question text or correct_answer as audio_text fallback
            if tt == "repeat_after_me":
                question["audio_text"] = question.get("correct_answer", question.get("question", ""))
            elif tt == "listen_and_spell":
                question["audio_text"] = question.get("correct_answer", "")
            else:
                question["audio_text"] = question.get("question", "")
            if question["audio_text"]:
                logger.info(f"Auto-filled audio_text for {tt}: '{question['audio_text'][:40]}'")

    # For guided_translation: question IS already Urdu — clear urdu_hint to avoid
    # showing a duplicate/mismatched Urdu hint alongside an Urdu question.
    if tt == "guided_translation":
        question["urdu_hint"] = ""

    # Fix sentence_scramble / guided_translation issues
    if tt == "sentence_scramble":
        # 1. Question should be generic instruction, not contain the scrambled words
        question["question"] = "Put the words in the correct order"

        # 2. Ensure word_bank and correct_order have same words
        wb = question.get("word_bank") or []
        co = question.get("correct_order") or []
        ca = question.get("correct_answer", "")

        # If correct_order is empty but correct_answer exists, derive it
        if not co and ca:
            question["correct_order"] = ca.split()
            co = question["correct_order"]

        # If word_bank is empty but correct_order exists, scramble it
        if not wb and co:
            import random
            shuffled = list(co)
            random.shuffle(shuffled)
            # Make sure it's actually scrambled
            if shuffled == co and len(co) > 1:
                shuffled[0], shuffled[-1] = shuffled[-1], shuffled[0]
            question["word_bank"] = shuffled

        # Ensure correct_answer matches correct_order
        if co and not ca:
            question["correct_answer"] = " ".join(co)

    elif tt == "guided_translation":
        # Ensure word_bank and correct_order consistency
        wb = question.get("word_bank") or []
        co = question.get("correct_order") or []
        ca = question.get("correct_answer", "")
        if not co and ca:
            question["correct_order"] = ca.split()
        if not wb and question.get("correct_order"):
            import random
            shuffled = list(question["correct_order"])
            random.shuffle(shuffled)
            question["word_bank"] = shuffled
        if question.get("correct_order") and not ca:
            question["correct_answer"] = " ".join(question["correct_order"])

    elif tt == "missing_letter":
        # Ensure question is generic
        question["question"] = "Fill in the missing letter(s)"

    return question


def normalize_all_questions(questions: list[dict]) -> list[dict]:
    """Run normalize_correct_answer on every question in the list."""
    for q in questions:
        normalize_correct_answer(q)
    return questions


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
    """
    Normalised text used for similarity/deduplication comparison.

    Many task types use a fixed instruction string in the `question` field
    (e.g. sentence_scramble always has "Put the words in the correct order").
    Using that field would make every question of that type look identical and
    cause _dedup_within to drop all but one.  For these types we use the
    content-specific field that actually distinguishes questions.
    """
    tt = q.get("task_type", "")
    if tt in ("sentence_scramble", "guided_translation"):
        # Unique content is the actual sentence (correct_answer or correct_order)
        content = (
            q.get("correct_answer")
            or " ".join(q.get("correct_order") or [])
            or q.get("question", "")
        )
    elif tt == "missing_letter":
        # Unique content is the word being completed
        content = q.get("correct_answer") or q.get("word_with_blanks") or q.get("question", "")
    elif tt in ("repeat_after_me", "listen_and_choose", "simon_says", "listen_and_spell"):
        # Unique content is the spoken text
        content = q.get("audio_text") or q.get("correct_answer") or q.get("question", "")
    elif tt == "what_is_this":
        # Unique content is the image/object being named
        content = q.get("image_context") or q.get("correct_answer") or q.get("question", "")
    elif tt == "finish_the_sentence":
        # Unique content is the sentence stem
        content = q.get("sentence_start") or q.get("correct_answer") or q.get("question", "")
    else:
        content = q.get("question") or ""
    return content.strip().lower()


def _are_similar(a: str, b: str, threshold: float = DEDUP_SIMILARITY_THRESHOLD) -> bool:
    """Fuzzy match two strings using SequenceMatcher."""
    if not a or not b:
        return False
    return SequenceMatcher(None, a, b).ratio() >= threshold


def _dedup_within(questions: list[dict]) -> list[dict]:
    """Remove duplicate questions within a single list."""
    seen_texts: list[str] = []
    unique: list[dict] = []
    for q in questions:
        text = _question_text_key(q)
        if not text:
            unique.append(q)
            continue
        if any(_are_similar(text, s) for s in seen_texts):
            logger.debug("Intra-source dedup: dropping '%s...'", text[:50])
            continue
        seen_texts.append(text)
        unique.append(q)
    return unique


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

        # Check 5b: correct_answer format matches task_type
        ca = str(q.get("correct_answer", "")).strip().lower()
        if ca and tt in OPTION_ID_ANSWER_TYPES:
            if ca not in VALID_OPTION_IDS:
                q_issues.append(
                    f"Q{qid}: correct_answer '{ca}' is not a valid option ID (a/b/c/d) for {tt}"
                )
        if ca and tt == "passage_true_false":
            if ca not in ("true", "false"):
                q_issues.append(
                    f"Q{qid}: correct_answer '{ca}' must be 'true' or 'false' for passage_true_false"
                )

        # Check 5c: correct_order consistency for scramble/translation
        if tt in ("sentence_scramble", "guided_translation"):
            wb = q.get("word_bank") or []
            co = q.get("correct_order") or []
            if wb and co and len(wb) != len(co):
                q_issues.append(
                    f"Q{qid}: word_bank length ({len(wb)}) != correct_order length ({len(co)})"
                )

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

    # --- Step 1: De-duplicate within each source first ---
    llm_questions = _dedup_within(llm_questions)
    bank_questions = _dedup_within(bank_questions)

    # --- Step 2: De-duplicate across sources (count-aware) ---
    # LLM questions take priority: if a bank question is similar to an LLM
    # question, drop the bank version — but only if we have enough total
    # questions to still reach target_count.
    llm_texts = [_question_text_key(q) for q in llm_questions]
    total_available = len(llm_questions) + len(bank_questions)

    deduped_bank: list[dict] = []
    dropped_dups = 0
    for bq in bank_questions:
        bq_text = _question_text_key(bq)
        is_dup = any(_are_similar(bq_text, lt) for lt in llm_texts)
        if is_dup and (total_available - dropped_dups - 1) >= target_count:
            logger.debug(
                f"Merge: dropping duplicate bank question: "
                f"{bq.get('question', '')[:50]}..."
            )
            dropped_dups += 1
        else:
            if is_dup:
                logger.debug(
                    f"Merge: keeping near-duplicate bank question to meet target count: "
                    f"{bq.get('question', '')[:50]}..."
                )
            deduped_bank.append(bq)

    # --- Step 3: Index by task_type (with unique indices for tracking) ---
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

    # --- Step 4: Allocate by distribution ---
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

    # --- Step 5: Fill any remaining slots from unused questions ---
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

    # --- Step 6: Re-number IDs and normalise ---
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
