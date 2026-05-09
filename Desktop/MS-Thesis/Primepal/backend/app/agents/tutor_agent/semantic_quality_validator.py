"""
Semantic Quality Validator - Layer 2 of question quality system.

Performs heuristic checks for question quality issues that structural validation misses:
- Answer ambiguity (multiple valid answers)
- Abstract concepts inappropriate for grade level
- Distractor quality (too obvious or too similar)
- Context independence (question needs external context)

Usage:
    validator = SemanticQualityValidator()
    is_valid, issues = validator.validate_question(question_dict, grade_level=2)
"""
from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from typing import Literal

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Quality issue severity levels
# ---------------------------------------------------------------------------

IssueSeverity = Literal["critical", "warning", "info"]


@dataclass
class QualityIssue:
    """A quality issue found in a question."""
    severity: IssueSeverity
    check_name: str
    message: str
    suggestion: str = ""


@dataclass
class QualityResult:
    """Result of semantic quality validation."""
    is_valid: bool
    score: float  # 0.0 - 1.0
    issues: list[QualityIssue]

    @property
    def has_critical_issues(self) -> bool:
        return any(issue.severity == "critical" for issue in self.issues)


# ---------------------------------------------------------------------------
# Grade-level vocabulary complexity thresholds
# ---------------------------------------------------------------------------

# Words that indicate abstract/meta-cognitive concepts (inappropriate for early grades)
ABSTRACT_CONCEPT_INDICATORS = {
    # Grammatical meta-terms
    "noun", "verb", "adjective", "adverb", "pronoun", "preposition",
    "article", "conjunction", "punctuation", "sentence", "clause",
    "subject", "predicate", "phrase",

    # Abstract task verbs
    "identify", "classify", "categorize", "analyze", "compare",
    "contrast", "evaluate", "distinguish",

    # Meta-concepts
    "category", "type", "kind", "group", "class", "belong",
    "similar", "different", "same", "opposite",
}

# Sentence patterns that suggest context-dependent questions
CONTEXT_DEPENDENT_PATTERNS = [
    r"what is missing[?:]?\s*$",  # "What is missing?" with no context
    r"fill in the blank[?:]?\s*$",  # Generic fill blank without sentence
    r"complete the sentence[?:]?\s*$",  # Generic complete without showing sentence
    r"^the\s+(\w+)\s+is\s+___[.?]?\s*$",  # "The X is ___" (too open-ended)
]

# Punctuation marks (for detecting punctuation-choice ambiguity)
PUNCTUATION_MARKS = {".", "!", "?", ",", ";", ":", "'", '"'}


# ---------------------------------------------------------------------------
# Main validator class
# ---------------------------------------------------------------------------

class SemanticQualityValidator:
    """Semantic quality validation for generated questions."""

    def __init__(self, strict_mode: bool = False):
        """
        Args:
            strict_mode: If True, warnings are treated as critical issues
        """
        self.strict_mode = strict_mode

    def validate_question(
        self,
        question: dict,
        grade_level: int = 1,
    ) -> QualityResult:
        """
        Validate a single question for semantic quality.

        Args:
            question: Question dict with task_type, question, options, etc.
            grade_level: Student grade level (1-6)

        Returns:
            QualityResult with validation outcome
        """
        issues: list[QualityIssue] = []

        # Run all validation checks
        issues.extend(self._check_answer_ambiguity(question))
        issues.extend(self._check_abstract_concepts(question, grade_level))
        issues.extend(self._check_distractor_quality(question))
        issues.extend(self._check_context_independence(question))
        issues.extend(self._check_punctuation_ambiguity(question))

        # Calculate quality score (1.0 = perfect, 0.0 = critical issues)
        critical_count = sum(1 for i in issues if i.severity == "critical")
        warning_count = sum(1 for i in issues if i.severity == "warning")

        if critical_count > 0:
            score = 0.0
        elif warning_count > 2:
            score = 0.3
        elif warning_count > 0:
            score = 0.7
        else:
            score = 1.0

        # Question is valid if score >= 0.6 (or no critical issues in non-strict mode)
        is_valid = score >= 0.6 and (not self.strict_mode or critical_count == 0)

        return QualityResult(
            is_valid=is_valid,
            score=score,
            issues=issues,
        )

    def validate_questions(
        self,
        questions: list[dict],
        grade_level: int = 1,
    ) -> tuple[list[dict], list[dict], list[QualityIssue]]:
        """
        Validate multiple questions, returning valid and invalid lists.

        Returns:
            (valid_questions, invalid_questions, all_issues)
        """
        valid: list[dict] = []
        invalid: list[dict] = []
        all_issues: list[QualityIssue] = []

        for q in questions:
            result = self.validate_question(q, grade_level)

            if result.is_valid:
                valid.append(q)
            else:
                invalid.append(q)
                all_issues.extend(result.issues)

                # Log rejection reason
                qid = q.get("id", "?")
                question_text = q.get("question", "")[:60]
                critical_issues = [i.message for i in result.issues if i.severity == "critical"]
                logger.warning(
                    f"Rejected Q{qid} (score={result.score:.2f}): {question_text}... "
                    f"Issues: {'; '.join(critical_issues)}"
                )

        logger.info(
            f"Semantic validation: {len(valid)}/{len(questions)} questions passed "
            f"({len(invalid)} rejected, {len(all_issues)} total issues)"
        )

        return valid, invalid, all_issues

    # -----------------------------------------------------------------------
    # Individual validation checks
    # -----------------------------------------------------------------------

    def _check_answer_ambiguity(self, question: dict) -> list[QualityIssue]:
        """
        Check if multiple options could be correct answers.

        Red flags:
        - Sentence completion with multiple grammatically valid options
        - True/False questions about opinions
        - "Which is correct?" without objective criteria
        """
        issues: list[QualityIssue] = []
        task_type = question.get("task_type", "")
        question_text = question.get("question", "").lower()

        # Check for opinion-based questions
        opinion_keywords = ["favorite", "prefer", "like best", "think", "feel", "opinion"]
        if any(keyword in question_text for keyword in opinion_keywords):
            issues.append(QualityIssue(
                severity="critical",
                check_name="answer_ambiguity",
                message="Question asks for opinion, not knowledge",
                suggestion="Change to objective factual question",
            ))

        # Check for vague completion questions
        vague_patterns = [
            "is ___",
            "was ___",
            "are ___",
            "were ___",
        ]
        if any(pattern in question_text for pattern in vague_patterns):
            # This could be OK if there's context, but flag as warning
            issues.append(QualityIssue(
                severity="warning",
                check_name="answer_ambiguity",
                message="Sentence completion may have multiple valid answers",
                suggestion="Add more context or constraints",
            ))

        return issues

    def _check_abstract_concepts(self, question: dict, grade_level: int) -> list[QualityIssue]:
        """
        Check if question uses abstract concepts inappropriate for grade level.

        Red flags for Grade 1-3:
        - Grammatical meta-language (noun, verb, adjective)
        - Classification tasks (which does NOT belong)
        - Abstract reasoning (identify the pattern)
        """
        issues: list[QualityIssue] = []
        question_text = question.get("question", "").lower()

        # Check for abstract concept indicators
        found_abstract = [
            term for term in ABSTRACT_CONCEPT_INDICATORS
            if term in question_text
        ]

        if found_abstract and grade_level <= 3:
            issues.append(QualityIssue(
                severity="critical",
                check_name="abstract_concepts",
                message=f"Abstract concept for Grade {grade_level}: {', '.join(found_abstract)}",
                suggestion="Use concrete examples instead of meta-concepts",
            ))
        elif found_abstract and grade_level <= 5:
            issues.append(QualityIssue(
                severity="warning",
                check_name="abstract_concepts",
                message=f"May be too abstract for Grade {grade_level}: {', '.join(found_abstract)}",
                suggestion="Ensure student has learned this concept",
            ))

        # Check for "does NOT belong" questions (requires abstract categorization)
        if "not belong" in question_text or "doesn't belong" in question_text:
            if grade_level <= 2:
                issues.append(QualityIssue(
                    severity="critical",
                    check_name="abstract_concepts",
                    message="'Does NOT belong' task too abstract for Grade 1-2",
                    suggestion="Use direct matching or concrete questions",
                ))
            else:
                issues.append(QualityIssue(
                    severity="warning",
                    check_name="abstract_concepts",
                    message="'Does NOT belong' requires categorization skills",
                    suggestion="Ensure categories are very clear and concrete",
                ))

        return issues

    def _check_distractor_quality(self, question: dict) -> list[QualityIssue]:
        """
        Check if wrong answer options are plausible but clearly incorrect.

        Red flags:
        - All distractors are obviously wrong (different parts of speech)
        - Distractors too similar to correct answer (impossible to distinguish)
        """
        issues: list[QualityIssue] = []
        task_type = question.get("task_type", "")

        # Only check multiple-choice questions
        if task_type not in ("odd_one_out", "fill_blank_word_bank", "sentence_picture_match", "listen_and_choose", "simon_says"):
            return issues

        # Get options
        options_field = "image_options" if task_type in ("sentence_picture_match", "listen_and_choose") else "options"
        options = question.get(options_field, [])
        correct_answer_id = question.get("correct_answer", "").lower()

        if len(options) < 4:
            return issues  # Structural issue, not our concern here

        option_texts = [opt.get("text", "").lower().strip() for opt in options]
        correct_text = next((opt.get("text", "") for opt in options if opt.get("id", "").lower() == correct_answer_id), "")

        # Check if all options are the same part of speech / category
        # Simple heuristic: check word length and character patterns
        avg_length = sum(len(t) for t in option_texts) / len(option_texts)
        length_variance = sum(abs(len(t) - avg_length) for t in option_texts) / len(option_texts)

        if length_variance > avg_length * 0.8:  # High variance in length
            issues.append(QualityIssue(
                severity="warning",
                check_name="distractor_quality",
                message="Distractors may be too obviously different (length variance high)",
                suggestion="Make distractors more similar in structure to correct answer",
            ))

        # Check for very similar options (potential duplicate or confusing)
        for i, text1 in enumerate(option_texts):
            for text2 in option_texts[i+1:]:
                if text1 and text2 and text1 == text2:
                    issues.append(QualityIssue(
                        severity="critical",
                        check_name="distractor_quality",
                        message=f"Duplicate option: '{text1}'",
                        suggestion="Ensure all options are unique",
                    ))

        return issues

    def _check_context_independence(self, question: dict) -> list[QualityIssue]:
        """
        Check if question can be answered without additional context.

        Red flags:
        - "What is missing?" without showing what
        - Pronouns without antecedents
        - Incomplete information
        """
        issues: list[QualityIssue] = []
        question_text = question.get("question", "").lower().strip()

        # Check against context-dependent patterns
        for pattern in CONTEXT_DEPENDENT_PATTERNS:
            if re.search(pattern, question_text, re.IGNORECASE):
                issues.append(QualityIssue(
                    severity="warning",
                    check_name="context_independence",
                    message=f"Question may need more context: '{question_text}'",
                    suggestion="Include the complete sentence or scenario in the question",
                ))
                break

        # Check for pronouns without clear reference
        pronouns = ["it", "he", "she", "they", "this", "that", "these", "those"]
        for pronoun in pronouns:
            # Simple check: if question starts with pronoun, it likely needs context
            if question_text.startswith(pronoun + " "):
                issues.append(QualityIssue(
                    severity="warning",
                    check_name="context_independence",
                    message=f"Question starts with pronoun '{pronoun}' without antecedent",
                    suggestion="Replace pronoun with specific noun or provide context",
                ))
                break

        return issues

    def _check_punctuation_ambiguity(self, question: dict) -> list[QualityIssue]:
        """
        Special check for punctuation questions - HIGH RISK for ambiguity.

        Red flag:
        - "What is the missing punctuation?" with multiple valid answers
        - Sentence ending with blank where any punctuation could work
        """
        issues: list[QualityIssue] = []
        question_text = question.get("question", "").lower()
        task_type = question.get("task_type", "")

        # Check if this is a punctuation question
        is_punctuation_question = (
            "punctuation" in question_text or
            "missing" in question_text and any(p in str(question.get("options", [])) for p in [".", "!", "?", ","])
        )

        if not is_punctuation_question:
            return issues

        # Get options
        options_field = "image_options" if task_type in ("sentence_picture_match", "listen_and_choose") else "options"
        options = question.get(options_field, [])
        option_texts = {opt.get("text", "").strip() for opt in options}

        # Count how many are punctuation marks
        punct_count = sum(1 for opt in option_texts if opt in PUNCTUATION_MARKS)

        if punct_count >= 3:
            # Multiple punctuation options - very likely ambiguous
            issues.append(QualityIssue(
                severity="critical",
                check_name="punctuation_ambiguity",
                message=f"Punctuation question with {punct_count} punctuation options - likely ambiguous",
                suggestion="Provide full sentence context that makes only ONE punctuation correct, or avoid punctuation-choice questions",
            ))

        # Check if sentence context is provided
        if "___" in question_text or "blank" in question_text:
            # If no passage or audio_text provided, context is missing
            if not question.get("passage") and not question.get("audio_text"):
                issues.append(QualityIssue(
                    severity="critical",
                    check_name="punctuation_ambiguity",
                    message="Punctuation question missing sentence context",
                    suggestion="Include complete sentence showing why only one punctuation mark is correct",
                ))

        return issues


# ---------------------------------------------------------------------------
# Convenience function for backward compatibility
# ---------------------------------------------------------------------------

def validate_question_quality(
    question: dict,
    grade_level: int = 1,
    strict: bool = False,
) -> tuple[bool, list[str]]:
    """
    Legacy interface - returns (is_valid, issue_messages).

    Args:
        question: Question dict to validate
        grade_level: Student grade level
        strict: If True, warnings count as failures

    Returns:
        (is_valid, list of issue messages)
    """
    validator = SemanticQualityValidator(strict_mode=strict)
    result = validator.validate_question(question, grade_level)

    issue_messages = [
        f"[{issue.severity.upper()}] {issue.message}"
        for issue in result.issues
    ]

    return result.is_valid, issue_messages
