"""
Feature 5 + Feature 7: The Guardrailed Adaptive Tutor — /api/v1/chat

Flow:
  POST /api/v1/chat
    ↓  Authenticate student (custom JWT → student_id, classroom_id)
    ↓  Resolve classroom → grade_level  (the guardrail key)
    ↓  Translate student message to English via gpt-4o-mini  (Feature 7)
    ↓  Embed translated query → vector search snc_knowledge_base filtered by grade_level
    ↓  LLM + SNC context + adaptive system prompt → TutorResponse
    ↓  Return a single adaptive reply (bilingual or English based on student input)

The grade_level filter is resolved server-side from the student's JWT and
classroom record — the frontend never sends or controls the grade.
"""
import asyncio
import json

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.core.security import get_current_student
from app.core.supabase_client import get_supabase_admin
from app.agents.tutor_agent.chatbot import (
    translate_to_english,
    translate_to_urdu,
    retrieve_grade_filtered_chunks,
    get_guardrailed_response,
    stream_guardrailed_response,
)
from app.agents.evaluator_agent.interaction_logger import log_interaction

router = APIRouter()


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000)


class ChatResponse(BaseModel):
    reply: str            # adaptive reply (bilingual or English based on student input)
    grade_level: int
    context_used: bool    # True when SNC chunks were found for this grade
    translated_query: str  # the English translation of the student's query


class UrduRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000)


class UrduResponse(BaseModel):
    urdu: str


@router.post("", response_model=ChatResponse, summary="Guardrailed adaptive student chat")
async def chat(
    body: ChatRequest,
    background_tasks: BackgroundTasks,
    student: dict = Depends(get_current_student),
):
    """
    Send a student message and receive a grade-appropriate, SNC-grounded reply.

    The reply language adapts to the student's input:
    - Student writes in English → pure English reply
    - Student writes in Roman Urdu / Minglish → bilingual Minglish reply
    """
    classroom_id: str = student["classroom_id"]
    supabase = get_supabase_admin()

    classroom_resp, translated_query = await asyncio.gather(
        asyncio.to_thread(
            lambda: supabase.table("classrooms")
            .select("grade_level")
            .eq("id", classroom_id)
            .maybe_single()
            .execute()
        ),
        translate_to_english(body.message),
    )

    if not classroom_resp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Classroom not found for this student",
        )
    grade_level: int = classroom_resp.data["grade_level"]

    context_chunks = await retrieve_grade_filtered_chunks(
        query=translated_query,
        grade_level=grade_level,
        supabase_admin_client=supabase,
    )

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
        reply=tutor_response.reply,
        grade_level=grade_level,
        context_used=len(context_chunks) > 0,
        translated_query=translated_query,
    )


@router.post("/stream", summary="Streaming guardrailed adaptive student chat (SSE)")
async def chat_stream(
    body: ChatRequest,
    student: dict = Depends(get_current_student),
):
    """
    Stream a grade-appropriate, SNC-grounded reply token by token.

    Returns a text/event-stream response with SSE events:
      - {"type": "status", "content": "Thinking..."}
      - {"type": "token", "content": "<token>"}  (repeated)
      - {"type": "done"}
    """
    classroom_id: str = student["classroom_id"]
    supabase = get_supabase_admin()

    classroom_resp, translated_query = await asyncio.gather(
        asyncio.to_thread(
            lambda: supabase.table("classrooms")
            .select("grade_level")
            .eq("id", classroom_id)
            .maybe_single()
            .execute()
        ),
        translate_to_english(body.message),
    )

    if not classroom_resp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Classroom not found for this student",
        )
    grade_level: int = classroom_resp.data["grade_level"]

    context_chunks = await retrieve_grade_filtered_chunks(
        query=translated_query,
        grade_level=grade_level,
        supabase_admin_client=supabase,
    )

    async def event_stream():
        yield f"data: {json.dumps({'type': 'status', 'content': 'Thinking...'})}\n\n"

        accumulated_response: list[str] = []
        async for token in stream_guardrailed_response(
            original_message=body.message,
            translated_message=translated_query,
            context_chunks=context_chunks,
            grade_level=grade_level,
        ):
            accumulated_response.append(token)
            yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"

        yield f"data: {json.dumps({'type': 'done'})}\n\n"

        await asyncio.to_thread(
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

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.post("/urdu", response_model=UrduResponse, summary="Translate reply to Urdu script")
async def chat_urdu(
    body: UrduRequest,
    student: dict = Depends(get_current_student),
):
    """Translate a tutor reply into Urdu script (نستعلیق) on demand."""
    urdu_text = await translate_to_urdu(body.text)
    return UrduResponse(urdu=urdu_text)
