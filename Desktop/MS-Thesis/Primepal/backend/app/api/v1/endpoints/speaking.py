"""
Feature: Speaking Practice (Student-side voice-based conversation)
With word-level pronunciation feedback via Whisper + phoneme analysis.

Endpoints (all require student JWT):
  GET  /api/v1/speaking/prompts      — Generate 3 speaking prompts for the week topic
  POST /api/v1/speaking/evaluate     — Evaluate student's spoken response (transcript + feedback)
  POST /api/v1/speaking/evaluate-pro — Evaluate with word-level pronunciation data (audio file required)
"""

import asyncio
import json
import logging
from difflib import SequenceMatcher
from io import BytesIO
from openai import AsyncOpenAI
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status, UploadFile, File
from pydantic import BaseModel

from app.core.config import settings
from app.core.security import get_current_student
from app.core.supabase_client import get_supabase_admin
from app.core.cache import cache_get, cache_set, make_cache_key, debounced_invalidate
from app.api.v1.endpoints.rewards import invalidate_rewards_cache
from app.api.v1.endpoints.student_scores import invalidate_scores_cache
from app.utils.pronunciation import compare_phrases, calculate_pronunciation_score
from app.utils.streak import update_streak
from app.agents.evaluator_agent.interaction_logger import log_interaction

logger = logging.getLogger(__name__)
router = APIRouter()

client = AsyncOpenAI(
    api_key=settings.OPENAI_API_KEY,
    timeout=10.0,  # 10-second timeout for all OpenAI calls
)

# Whisper prompt to prime for Pakistani English accent patterns
WHISPER_ACCENT_PROMPT = (
    "Pakistani English accent. Common words: hello, thank you, please, "
    "excuse me, water, school, teacher, mother, father."
)

# Garbled-input thresholds
_GARBLED_SIMILARITY_THRESHOLD = 0.30
_GARBLED_MIN_CHARS = 3
_MAX_ATTEMPTS = 3

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
    attempt_number: int = 1


class EvaluateFeedback(BaseModel):
    score: int
    feedback: str
    points_awarded: int
    new_total: int
    status: str = "final"  # "final" | "retry" | "give_up"


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
    status: str = "final"  # "final" | "retry" | "give_up"
    noise_flagged: bool = False


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

    classroom_resp, syllabus_resp = await asyncio.gather(
        asyncio.to_thread(
            lambda: supabase.table("classrooms")
            .select("grade_level")
            .eq("id", classroom_id)
            .maybe_single()
            .execute()
        ),
        asyncio.to_thread(
            lambda: supabase.table("classroom_syllabus")
            .select("topic_title, week_number")
            .eq("classroom_id", classroom_id)
            .eq("status", "active")
            .order("week_number")
            .limit(1)
            .maybe_single()
            .execute()
        ),
    )

    if not classroom_resp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Classroom not found",
        )
    grade_level: int = classroom_resp.data["grade_level"]

    if not syllabus_resp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active week found in pacing calendar",
        )

    topic_title: str = syllabus_resp.data["topic_title"]
    week_number: int = syllabus_resp.data["week_number"]

    # ------------------------------------------------------------------
    # Check cache first (1 hour TTL)
    # ------------------------------------------------------------------
    cache_key = make_cache_key("speaking_prompts", classroom_id, topic_title, str(grade_level))
    cached = await cache_get(cache_key)
    if cached:
        logger.info(f"Cache hit for speaking prompts: {cache_key}")
        return PromptsResponse(**cached)

    # ------------------------------------------------------------------
    # Generate prompts via LLM (with 12s timeout)
    # ------------------------------------------------------------------
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
        # 12-second timeout for LLM call (consistent with missions endpoints)
        response = await asyncio.wait_for(
            client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
                max_tokens=400,
            ),
            timeout=12.0,
        )

        response_text = response.choices[0].message.content.strip()

        # C2: Line-based markdown stripping (replaces fragile split("```"))
        from app.utils.markdown_parser import strip_markdown_code_block
        response_text = strip_markdown_code_block(response_text)

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

    except asyncio.TimeoutError:
        logger.error(f"Speaking prompt generation timeout (12s) for topic: {topic_title}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Prompt generation timed out. Please try again.",
        )
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

    response = PromptsResponse(
        prompts=prompts,
        topic=topic_title,
        week_number=week_number,
    )

    # Cache for 24 hours (same topic/grade will get same prompts)
    await cache_set(cache_key, response.model_dump(), ttl=86400)

    return response


# ---------------------------------------------------------------------------
# POST /evaluate
# ---------------------------------------------------------------------------

@router.post("/evaluate", response_model=EvaluateFeedback)
async def evaluate_response(
    request: EvaluateRequest,
    background_tasks: BackgroundTasks,
    student: dict = Depends(get_current_student),
):
    """
    Evaluate a student's spoken response. Awards points based on relevance and quality.
    Score 0 = no/off-topic (0 pts), 1 = partial (5 pts), 2 = on-topic & good vocab (10 pts).
    """
    supabase = get_supabase_admin()
    student_id: str = student["sub"]
    classroom_id: str = student["classroom_id"]

    # Fetch student points + grade level upfront in parallel (needed for all paths)
    student_resp, classroom_resp = await asyncio.gather(
        asyncio.to_thread(
            lambda: supabase.table("students")
            .select("points")
            .eq("id", student_id)
            .maybe_single()
            .execute()
        ),
        asyncio.to_thread(
            lambda: supabase.table("classrooms")
            .select("grade_level")
            .eq("id", classroom_id)
            .maybe_single()
            .execute()
        ),
    )

    if not student_resp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found",
        )

    current_points = student_resp.data.get("points") or 0
    grade_level = classroom_resp.data["grade_level"] if classroom_resp.data else 0

    # ---- Garbled / empty input detection ----
    transcript_text = (request.transcript or "").strip()
    is_empty = not transcript_text or len(transcript_text) < _GARBLED_MIN_CHARS

    if not is_empty:
        similarity = SequenceMatcher(
            None,
            request.prompt_text.lower().strip(),
            transcript_text.lower(),
        ).ratio()
        is_garbled = similarity < _GARBLED_SIMILARITY_THRESHOLD
    else:
        is_garbled = True

    if is_empty or is_garbled:
        if request.attempt_number >= _MAX_ATTEMPTS:
            return EvaluateFeedback(
                score=0,
                feedback="No worries! Let's try the next one. \U0001f60a",
                points_awarded=0,
                new_total=current_points,
                status="give_up",
            )
        return EvaluateFeedback(
            score=-1,
            feedback="I couldn't hear you clearly — let's try again! \U0001f3a4",
            points_awarded=0,
            new_total=current_points,
            status="retry",
        )

    # Template-based evaluation (replaces LLM call for cost optimization)
    from difflib import SequenceMatcher
    transcript_lower = (request.transcript or "").lower().strip()
    prompt_lower = (request.prompt_text or "").lower().strip()
    similarity = SequenceMatcher(None, prompt_lower, transcript_lower).ratio()

    if similarity >= 0.6:
        score = 2
        feedback = "Great job! You spoke clearly and used the right words! 🌟"
    elif similarity >= 0.3 or len(transcript_lower) > 5:
        score = 1
        feedback = "Good try! Keep practising and you'll get even better! 💪"
    else:
        score = 0
        feedback = "Let's try that again — listen carefully and speak slowly! 🎤"

    points_awarded = {0: 0, 1: 5, 2: 10}.get(score, 0)

    if points_awarded > 0:
        rpc_result = supabase.rpc("increment_student_points", {
            "p_student_id": student_id,
            "p_points": points_awarded,
        }).execute()
        result_data = rpc_result.data[0] if rpc_result.data else {}
        new_total = result_data.get("new_points", current_points + points_awarded)
    else:
        new_total = current_points

    background_tasks.add_task(
        log_interaction,
        student_id=student_id,
        classroom_id=classroom_id,
        grade_level=grade_level,
        interaction_type="speaking_practice",
        original_message=request.transcript,
        correct=score > 0,
        context_used=False,
        pillar="speaking",
        score=points_awarded,
    )

    await update_streak(student_id)

    background_tasks.add_task(
        debounced_invalidate,
        student_id,
        [invalidate_rewards_cache, invalidate_scores_cache],
    )

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
    attempt_number: int = 1


@router.post("/evaluate-pro", response_model=EvaluatePronunciationFeedback)
async def evaluate_pronunciation(
    request: EvaluateProRequest,
    background_tasks: BackgroundTasks,
    audio_file: UploadFile = File(...),
    student: dict = Depends(get_current_student),
):
    """
    Evaluate student's pronunciation with word-level feedback.
    """
    supabase = get_supabase_admin()
    student_id: str = student["sub"]
    classroom_id: str = student["classroom_id"]

    # Fetch student points + grade level in parallel with audio transcription
    async def fetch_student_data():
        return await asyncio.gather(
            asyncio.to_thread(
                lambda: supabase.table("students")
                .select("points")
                .eq("id", student_id)
                .maybe_single()
                .execute()
            ),
            asyncio.to_thread(
                lambda: supabase.table("classrooms")
                .select("grade_level")
                .eq("id", classroom_id)
                .maybe_single()
                .execute()
            ),
        )

    async def transcribe_audio():
        audio_bytes = await audio_file.read()
        audio_file_obj = BytesIO(audio_bytes)
        audio_file_obj.name = "audio.webm"
        return await client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file_obj,
            response_format="verbose_json",
            timestamp_granularities=["word"],
            language="en",
            prompt=WHISPER_ACCENT_PROMPT,
        )

    try:
        # 15-second timeout for Whisper transcription (audio processing can be slower)
        (student_resp, classroom_resp), transcript_response = await asyncio.wait_for(
            asyncio.gather(
                fetch_student_data(), transcribe_audio()
            ),
            timeout=15.0,
        )
    except asyncio.TimeoutError:
        logger.error("Whisper transcription timeout (15s)")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Audio transcription timed out. Please try again.",
        )
    except Exception as exc:
        logger.error(f"Failed to transcribe audio or fetch data: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process audio",
        )

    if not student_resp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found",
        )

    current_points = student_resp.data.get("points") or 0
    grade_level = classroom_resp.data["grade_level"] if classroom_resp.data else 0

    whisper_text: str = (transcript_response.text or "").strip()
    whisper_words_raw = transcript_response.words or []
    spoken_words = [w.word.lower() for w in whisper_words_raw if w.word]

    if not spoken_words and whisper_text:
        spoken_words = whisper_text.lower().split()

    logger.info(f"Whisper transcribed {len(spoken_words)} words: {spoken_words}")

    # ------------------------------------------------------------------
    # Step 2: Compare target phrase against spoken words
    # ------------------------------------------------------------------
    target_phrase = request.prompt_text.strip()
    pronunciation_data_list = compare_phrases(
        target_phrase=target_phrase,
        spoken_words=spoken_words,
        threshold=0.75,
    )
    pronunciation_score = calculate_pronunciation_score(pronunciation_data_list)

    noise_flagged = False
    all_wrong = all(p["status"] != "correct" for p in pronunciation_data_list) if pronunciation_data_list else True

    if pronunciation_score < 20 and len(spoken_words) < 2:
        if request.attempt_number >= _MAX_ATTEMPTS:
            return EvaluatePronunciationFeedback(
                score=0,
                feedback="No worries! Let's try the next one. \U0001f60a",
                pronunciation_score=pronunciation_score,
                pronunciation_data=[PronunciationWordData(**p) for p in pronunciation_data_list],
                points_awarded=0,
                new_total=current_points,
                status="give_up",
                noise_flagged=False,
            )
        return EvaluatePronunciationFeedback(
            score=-1,
            feedback="I couldn't hear you clearly — let's try again! \U0001f3a4",
            pronunciation_score=pronunciation_score,
            pronunciation_data=[PronunciationWordData(**p) for p in pronunciation_data_list],
            points_awarded=0,
            new_total=current_points,
            status="retry",
            noise_flagged=False,
        )

    if all_wrong and spoken_words:
        noise_flagged = True

    overall_correct = pronunciation_score >= 70

    logger.info(f"Pronunciation score: {pronunciation_score}%, overall correct: {overall_correct}")

    # ------------------------------------------------------------------
    # Step 3: Template-based feedback (replaces LLM call for cost optimization)
    # ------------------------------------------------------------------
    incorrect_words = [p["word"] for p in pronunciation_data_list if p["status"] != "correct"]

    if pronunciation_score >= 90:
        feedback = "Amazing pronunciation! You said every word perfectly! 🌟"
    elif pronunciation_score >= 70:
        feedback = "Great job! Your pronunciation is really good! Keep it up! 🎉"
    elif pronunciation_score >= 50:
        if incorrect_words:
            words_hint = ", ".join(incorrect_words[:3])
            feedback = f"Good try! Practise saying: {words_hint}. You're getting closer! 💪"
        else:
            feedback = "Good effort! Keep practising and you'll get even better! 💪"
    else:
        if incorrect_words:
            words_hint = ", ".join(incorrect_words[:2])
            feedback = f"Let's practise! Try saying \"{words_hint}\" slowly. You can do it! 🎤"
        else:
            feedback = "Let's try again — speak slowly and clearly! You've got this! 🎤"

    if noise_flagged:
        feedback += " Try moving to a quieter spot! 🤫"

    # ------------------------------------------------------------------
    # Step 4: Calculate points and update atomically
    # ------------------------------------------------------------------
    points_awarded = 10 if overall_correct else 5 if pronunciation_score >= 50 else 0

    if points_awarded > 0:
        rpc_result = supabase.rpc("increment_student_points", {
            "p_student_id": student_id,
            "p_points": points_awarded,
        }).execute()
        result_data = rpc_result.data[0] if rpc_result.data else {}
        new_total = result_data.get("new_points", current_points + points_awarded)
    else:
        new_total = current_points

    def _log_pro_interaction():
        try:
            sb = get_supabase_admin()
            sb.table("student_interactions").insert({
                "student_id": student_id,
                "classroom_id": classroom_id,
                "grade_level": grade_level,
                "interaction_type": "speaking_practice",
                "original_message": whisper_text,
                "correct": overall_correct,
                "context_used": False,
                "pillar": "speaking",
                "pronunciation_data": pronunciation_data_list,
                "noise_flagged": noise_flagged,
                "score": points_awarded,
            }).execute()
        except Exception:
            pass

    background_tasks.add_task(_log_pro_interaction)

    await update_streak(student_id)

    background_tasks.add_task(
        debounced_invalidate,
        student_id,
        [invalidate_rewards_cache, invalidate_scores_cache],
    )

    return EvaluatePronunciationFeedback(
        score=2 if overall_correct else (1 if pronunciation_score >= 50 else 0),
        feedback=feedback,
        pronunciation_score=pronunciation_score,
        pronunciation_data=[PronunciationWordData(**p) for p in pronunciation_data_list],
        points_awarded=points_awarded,
        new_total=new_total,
        status="final",
        noise_flagged=noise_flagged,
    )
