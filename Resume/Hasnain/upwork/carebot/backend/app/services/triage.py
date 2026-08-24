"""Emergency detection and symptom triage for CareBot AI chat."""

EMERGENCY_KEYWORDS = [
    "chest pain", "can't breathe", "cannot breathe", "difficulty breathing",
    "heart attack", "severe bleeding", "unconscious", "seizure", "stroke",
    "suicidal", "want to die", "self-harm", "overdose",
    "choking", "allergic reaction", "anaphylaxis",
    "severe head injury", "loss of consciousness",
]

EMERGENCY_RESPONSE = {
    "emergency": True,
    "message": (
        "🚨 EMERGENCY DETECTED 🚨\n\n"
        "Based on your symptoms, this may be a medical emergency.\n\n"
        "➡️ Call 1122 (Rescue) immediately\n"
        "➡️ Go to the nearest emergency room\n"
        "➡️ Do NOT wait for an appointment\n\n"
        "If someone is with you, ask them to help you get to the ER.\n\n"
        "This is an AI system and cannot provide emergency medical care. "
        "Please seek immediate professional help."
    ),
}

def detect_emergency(text: str) -> bool:
    """Check if the message contains emergency keywords."""
    lower = text.lower()
    return any(kw in lower for kw in EMERGENCY_KEYWORDS)

# Symptom-to-department mapping for triage
SYMPTOM_DEPARTMENT_MAP = {
    "heart": "Cardiology",
    "chest": "Cardiology",
    "blood pressure": "Cardiology",
    "palpitation": "Cardiology",
    "skin": "Dermatology",
    "rash": "Dermatology",
    "acne": "Dermatology",
    "eczema": "Dermatology",
    "itching": "Dermatology",
    "child": "Pediatrics",
    "baby": "Pediatrics",
    "infant": "Pediatrics",
    "fever": "General Medicine",
    "headache": "General Medicine",
    "cold": "General Medicine",
    "cough": "General Medicine",
    "flu": "General Medicine",
    "diabetes": "General Medicine",
    "sugar": "General Medicine",
    "thyroid": "General Medicine",
}

def suggest_department(symptoms: str) -> str:
    """Suggest a department based on symptom keywords."""
    lower = symptoms.lower()
    for keyword, dept in SYMPTOM_DEPARTMENT_MAP.items():
        if keyword in lower:
            return dept
    return "General Medicine"
