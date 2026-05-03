"""
Feature 5 + Feature 7: The Guardrailed Bilingual Tutor — /api/v1/chat

Flow:
  POST /api/v1/chat
    ↓  Authenticate student (custom JWT → student_id, classroom_id)
    ↓  Resolve classroom → grade_level  (the guardrail key)
    ↓  Translate student message to English via gpt-4o-mini  (Feature 7)
    ↓  Embed translated query → vector search snc_knowledge_base filtered by grade_level
    ↓  LLM (gpt-4o) + SNC context + bilingual system prompt → TutorResponse
    ↓  Return bilingual_reply + english_reply

The grade_level filter is resolved server-side from the student's JWT and
classroom record — the frontend never sends or controls the grade.
"""
import json

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.core.security import get_current_student
from app.core.supabase_client import get_supabase_admin
from app.agents.tutor_agent.chatbot import (
    translate_to_english,
    retrieve_grade_filtered_chunks,
    get_guardrailed_response,
    stream_guardrailed_response,
)
from app.agents.evaluator_agent.interaction_logger import log_interaction

router = APIRouter()


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000)


class ChatResponse(BaseModel):
    reply: str            # bilingual Minglish reply (shown by default)
    english_reply: str    # pure English reply (shown when student toggles)
    grade_level: int
    context_used: bool    # True when SNC chunks were found for this grade
    translated_query: str  # the English translation of the student's query


@router.post("", response_model=ChatResponse, summary="Guardrailed bilingual student chat")
async def chat(
    body: ChatRequest,
    background_tasks: BackgroundTasks,
    student: dict = Depends(get_current_student),
):
    """
    Send a student message and receive a grade-appropriate, SNC-grounded bilingual reply.

    Authentication: student JWT (Bearer token from localStorage 'primepal_student_token').
    The grade_level is resolved from the classroom record — the client cannot override it.

    Returns both a Minglish code-switching reply (bilingual default) and a pure
    English reply that the frontend can display when the student toggles language mode.
    """
    classroom_id: str = student["classroom_id"]
    supabase = get_supabase_admin()

    # ------------------------------------------------------------------
    # Step 1: Resolve grade_level — this is the hard guardrail
    # ------------------------------------------------------------------
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
            detail="Classroom not found for this student",
        )
    grade_level: int = classroom_resp.data["grade_level"]

    # ------------------------------------------------------------------
    # Step 2 (NEW): Translate query to English for accurate vector search
    # ------------------------------------------------------------------
    translated_query = await translate_to_english(body.message)

    # ------------------------------------------------------------------
    # Step 3: Retrieve grade-filtered SNC context via pgvector RPC
    # ------------------------------------------------------------------
    context_chunks = await retrieve_grade_filtered_chunks(
        query=translated_query,
        grade_level=grade_level,
        supabase_admin_client=supabase,
    )

    # ------------------------------------------------------------------
    # Step 4: Generate guardrailed bilingual LLM response
    # ------------------------------------------------------------------
    tutor_response = await get_guardrailed_response(
        original_message=body.message,
        translated_message=translated_query,
        grade_level=grade_level,
        context_chunks=context_chunks,
    )

    background_tasks.add_task(
        log_interaction,
        student_id=student["sub"],
        classroom_id=classroom_id,
        grade_level=grade_level,
        interaction_type="chat",
        original_message=body.message,
        translated_message=translated_query,
        correct=None,
        context_used=len(context_chunks) > 0,
    )

    return ChatResponse(
        reply=tutor_response.bilingual_reply,
        english_reply=tutor_response.english_reply,
        grade_level=grade_level,
        context_used=len(context_chunks) > 0,
        translated_query=translated_query,
    )


@router.post("/stream", summary="Streaming guardrailed bilingual student chat (SSE)")
async def chat_stream(
    body: ChatRequest,
    student: dict = Depends(get_current_student),
):
    """
    Stream a grade-appropriate, SNC-grounded bilingual reply token by token.

    Authentication: student JWT (Bearer token from localStorage 'primepal_student_token').
    Returns a text/event-stream response with SSE events:
      - {"type": "status", "content": "Thinking..."}
      - {"type": "token", "content": "<token>"}  (repeated)
      - {"type": "done"}
    """
    classroom_id: str = student["classroom_id"]
    supabase = get_supabase_admin()

    # Resolve grade_level — hard guardrail
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
            detail="Classroom not found for this student",
        )
    grade_level: int = classroom_resp.data["grade_level"]

    translated_query = await translate_to_english(body.message)
    context_chunks = await retrieve_grade_filtered_chunks(
        query=translated_query,
        grade_level=grade_level,
        supabase_admin_client=supabase,
    )

    async def event_stream():
        yield f"data: {json.dumps({'type': 'status', 'content': 'Thinking...'})}\n\n"

        async for token in stream_guardrailed_response(
            translated_query, context_chunks, grade_level
        ):
            yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"

        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
