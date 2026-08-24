"""CareBot patient chat endpoint."""
import uuid
import json
from fastapi import APIRouter, Depends, HTTPException
from app.auth import get_current_patient
from app.database import query, query_one, execute
from app.models.schemas import ChatMessage
from app.services.ai_engine import chat
from app.services.audit import log_audit

router = APIRouter(prefix="/api/patient", tags=["chat"])


@router.post("/chat")
async def patient_chat(body: ChatMessage, user: dict = Depends(get_current_patient)):
    """Process a patient chat message through the AI engine."""
    patient_id = user["sub"]
    clinic_id = user["clinic_id"]

    # 1. Get or create chat session
    session = await query_one(
        """SELECT id, message_count, tools_used FROM chat_sessions
           WHERE patient_id = $1 AND ended_at IS NULL
           ORDER BY started_at DESC LIMIT 1""",
        patient_id,
    )

    if not session:
        session_id = str(uuid.uuid4())
        await execute(
            """INSERT INTO chat_sessions (id, clinic_id, patient_id)
               VALUES ($1, $2, $3)""",
            session_id,
            clinic_id,
            patient_id,
        )
        session = {"id": session_id, "message_count": 0, "tools_used": None}

    session_id = str(session["id"])

    # 2. Save user message
    await execute(
        """INSERT INTO chat_messages (id, session_id, role, content)
           VALUES ($1, $2, 'user', $3)""",
        str(uuid.uuid4()),
        session_id,
        body.message,
    )

    # 3. Load conversation history for this session
    history_rows = await query(
        """SELECT role, content, tool_name, tool_input, tool_result
           FROM chat_messages WHERE session_id = $1
           ORDER BY created_at""",
        session_id,
    )

    # Build messages list for Claude (simplified — just role + content)
    messages = []
    for row in history_rows:
        messages.append({"role": row["role"], "content": row["content"]})

    # 4. Call AI engine
    try:
        result = await chat(patient_id, clinic_id, messages)
    except Exception:
        # AI engine failure — don't crash, return a friendly error
        result = {
            "response": "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.",
            "tools_used": [],
            "emergency": False,
        }

    # 5. Save assistant response
    await execute(
        """INSERT INTO chat_messages (id, session_id, role, content)
           VALUES ($1, $2, 'assistant', $3)""",
        str(uuid.uuid4()),
        session_id,
        result["response"],
    )

    # 6. Update session metadata
    current_count = session["message_count"] or 0
    existing_tools = session["tools_used"] or []
    all_tools = list(set(existing_tools + result["tools_used"]))

    await execute(
        """UPDATE chat_sessions
           SET message_count = $1, tools_used = $2, escalated = $3
           WHERE id = $4""",
        current_count + 2,  # user + assistant
        all_tools,
        result.get("emergency", False) or "escalate_to_staff" in result["tools_used"],
        session_id,
    )

    # 7. Audit log
    await log_audit(
        clinic_id=clinic_id,
        user_type="patient",
        user_id=patient_id,
        action="chat_message",
        resource="chat_sessions",
        resource_id=session_id,
        details={"tools_used": result["tools_used"], "emergency": result["emergency"]},
    )

    # 8. Return response
    return {
        "response": result["response"],
        "session_id": session_id,
        "tools_used": result["tools_used"],
        "emergency": result["emergency"],
    }
