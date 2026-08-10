import json
from anthropic import AsyncAnthropic
from app.config import settings
from app.services import tools
from app.services.session_manager import (
    get_or_create_session_state, set_session_state,
    increment_turn, add_to_history,
)
from app.db.queries import save_message
from app.services.audit import audit_tool_call

MAX_TURNS = 5

SYSTEM_PROMPT = """You are TriageBot, an AI patient triage assistant for a medical clinic.

YOUR ROLE:
- Collect patient symptoms through conversation (ask about body part, duration, intensity 1-10, other symptoms)
- Score severity (green/yellow/red) using the score_severity tool
- Recommend which department they should visit using recommend_department tool
- Escalate to a human receptionist using escalate_to_human tool

STRICT RULES:
1. You do NOT diagnose conditions. Never say "you have [disease]".
2. You do NOT prescribe medications, dosages, or home remedies.
3. You ONLY say: "Based on your symptoms, I recommend you visit [department]."
4. Keep conversations short — collect key info in 2-3 questions, then triage.
5. Be empathetic but professional.
6. If the patient describes life-threatening symptoms, immediately tell them to call emergency services.

CONVERSATION FLOW:
1. Greet the patient, ask what brings them in
2. Ask clarifying questions: where is the pain? how long? how intense (1-10)? any other symptoms?
3. Once you have enough info, use score_severity, then recommend_department, then escalate_to_human
4. Tell the patient: "I've sent your information to our receptionist. They will confirm your appointment shortly."
"""

TOOL_DEFINITIONS = [
    {
        "name": "score_severity",
        "description": "Score patient symptom severity as green (routine), yellow (24-48hr), or red (urgent/same-day).",
        "input_schema": {
            "type": "object",
            "properties": {
                "body_part": {"type": "string", "description": "Primary body part affected"},
                "duration": {"type": "string", "description": "How long symptoms have lasted"},
                "intensity": {"type": "integer", "description": "Pain/discomfort intensity 1-10"},
                "associated_symptoms": {
                    "type": "array", "items": {"type": "string"},
                    "description": "Other symptoms mentioned",
                },
            },
            "required": ["body_part", "duration", "intensity"],
        },
    },
    {
        "name": "recommend_department",
        "description": "Recommend which clinic department the patient should visit.",
        "input_schema": {
            "type": "object",
            "properties": {
                "body_part": {"type": "string"},
                "symptoms_description": {"type": "string"},
                "severity": {"type": "string", "enum": ["green", "yellow", "red"]},
                "guideline_excerpts": {"type": "string", "description": "Relevant clinical guideline text if available"},
            },
            "required": ["body_part", "symptoms_description", "severity"],
        },
    },
    {
        "name": "escalate_to_human",
        "description": "Send the triage result to the receptionist dashboard for human review.",
        "input_schema": {
            "type": "object",
            "properties": {
                "severity": {"type": "string", "enum": ["green", "yellow", "red"]},
                "department": {"type": "string"},
                "ai_summary": {"type": "string", "description": "3-4 sentence summary"},
                "is_emergency": {"type": "boolean", "default": False},
            },
            "required": ["severity", "department", "ai_summary"],
        },
    },
    {
        "name": "lookup_guidelines",
        "description": "Search clinical guidelines for relevant triage protocols.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Symptom-based search query"},
            },
            "required": ["query"],
        },
    },
]

client = AsyncAnthropic(api_key=settings.anthropic_api_key)

async def _execute_tool(session_id, tool_name: str, tool_input: dict) -> str:
    if tool_name == "score_severity":
        result = await tools.score_severity(
            session_id, body_part=tool_input.get("body_part", ""),
            duration=tool_input.get("duration", ""),
            intensity=tool_input.get("intensity", 5),
            associated_symptoms=tool_input.get("associated_symptoms", []),
        )
    elif tool_name == "recommend_department":
        result = await tools.recommend_department(
            session_id, body_part=tool_input.get("body_part", ""),
            symptoms_description=tool_input.get("symptoms_description", ""),
            severity=tool_input.get("severity", "green"),
            guideline_excerpts=tool_input.get("guideline_excerpts", ""),
        )
    elif tool_name == "escalate_to_human":
        result = await tools.escalate_to_human(
            session_id, severity=tool_input.get("severity", "green"),
            department=tool_input.get("department", "General Practice"),
            ai_summary=tool_input.get("ai_summary", ""),
            is_emergency=tool_input.get("is_emergency", False),
        )
    elif tool_name == "lookup_guidelines":
        from app.services.rag import search_guidelines
        result = await search_guidelines(tool_input.get("query", ""))
        await audit_tool_call(session_id, "lookup_guidelines",
                              tool_input, {"results_count": len(result.get("results", []))})
    else:
        result = {"error": f"Unknown tool: {tool_name}"}
    return json.dumps(result)


async def process_message(session_id, patient_message: str) -> str:
    # 1. Emergency keywords check
    if tools.check_emergency_keywords(patient_message):
        emergency_msg = (
            f"This sounds like a medical emergency. "
            f"Please call emergency services immediately at {settings.emergency_number}. "
            f"I am also alerting our clinic staff right now."
        )
        await tools.escalate_to_human(
            session_id, severity="red", department="Emergency",
            ai_summary=f"EMERGENCY: Patient reported: {patient_message}",
            is_emergency=True,
        )
        await save_message(session_id, "ai", emergency_msg)
        return emergency_msg

    # 2. Turn limit check
    turn = await increment_turn(session_id)
    if turn > MAX_TURNS:
        escalation_msg = (
            "Thank you for your patience. I'm going to connect you with our receptionist "
            "who can help you further. They'll be with you shortly."
        )
        await tools.escalate_to_human(
            session_id, severity="yellow", department="General Practice",
            ai_summary=f"Auto-escalated after {MAX_TURNS} turns. Patient messages not fully resolved.",
        )
        await save_message(session_id, "ai", escalation_msg)
        return escalation_msg

    # 3. Save patient message
    await save_message(session_id, "patient", patient_message)
    await add_to_history(session_id, "user", patient_message)

    # 4. Get conversation history
    state = await get_or_create_session_state(session_id)
    messages = [{"role": m["role"], "content": m["content"]}
                for m in state["conversation_history"]]

    # 5. Call Claude with tools
    response = await client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        tools=TOOL_DEFINITIONS,
        messages=messages,
    )

    # 6. Process tool calls loop
    while response.stop_reason == "tool_use":
        tool_results = []
        for block in response.content:
            if block.type == "tool_use":
                tool_result = await _execute_tool(session_id, block.name, block.input)
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": tool_result,
                })
        messages.append({"role": "assistant", "content": response.content})
        messages.append({"role": "user", "content": tool_results})
        response = await client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            tools=TOOL_DEFINITIONS,
            messages=messages,
        )

    # 7. Extract text
    ai_text = ""
    for block in response.content:
        if hasattr(block, "text"):
            ai_text += block.text

    # 8. Save AI response
    await save_message(session_id, "ai", ai_text)
    await add_to_history(session_id, "assistant", ai_text)
    return ai_text
