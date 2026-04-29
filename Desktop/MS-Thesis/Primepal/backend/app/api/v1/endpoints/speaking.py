"""
Feature: Speaking Practice (Student-side voice-based conversation)
With word-level pronunciation feedback via Whisper + phoneme analysis.

Endpoints (all require student JWT):
  GET  /api/v1/speaking/prompts      — Generate 3 speaking prompts for the week topic
  POST /api/v1/speaking/evaluate     — Evaluate student's spoken response (transcript + feedback)
  POST /api/v1/speaking/evaluate-pro — Evaluate with word-level pronunciation data (audio file required)
"""

import json
import logging
from io import BytesIO
from openai import AsyncOpenAI
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from pydantic import BaseModel

from app.core.config import settings
from app.core.security import get_current_student
from app.core.supabase_client import get_supabase_admin
from app.utils.pronunciation import compare_phrases, calculate_pronunciation_score

logger = logging.getLogger(__name__)
router = APIRouter()

client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

# ---------------------------------------------------------------------------
# Response Schemas
# ---------------------------------------------------------------------------

class SpeakingPrompt(BaseModel):
    id: int
    prompt: str
    hint: str


class PromptsResponse(BaseModel):
    prompts: list[SpeakingPrompt]
    topic: str
    week_number: int


class EvaluateRequest(BaseModel):
    prompt_id: int
    prompt_text: str
    transcript: str


class EvaluateFeedback(BaseModel):
    score: int
    feedback: str
    points_awarded: int
    new_total: int


class PronunciationWordData(BaseModel):
    """Word-level pronunciation assessment."""
    word: str
    status: str  # "correct" | "incorrect" | "omitted"


class EvaluatePronunciationFeedback(BaseModel):
    """Enhanced response with word-level pronunciation data."""
    score: int
    feedback: str
    pronunciation_score: int  # 0-100 based on word accuracy
    pronunciation_data: list[PronunciationWordData]
    points_awarded: int
    new_total: int


# ---------------------------------------------------------------------------
# GET /prompts
# ---------------------------------------------------------------------------

@router.get("/prompts", response_model=PromptsResponse)
async def get_prompts(student: dict = Depends(get_current_student)):
    """
    Generate 3 speaking prompts based on the active week's topic.
    """
    supabase = get_supabase_admin()
    classroom_id: str = student["classroom_id"]

    classroom_resp = (
        supabase.table("classrooms")
        .select("grade_level")
        .eq("id", classroom_id)
        .maybe_single()
        .execute()
    )
    if not classroom_resp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Classroom not found",
        )
    grade_level: int = classroom_resp.data["grade_level"]

    syllabus_resp = (
        supabase.table("classroom_syllabus")
        .select("topic_title, week_number")
        .eq("classroom_id", classroom_id)
        .eq("status", "active")
        .order("week_number")
        .limit(1)
        .maybe_single()
        .execute()
    )
    if not syllabus_resp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active week found in pacing calendar",
        )

    topic_title: str = syllabus_resp.data["topic_title"]
    week_number: int = syllabus_resp.data["week_number"]

    prompt = f"""Generate 3 simple speaking prompts for Grade {grade_level} Pakistani primary school students studying English.
Topic: {topic_title}

Prompts should ask students to describe, name, or talk about something related to the topic.
Each prompt should have a short hint (a tip for what to say).

Return ONLY valid JSON (no markdown):
[
  {{"id": 1, "prompt": "...", "hint": "..."}},
  {{"id": 2, "prompt": "...", "hint": "..."}},
  {{"id": 3, "prompt": "...", "hint": "..."}}
]
"""

    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=400,
        )

        response_text = response.choices[0].message.content.strip()

        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]

        data = json.loads(response_text)

        if not isinstance(data, list) or len(data) != 3:
            raise ValueError("Expected exactly 3 prompts")

        prompts: list[SpeakingPrompt] = []
        for item in data:
            if not isinstance(item, dict) or "prompt" not in item or "hint" not in item:
                raise ValueError("Each prompt must have 'prompt' and 'hint' fields")
            prompts.append(SpeakingPrompt(
                id=len(prompts) + 1,
                prompt=item["prompt"],
                hint=item["hint"],
            ))

    except json.JSONDecodeError as exc:
        logger.error(f"Failed to parse LLM response for prompts: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate prompts",
        )
    except Exception as exc:
        logger.error(f"Failed to generate prompts: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate prompts",
        )

    return PromptsResponse(
        prompts=prompts,
        topic=topic_title,
        week_number=week_number,
    )


# ---------------------------------------------------------------------------
# POST /evaluate
# ---------------------------------------------------------------------------

@router.post("/evaluate", response_model=EvaluateFeedback)
async def evaluate_response(
    request: EvaluateRequest,
    student: dict = Depends(get_current_student),
):
    """
    Evaluate a student's spoken response. Awards points based on relevance and quality.
    Score 0 = no/off-topic (0 pts), 1 = partial (5 pts), 2 = on-topic & good vocab (10 pts).
    """
    supabase = get_supabase_admin()
    student_id: str = student["sub"]
    classroom_id: str = student["classroom_id"]

    # If transcript is empty, automatic 0
    if not request.transcript or not request.transcript.strip():
        return EvaluateFeedback(
            score=0,
            feedback="It looks like nothing was recorded. Try again!",
            points_awarded=0,
            new_total=(
                supabase.table("students")
                .select("points")
                .eq("id", student_id)
                .maybe_single()
                .execute()
            ).data.get("points") if (
                supabase.table("students")
                .select("points")
                .eq("id", student_id)
                .maybe_single()
                .execute()
            ).data else 0,
        )

    # Fetch grade level for evaluation context
    classroom_resp = (
        supabase.table("classrooms")
        .select("grade_level")
        .eq("id", classroom_id)
        .maybe_single()
        .execute()
    )
    grade_level = classroom_resp.data["grade_level"] if classroom_resp.data else 0

    # Evaluate via LLM
    eval_prompt = f"""A Grade {grade_level} student was asked: "{request.prompt_text}"
They said: "{request.transcript}"

Score their response on a scale of 0-2:
  2 = on-topic and uses relevant vocabulary
  1 = partially on-topic or very short
  0 = off-topic or empty

Return ONLY valid JSON:
{{"score": 2, "feedback": "Great job! You used good words about the topic."}}

Keep the feedback encouraging, short (1-2 sentences), and suitable for a young child."""

    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": eval_prompt}],
            temperature=0.5,
            max_tokens=200,
        )

        response_text = response.choices[0].message.content.strip()

        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]

        eval_data = json.loads(response_text)
        score: int = eval_data.get("score", 0)
        feedback: str = eval_data.get("feedback", "Thanks for trying!")

        # Clamp score to valid range
        if not isinstance(score, int) or score < 0 or score > 2:
            score = 0

    except Exception as exc:
        logger.error(f"Failed to evaluate response: {exc}")
        # If LLM fails, treat as incomplete (score 0)
        score = 0
        feedback = "We couldn't evaluate that. Try again!"

    # Map score to points: 0->0, 1->5, 2->10
    points_awarded = {0: 0, 1: 5, 2: 10}.get(score, 0)

    # Fetch current points and update
    student_resp = (
        supabase.table("students")
        .select("points")
        .eq("id", student_id)
        .maybe_single()
        .execute()
    )
    if not student_resp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found",
        )

    current_points = student_resp.data.get("points") or 0
    new_total = current_points + points_awarded

    update_resp = (
        supabase.table("students")
        .update({"points": new_total})
        .eq("id", student_id)
        .execute()
    )
    if not update_resp.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update points",
        )

    # Log interaction
    try:
        supabase.table("student_interactions").insert({
            "student_id": student_id,
            "classroom_id": classroom_id,
            "grade_level": grade_level,
            "interaction_type": "speaking_practice",
            "original_message": request.transcript,
            "correct": score > 0,
            "context_used": False,
            "pillar": "speaking",
        }).execute()
    except Exception as exc:
        logger.warning(f"Failed to log speaking interaction: {exc}")

    return EvaluateFeedback(
        score=score,
        feedback=feedback,
        points_awarded=points_awarded,
        new_total=new_total,
    )


# ---------------------------------------------------------------------------
# POST /evaluate-pro (Word-Level Pronunciation)
# ---------------------------------------------------------------------------

class EvaluateProRequest(BaseModel):
    prompt_id: int
    prompt_text: str


@router.post("/evaluate-pro", response_model=EvaluatePronunciationFeedback)
async def evaluate_pronunciation(
    request: EvaluateProRequest,
    audio_file: UploadFile = File(...),
    student: dict = Depends(get_current_student),
):
    """
    Evaluate student's pronunciation with word-level feedback.

    1. Transcribe audio using Whisper API with word-level granularity
    2. Compare words against target prompt using diffing algorithm
    3. Return word-by-word assessment (correct/incorrect/omitted)
    4. Award points based on pronunciation score (0-100 word accuracy)
    5. Store pronunciation_data in database for analytics/reporting

    Response includes:
    - pronunciation_data: [{word: "I", status: "correct"}, ...]
    - pronunciation_score: 0-100 based on word-level accuracy
    """
    supabase = get_supabase_admin()
    student_id: str = student["sub"]
    classroom_id: str = student["classroom_id"]

    # ------------------------------------------------------------------
    # Step 1: Transcribe audio using Whisper with word-level timestamps
    # ------------------------------------------------------------------
    try:
        audio_bytes = await audio_file.read()
        audio_file_obj = BytesIO(audio_bytes)
        audio_file_obj.name = "audio.webm"

        # Key parameters for word-level granularity:
        # - response_format="verbose_json" returns detailed response structure
        # - timestamp_granularities=["word"] extracts word-level timing
        transcript_response = await client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file_obj,
            response_format="verbose_json",
            timestamp_granularities=["word"],
            language="en",
        )

        # Extract words from Whisper's verbose response
        # Structure: {text: "...", words: [{word: "I", start: 0.5, end: 0.8}, ...]}
        whisper_text: str = transcript_response.get("text", "").strip()
        whisper_words_raw = transcript_response.get("words", [])
        spoken_words = [w.get("word", "").lower() for w in whisper_words_raw if w.get("word")]

        if not spoken_words and whisper_text:
            # Fallback: if no word-level data, split text
            spoken_words = whisper_text.lower().split()

        logger.info(f"Whisper transcribed {len(spoken_words)} words: {spoken_words}")

    except Exception as exc:
        logger.error(f"Failed to transcribe audio: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process audio",
        )

    # ------------------------------------------------------------------
    # Step 2: Compare target phrase against spoken words
    # ------------------------------------------------------------------
    target_phrase = request.prompt_text.strip()
    pronunciation_data_list = compare_phrases(
        target_phrase=target_phrase,
        spoken_words=spoken_words,
        threshold=0.75,  # 75% similarity threshold for "correct"
    )
    pronunciation_score = calculate_pronunciation_score(pronunciation_data_list)

    # Overall correctness: mark as correct if pronunciation_score >= 70
    overall_correct = pronunciation_score >= 70

    logger.info(f"Pronunciation score: {pronunciation_score}%, overall correct: {overall_correct}")

    # ------------------------------------------------------------------
    # Step 3: Generate AI feedback based on pronunciation results
    # ------------------------------------------------------------------
    incorrect_words = [p["word"] for p in pronunciation_data_list if p["status"] != "correct"]

    feedback_prompt = f"""A Grade student was asked: "{request.prompt_text}"
They said: "{whisper_text}"

Word-level results:
- Correct words: {len([p for p in pronunciation_data_list if p['status'] == 'correct'])}/{len(pronunciation_data_list)}
- Mispronounced: {', '.join(incorrect_words) if incorrect_words else 'None'}

Pronunciation score: {pronunciation_score}%

Generate SHORT, encouraging feedback (1-2 sentences max). If score >= 70, congratulate them.
If < 70, gently point out which word(s) to practice. Make it suitable for young children."""

    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": feedback_prompt}],
            temperature=0.5,
            max_tokens=150,
        )
        feedback: str = response.choices[0].message.content.strip()
    except Exception as exc:
        logger.error(f"Failed to generate feedback: {exc}")
        feedback = "Great attempt! Keep practicing!" if overall_correct else "Keep practicing, you're getting closer!"

    # ------------------------------------------------------------------
    # Step 4: Calculate points and update student total
    # ------------------------------------------------------------------
    points_awarded = 10 if overall_correct else 5 if pronunciation_score >= 50 else 0

    student_resp = (
        supabase.table("students")
        .select("points")
        .eq("id", student_id)
        .maybe_single()
        .execute()
    )
    if not student_resp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found",
        )

    current_points = student_resp.data.get("points") or 0
    new_total = current_points + points_awarded

    update_resp = (
        supabase.table("students")
        .update({"points": new_total})
        .eq("id", student_id)
        .execute()
    )
    if not update_resp.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update points",
        )

    # ------------------------------------------------------------------
    # Step 5: Log interaction with pronunciation_data
    # ------------------------------------------------------------------
    try:
        classroom_resp = (
            supabase.table("classrooms")
            .select("grade_level")
            .eq("id", classroom_id)
            .maybe_single()
            .execute()
        )
        grade_level = classroom_resp.data["grade_level"] if classroom_resp.data else 0

        supabase.table("student_interactions").insert({
            "student_id": student_id,
            "classroom_id": classroom_id,
            "grade_level": grade_level,
            "interaction_type": "speaking_practice",
            "original_message": whisper_text,
            "correct": overall_correct,
            "context_used": False,
            "pillar": "speaking",
            "pronunciation_data": pronunciation_data_list,  # Store word-level data
        }).execute()
    except Exception as exc:
        logger.warning(f"Failed to log speaking interaction: {exc}")

    return EvaluatePronunciationFeedback(
        score=2 if overall_correct else (1 if pronunciation_score >= 50 else 0),
        feedback=feedback,
        pronunciation_score=pronunciation_score,
        pronunciation_data=[PronunciationWordData(**p) for p in pronunciation_data_list],
        points_awarded=points_awarded,
        new_total=new_total,
    )
