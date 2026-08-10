from app.db.queries import update_session_triage, update_session_emergency
from app.services.audit import audit_tool_call

EMERGENCY_KEYWORDS = [
    "unconscious", "not breathing", "severe bleeding", "seizure",
    "heart attack", "suicidal", "suicide", "overdose",
    "choking", "anaphylaxis", "collapsed", "stroke",
]

SEVERITY_MAP = {
    "green": "Routine — self-care or appointment within a week",
    "yellow": "Needs appointment within 24-48 hours",
    "red": "Urgent — needs same-day attention",
}

def check_emergency_keywords(message: str) -> bool:
    msg_lower = message.lower()
    return any(kw in msg_lower for kw in EMERGENCY_KEYWORDS)


async def collect_symptoms(session_id, raw_message: str) -> dict:
    result = {
        "raw_description": raw_message,
        "body_part": "",
        "duration": "",
        "intensity": 0,
        "associated_symptoms": [],
        "needs_clarification": True,
        "clarification_questions": [],
    }
    await audit_tool_call(session_id, "collect_symptoms",
                          {"raw_message": raw_message}, result)
    return result


async def score_severity(session_id, body_part: str, duration: str,
                         intensity: int, associated_symptoms: list[str]) -> dict:
    severity = "green"
    red_parts = ["chest", "heart", "head", "brain"]
    red_symptoms = ["difficulty breathing", "loss of consciousness", "severe pain",
                    "numbness", "vision loss", "blood in stool", "blood in urine",
                    "high fever", "confusion"]

    if intensity >= 8:
        severity = "red"
    elif any(part in body_part.lower() for part in red_parts) and intensity >= 6:
        severity = "red"
    elif any(s.lower() in " ".join(associated_symptoms).lower() for s in red_symptoms):
        severity = "red"
    elif intensity >= 5:
        severity = "yellow"
    elif any(part in body_part.lower() for part in red_parts):
        severity = "yellow"

    result = {"severity": severity, "description": SEVERITY_MAP[severity]}
    await audit_tool_call(session_id, "score_severity", {
        "body_part": body_part, "duration": duration,
        "intensity": intensity, "associated_symptoms": associated_symptoms,
    }, result)
    return result


async def recommend_department(session_id, body_part: str, symptoms_description: str,
                                severity: str, guideline_excerpts: str = "") -> dict:
    dept_map = {
        "chest": "Cardiology", "heart": "Cardiology", "palpitation": "Cardiology",
        "head": "Neurology", "brain": "Neurology", "migraine": "Neurology", "dizziness": "Neurology",
        "skin": "Dermatology", "rash": "Dermatology", "itch": "Dermatology",
        "stomach": "Gastroenterology", "abdomen": "Gastroenterology", "nausea": "Gastroenterology",
        "bone": "Orthopedics", "joint": "Orthopedics", "fracture": "Orthopedics", "back pain": "Orthopedics",
        "eye": "Ophthalmology", "vision": "Ophthalmology",
        "ear": "ENT", "nose": "ENT", "throat": "ENT", "sore throat": "ENT",
        "breathing": "Pulmonology", "lung": "Pulmonology", "cough": "Pulmonology", "asthma": "Pulmonology",
        "urinary": "Urology", "kidney": "Urology",
        "child": "Pediatrics", "baby": "Pediatrics", "infant": "Pediatrics",
        "pregnancy": "Gynecology", "menstrual": "Gynecology",
        "anxiety": "Psychiatry", "depression": "Psychiatry", "mental": "Psychiatry",
    }
    combined = f"{body_part} {symptoms_description}".lower()
    department = "General Practice"
    for keyword, dept in dept_map.items():
        if keyword in combined:
            department = dept
            break
    if severity == "red" and department == "General Practice":
        department = "Emergency"

    result = {
        "department": department,
        "reasoning": f"Symptoms in {body_part} with severity {severity}. Matched to {department}.",
    }
    await audit_tool_call(session_id, "recommend_department", {
        "body_part": body_part, "symptoms": symptoms_description, "severity": severity,
    }, result)
    return result


async def escalate_to_human(session_id, severity: str, department: str,
                             ai_summary: str, is_emergency: bool = False) -> dict:
    if is_emergency:
        await update_session_emergency(session_id)
    else:
        await update_session_triage(session_id, severity, department, ai_summary)

    result = {
        "escalated": True, "severity": severity,
        "department": department, "is_emergency": is_emergency,
        "message": "Triage summary sent to receptionist for review.",
    }
    await audit_tool_call(session_id, "escalate_to_human", {
        "severity": severity, "department": department, "is_emergency": is_emergency,
    }, result)
    return result
