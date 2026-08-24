"""CareBot AI Engine — OpenAI API integration with 16 tools and safety guardrails."""
import json
import logging
from openai import AsyncOpenAI
from app.config import settings
from app.services import tools
from app.services.triage import detect_emergency, EMERGENCY_RESPONSE

logger = logging.getLogger("carebot.ai_engine")

# System prompt with safety guardrails
SYSTEM_PROMPT = """You are CareBot, an AI health assistant for City Health Clinic in Lahore, Pakistan.

ROLE:
- Help patients check symptoms, book appointments, view their medical records, and answer health questions.
- You have access to the patient's medical records through tools.
- Always be empathetic, clear, and speak in simple language (the patient may be elderly or non-technical).

SAFETY GUARDRAILS — STRICTLY FOLLOW:
1. NEVER diagnose conditions. You can describe symptoms and suggest which department to visit.
2. NEVER prescribe medications. Only show existing prescriptions from the records.
3. NEVER modify medical records (allergies, conditions, blood type). Only update contact info (phone, email, address).
4. Always include a disclaimer when discussing symptoms: "This is AI-generated guidance, not medical advice. Please consult your doctor."
5. For ANY emergency symptoms (chest pain, difficulty breathing, severe bleeding, unconsciousness, seizure, suicidal thoughts), immediately direct to emergency services (1122) — do NOT attempt to triage.
6. When showing lab results, explain values in simple terms but always say "Please discuss these results with your doctor."
7. Be culturally sensitive — patients are from Pakistan, may use Urdu terms or local medical terminology.
8. When booking appointments, confirm the details before proceeding.
9. If you cannot help with something, escalate to staff using the escalate_to_staff tool.

CONVERSATION STYLE:
- Be warm and professional ("I understand your concern...")
- Use simple language, avoid medical jargon unless explaining a specific term
- Be concise — patients want answers, not essays
- When listing medications or appointments, format them clearly
- If the patient asks something outside your scope, say so honestly and offer to escalate

TOOLS AVAILABLE:
You have 16 tools to help patients. Use them proactively — don't just chat, actually look up their data.
When a patient asks about their medications, USE the get_my_medications tool. Don't guess.
When they want to book, USE book_appointment. When they ask about lab results, USE get_my_lab_results.
"""

# Tool definitions in OpenAI function-calling format
TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "triage_symptoms",
            "description": "Assess patient symptoms and suggest urgency level and department. Use when patient describes symptoms.",
            "parameters": {
                "type": "object",
                "properties": {
                    "symptoms": {"type": "string", "description": "Description of symptoms"},
                    "duration": {"type": "string", "description": "How long symptoms have lasted"},
                    "severity": {"type": "string", "enum": ["mild", "moderate", "severe"], "description": "Severity level"},
                },
                "required": ["symptoms"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "book_appointment",
            "description": "Book an appointment with a doctor. Confirm details with patient first.",
            "parameters": {
                "type": "object",
                "properties": {
                    "doctor_id": {"type": "string", "description": "Doctor's UUID"},
                    "date": {"type": "string", "description": "Date in YYYY-MM-DD format"},
                    "time_slot": {"type": "string", "description": "Time in HH:MM format"},
                    "reason": {"type": "string", "description": "Reason for visit"},
                },
                "required": ["doctor_id", "date", "time_slot"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "reschedule_appointment",
            "description": "Reschedule an existing appointment to a new date/time.",
            "parameters": {
                "type": "object",
                "properties": {
                    "appointment_id": {"type": "string"},
                    "new_date": {"type": "string", "description": "New date YYYY-MM-DD"},
                    "new_time_slot": {"type": "string", "description": "New time HH:MM"},
                },
                "required": ["appointment_id", "new_date", "new_time_slot"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "cancel_appointment",
            "description": "Cancel an existing appointment.",
            "parameters": {
                "type": "object",
                "properties": {
                    "appointment_id": {"type": "string"},
                    "reason": {"type": "string"},
                },
                "required": ["appointment_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_my_appointments",
            "description": "Get patient's upcoming and recent appointments.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_my_profile",
            "description": "Get patient's profile including demographics, allergies, and conditions.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "update_my_contact",
            "description": "Update patient's contact info (phone, email, or address only).",
            "parameters": {
                "type": "object",
                "properties": {
                    "phone": {"type": "string"},
                    "email": {"type": "string"},
                    "address": {"type": "string"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_my_medications",
            "description": "Get patient's current active medications with dosage instructions.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_my_lab_results",
            "description": "Get patient's recent lab test results.",
            "parameters": {
                "type": "object",
                "properties": {
                    "recent_count": {"type": "integer", "description": "Number of recent results to fetch", "default": 5},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "explain_lab_results",
            "description": "Get detailed explanation of a specific lab order's results.",
            "parameters": {
                "type": "object",
                "properties": {
                    "lab_order_id": {"type": "string"},
                },
                "required": ["lab_order_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_doctors",
            "description": "Get list of available doctors, optionally filtered by department.",
            "parameters": {
                "type": "object",
                "properties": {
                    "department": {"type": "string", "description": "Filter by department name"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_clinic_info",
            "description": "Get clinic information including hours, address, phone, and departments.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_health_faq",
            "description": "Search health FAQs for answers to common health questions.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search query"},
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "request_prescription_refill",
            "description": "Request a refill for an existing active prescription.",
            "parameters": {
                "type": "object",
                "properties": {
                    "prescription_id": {"type": "string"},
                },
                "required": ["prescription_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "request_lab_report_pdf",
            "description": "Request a downloadable PDF of lab results.",
            "parameters": {
                "type": "object",
                "properties": {
                    "lab_order_id": {"type": "string"},
                },
                "required": ["lab_order_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "escalate_to_staff",
            "description": "Escalate the patient's concern to clinic staff for human attention.",
            "parameters": {
                "type": "object",
                "properties": {
                    "reason": {"type": "string", "description": "Why the patient needs staff help"},
                },
                "required": ["reason"],
            },
        },
    },
]

# Map tool names to their handler functions
TOOL_HANDLERS = {
    "triage_symptoms": tools.triage_symptoms,
    "book_appointment": tools.book_appointment,
    "reschedule_appointment": tools.reschedule_appointment,
    "cancel_appointment": tools.cancel_appointment,
    "get_my_appointments": tools.get_my_appointments,
    "get_my_profile": tools.get_my_profile,
    "update_my_contact": tools.update_my_contact,
    "get_my_medications": tools.get_my_medications,
    "get_my_lab_results": tools.get_my_lab_results,
    "explain_lab_results": tools.explain_lab_results,
    "get_doctors": tools.get_doctors,
    "get_clinic_info": tools.get_clinic_info,
    "search_health_faq": tools.search_health_faq,
    "request_prescription_refill": tools.request_prescription_refill,
    "request_lab_report_pdf": tools.request_lab_report_pdf,
    "escalate_to_staff": tools.escalate_to_staff,
}

# Parameter remapping: OpenAI tool schema names -> actual function param names.
_PARAM_REMAP = {
    "book_appointment": {"date": "date_str"},
    "search_health_faq": {"query": "query_text"},
}

# Which tools do NOT receive patient_id / clinic_id (avoid injecting unused kwargs).
_NO_PATIENT_ID = {"get_doctors", "get_clinic_info", "search_health_faq"}
_NO_CLINIC_ID = {
    "triage_symptoms", "reschedule_appointment", "cancel_appointment",
    "get_my_appointments", "get_my_profile", "update_my_contact",
    "get_my_medications", "get_my_lab_results", "explain_lab_results",
    "request_prescription_refill", "request_lab_report_pdf",
}


def _prepare_tool_input(
    tool_name: str, tool_input: dict, patient_id: str, clinic_id: str
) -> dict:
    """Remap parameter names and inject patient_id / clinic_id as needed."""
    params = dict(tool_input)

    # Remap any parameter names
    remap = _PARAM_REMAP.get(tool_name)
    if remap:
        for old_key, new_key in remap.items():
            if old_key in params:
                params[new_key] = params.pop(old_key)

    # Inject context ids
    if tool_name not in _NO_PATIENT_ID:
        params["patient_id"] = patient_id
    if tool_name not in _NO_CLINIC_ID:
        params["clinic_id"] = clinic_id

    return params


async def chat(patient_id: str, clinic_id: str, messages: list[dict]) -> dict:
    """Run the AI chat with tool-use loop.

    Args:
        patient_id: The patient's UUID
        clinic_id: The clinic's UUID
        messages: Conversation history [{role, content}]

    Returns:
        {response: str, tools_used: list[str], emergency: bool}
    """
    # 1. Emergency pre-check on the latest user message
    last_message = messages[-1]["content"] if messages else ""
    if isinstance(last_message, str) and detect_emergency(last_message):
        return {
            "response": EMERGENCY_RESPONSE["message"],
            "tools_used": [],
            "emergency": True,
        }

    # 2. Initialize OpenAI client
    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    # 3. Build messages with system prompt
    openai_messages = [{"role": "system", "content": SYSTEM_PROMPT}] + messages

    # 4. Run the tool-use loop (max 10 iterations to prevent infinite loops)
    tools_used: list[str] = []
    max_iterations = 10

    for _ in range(max_iterations):
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            max_tokens=1024,
            messages=openai_messages,
            tools=TOOL_DEFINITIONS,
            tool_choice="auto",
        )

        choice = response.choices[0]
        assistant_message = choice.message

        # 5. Check if the model wants to call tools
        if choice.finish_reason == "tool_calls" and assistant_message.tool_calls:
            # Add the assistant message (with tool_calls) to conversation
            openai_messages.append(assistant_message.model_dump())

            for tool_call in assistant_message.tool_calls:
                tool_name = tool_call.function.name
                try:
                    tool_input = json.loads(tool_call.function.arguments)
                except json.JSONDecodeError:
                    tool_input = {}

                logger.info(
                    "Tool call: %s(%s)",
                    tool_name,
                    json.dumps(tool_input)[:200],
                )
                tools_used.append(tool_name)

                # Execute the tool
                handler = TOOL_HANDLERS.get(tool_name)
                if handler:
                    params = _prepare_tool_input(
                        tool_name, tool_input, patient_id, clinic_id
                    )
                    try:
                        result = await handler(**params)
                    except Exception as e:
                        logger.exception("Tool %s failed", tool_name)
                        result = {"error": f"Tool execution failed: {str(e)}"}
                else:
                    result = {"error": f"Unknown tool: {tool_name}"}

                # Add tool result to conversation
                openai_messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": json.dumps(result, default=str),
                })

        elif choice.finish_reason == "stop":
            # Model is done — return the text response
            return {
                "response": assistant_message.content or "",
                "tools_used": tools_used,
                "emergency": False,
            }

        else:
            # Unexpected finish reason
            return {
                "response": "I'm sorry, I encountered an issue. Please try again.",
                "tools_used": tools_used,
                "emergency": False,
            }

    # Max iterations reached
    return {
        "response": "I apologize, but I'm having trouble processing your request. Please try again or contact the clinic directly.",
        "tools_used": tools_used,
        "emergency": False,
    }
