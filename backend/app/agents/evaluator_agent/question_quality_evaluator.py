"""
Question Quality Evaluator - Layer 3 of question quality system.

Uses LLM (Evaluator Agent) to perform deep quality analysis of generated questions.
This is the final quality gate before questions are shown to students.

Usage:
    evaluator = QuestionQualityEvaluator()
    score, feedback = await evaluator.evaluate_question(question_dict, grade_level=2)
"""
from __future__ import annotations

import asyncio
import json
import logging
from dataclasses import dataclass
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field

from app.core.config import settings

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Quality score structure from LLM
# ---------------------------------------------------------------------------

class QuestionQualityScores(BaseModel):
    """Structured quality scores from Evaluator Agent."""
    clarity: int = Field(ge=0, le=10, description="Is the question clear and unambiguous?")
    answer_validity: int = Field(ge=0, le=10, description="Is there exactly ONE correct answer?")
    distractor_quality: int = Field(ge=0, le=10, description="Are wrong options plausible but clearly incorrect?")
    age_appropriateness: int = Field(ge=0, le=10, description="Is it appropriate for the grade level?")
    pedagogical_value: int = Field(ge=0, le=10, description="Does it test meaningful knowledge?")
    overall_score: int = Field(ge=0, le=10, description="Overall quality score")
    pass_fail: str = Field(description="PASS or FAIL")
    feedback: str = Field(description="Brief explanation of scores and decision")


@dataclass
class QualityEvaluation:
    """Result of LLM quality evaluation."""
    overall_score: float  # 0.0 - 1.0 (normalized from 0-10)
    is_valid: bool
    clarity: int
    answer_validity: int
    distractor_quality: int
    age_appropriateness: int
    pedagogical_value: int
    feedback: str


# ---------------------------------------------------------------------------
# Evaluator prompt templates
# ---------------------------------------------------------------------------

EVALUATOR_SYSTEM_PROMPT = """You are an expert ESL educator for Pakistani primary school students.

Your task: Evaluate the quality of English language questions for Grade {grade_level} students.

You will score each question on 5 dimensions (0-10 scale):

1. **Clarity (0-10)**: Is the question clear, unambiguous, and easy to understand?
   - 10: Perfectly clear, no possible confusion
   - 5-7: Mostly clear but has minor ambiguities
   - 0-4: Confusing, vague, or ambiguous

2. **Answer Validity (0-10)**: Is there EXACTLY ONE correct answer?
   - 10: One clear correct answer, all others definitely wrong
   - 5-7: Correct answer is clear but one distractor could be debatable
   - 0-4: Multiple answers could be correct, or correct answer is unclear

3. **Distractor Quality (0-10)**: Are the wrong options plausible but clearly incorrect?
   - 10: Distractors are believable but definitely wrong
   - 5-7: Some distractors are good, others too obvious
   - 0-4: Distractors are obviously wrong or too similar to correct answer

4. **Age-Appropriateness (0-10)**: Is this suitable for Grade {grade_level}?
   - 10: Perfect for this age (vocabulary, concepts, difficulty)
   - 5-7: Slightly too easy or too hard, but manageable
   - 0-4: Inappropriate (too abstract, too advanced, or too childish)

5. **Pedagogical Value (0-10)**: Does it test meaningful knowledge?
   - 10: Tests important concept or skill
   - 5-7: Tests something useful but not critical
   - 0-4: Tests trivial or unhelpful knowledge

**CRITICAL FAILURE CONDITIONS** (automatic FAIL, regardless of scores):
- Multiple answers could be correct
- Question asks for opinion rather than knowledge
- Requires context not provided in the question
- Uses abstract meta-concepts inappropriate for grade level (e.g., "identify the noun" for Grade 1-2)
- Distractors are all obviously wrong (different parts of speech, nonsensical)

**PASS THRESHOLD**:
- Overall score ≥ 6/10
- NO critical failures
- answer_validity ≥ 7/10 (must have ONE clear answer)
- age_appropriateness ≥ 6/10

Output format: JSON with all scores, pass_fail ("PASS" or "FAIL"), and feedback explaining your decision."""

EVALUATOR_USER_TEMPLATE = """Grade: {grade_level}
Topic: {topic}

Question:
{question_text}

Options:
{options_text}

Correct Answer: {correct_answer}

Evaluate this question and return your scores as JSON."""


# ---------------------------------------------------------------------------
# Main evaluator class
# ---------------------------------------------------------------------------

class QuestionQualityEvaluator:
    """LLM-powered question quality evaluator."""

    def __init__(self, model: str | None = None, timeout: float = 10.0):
        """
        Args:
            model: OpenAI model to use (defaults to settings.CHAT_MODEL)
            timeout: Timeout for LLM call in seconds
        """
        self.model = model or settings.CHAT_MODEL
        self.timeout = timeout
        self.llm = ChatOpenAI(
            model=self.model,
            temperature=0.3,  # Lower temperature for consistent evaluation
            openai_api_key=settings.OPENAI_API_KEY,
            timeout=self.timeout,
        ).with_structured_output(QuestionQualityScores)

    async def evaluate_question(
        self,
        question: dict,
        grade_level: int,
        topic: str = "General English",
    ) -> QualityEvaluation:
        """
        Evaluate a single question using the Evaluator Agent.

        Args:
            question: Question dict with task_type, question, options, correct_answer
            grade_level: Student grade level (1-6)
            topic: Topic being tested

        Returns:
            QualityEvaluation with scores and pass/fail decision
        """
        # Format question for evaluation
        question_text = self._format_question_text(question)
        options_text = self._format_options(question)
        correct_answer = question.get("correct_answer", "")

        # Build prompt
        prompt = ChatPromptTemplate.from_messages([
            ("system", EVALUATOR_SYSTEM_PROMPT),
            ("user", EVALUATOR_USER_TEMPLATE),
        ])

        chain = prompt | self.llm

        try:
            # Call LLM with timeout
            result: QuestionQualityScores = await asyncio.wait_for(
                chain.ainvoke({
                    "grade_level": grade_level,
                    "topic": topic,
                    "question_text": question_text,
                    "options_text": options_text,
                    "correct_answer": correct_answer,
                }),
                timeout=self.timeout,
            )

            # Normalize overall score to 0-1 range
            overall_score_normalized = result.overall_score / 10.0

            # Determine if valid based on pass_fail and scores
            is_valid = (
                result.pass_fail == "PASS" and
                result.overall_score >= 6 and
                result.answer_validity >= 7 and
                result.age_appropriateness >= 6
            )

            return QualityEvaluation(
                overall_score=overall_score_normalized,
                is_valid=is_valid,
                clarity=result.clarity,
                answer_validity=result.answer_validity,
                distractor_quality=result.distractor_quality,
                age_appropriateness=result.age_appropriateness,
                pedagogical_value=result.pedagogical_value,
                feedback=result.feedback,
            )

        except asyncio.TimeoutError:
            logger.error(f"Quality evaluation timeout for question: {question.get('id', '?')}")
            # Return conservative failing score on timeout
            return QualityEvaluation(
                overall_score=0.0,
                is_valid=False,
                clarity=0,
                answer_validity=0,
                distractor_quality=0,
                age_appropriateness=0,
                pedagogical_value=0,
                feedback="Evaluation timed out - rejecting for safety",
            )

        except Exception as exc:
            logger.error(f"Quality evaluation failed: {exc}", exc_info=True)
            # Return conservative failing score on error
            return QualityEvaluation(
                overall_score=0.0,
                is_valid=False,
                clarity=0,
                answer_validity=0,
                distractor_quality=0,
                age_appropriateness=0,
                pedagogical_value=0,
                feedback=f"Evaluation error: {str(exc)[:100]}",
            )

    async def evaluate_questions(
        self,
        questions: list[dict],
        grade_level: int,
        topic: str = "General English",
        max_concurrent: int = 3,
    ) -> tuple[list[dict], list[dict], list[QualityEvaluation]]:
        """
        Evaluate multiple questions concurrently.

        Args:
            questions: List of question dicts
            grade_level: Student grade level
            topic: Topic being tested
            max_concurrent: Maximum concurrent LLM calls

        Returns:
            (valid_questions, invalid_questions, all_evaluations)
        """
        # Create semaphore to limit concurrent LLM calls
        semaphore = asyncio.Semaphore(max_concurrent)

        async def evaluate_with_semaphore(q: dict) -> tuple[dict, QualityEvaluation]:
            async with semaphore:
                evaluation = await self.evaluate_question(q, grade_level, topic)
                return q, evaluation

        # Evaluate all questions concurrently (respecting semaphore)
        results = await asyncio.gather(
            *[evaluate_with_semaphore(q) for q in questions],
            return_exceptions=True,
        )

        # Separate valid and invalid
        valid: list[dict] = []
        invalid: list[dict] = []
        evaluations: list[QualityEvaluation] = []

        for result in results:
            if isinstance(result, Exception):
                logger.error(f"Question evaluation failed: {result}")
                continue

            q, evaluation = result
            evaluations.append(evaluation)

            if evaluation.is_valid:
                valid.append(q)
            else:
                invalid.append(q)

                # Log rejection
                qid = q.get("id", "?")
                question_text = q.get("question", "")[:60]
                logger.warning(
                    f"Evaluator rejected Q{qid}: {question_text}... "
                    f"Score: {evaluation.overall_score:.2f}, "
                    f"Reason: {evaluation.feedback[:100]}"
                )

        logger.info(
            f"Evaluator validation: {len(valid)}/{len(questions)} questions passed "
            f"({len(invalid)} rejected, avg score: {sum(e.overall_score for e in evaluations) / len(evaluations):.2f})"
        )

        return valid, invalid, evaluations

    def _format_question_text(self, question: dict) -> str:
        """Format question text for evaluation."""
        task_type = question.get("task_type", "")
        q_text = question.get("question", "")

        # Include additional context for specific task types
        if task_type == "passage_true_false" and question.get("passage"):
            return f"Passage: {question['passage']}\n\nQuestion: {q_text}"
        elif task_type in ("fill_blank_word_bank", "sentence_scramble"):
            if question.get("word_bank"):
                return f"{q_text}\n\nWord bank: {', '.join(question['word_bank'])}"
        elif task_type == "missing_letter" and question.get("word_with_blanks"):
            return f"{q_text}\n\nWord: {question['word_with_blanks']}"
        elif task_type in ("listen_and_choose", "simon_says", "repeat_after_me") and question.get("audio_text"):
            return f"{q_text}\n\nAudio: {question['audio_text']}"

        return q_text

    def _format_options(self, question: dict) -> str:
        """Format options for evaluation."""
        task_type = question.get("task_type", "")

        # Get options from appropriate field
        if task_type in ("sentence_picture_match", "listen_and_choose"):
            options = question.get("image_options", [])
        else:
            options = question.get("options", [])

        if not options:
            return "No options (open-ended or fill-in question)"

        # Format as numbered list
        option_lines = []
        for opt in options:
            opt_id = opt.get("id", "")
            opt_text = opt.get("text", "")
            opt_emoji = opt.get("emoji", "")

            if opt_emoji:
                option_lines.append(f"  {opt_id}) {opt_text} {opt_emoji}")
            else:
                option_lines.append(f"  {opt_id}) {opt_text}")

        return "\n".join(option_lines)


# ---------------------------------------------------------------------------
# Convenience function
# ---------------------------------------------------------------------------

async def evaluate_question_quality(
    question: dict,
    grade_level: int,
    topic: str = "General English",
) -> tuple[bool, float, str]:
    """
    Quick evaluation interface - returns (is_valid, score, feedback).

    Args:
        question: Question dict to evaluate
        grade_level: Student grade level
        topic: Topic being tested

    Returns:
        (is_valid, overall_score, feedback)
    """
    evaluator = QuestionQualityEvaluator()
    evaluation = await evaluator.evaluate_question(question, grade_level, topic)

    return evaluation.is_valid, evaluation.overall_score, evaluation.feedback
