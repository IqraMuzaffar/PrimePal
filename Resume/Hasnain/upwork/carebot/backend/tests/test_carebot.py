"""Unit tests for CareBot — pure logic, schemas, configs, constants.

No database or API keys required.
"""

import inspect
import pytest


# ---------------------------------------------------------------------------
# 1. Triage: emergency detection
# ---------------------------------------------------------------------------

class TestEmergencyDetection:
    """Tests for app.services.triage.detect_emergency."""

    def test_detect_emergency_chest_pain(self):
        from app.services.triage import detect_emergency
        assert detect_emergency("I have severe chest pain") is True

    def test_detect_emergency_breathing(self):
        from app.services.triage import detect_emergency
        assert detect_emergency("I can't breathe properly") is True

    def test_detect_emergency_suicidal(self):
        from app.services.triage import detect_emergency
        assert detect_emergency("I feel suicidal") is True

    def test_no_emergency_for_normal_symptoms(self):
        from app.services.triage import detect_emergency
        assert detect_emergency("I have a mild headache") is False

    def test_no_emergency_empty_string(self):
        from app.services.triage import detect_emergency
        assert detect_emergency("") is False

    def test_emergency_case_insensitive(self):
        from app.services.triage import detect_emergency
        assert detect_emergency("CHEST PAIN is killing me") is True


# ---------------------------------------------------------------------------
# 2. Triage: department suggestion
# ---------------------------------------------------------------------------

class TestDepartmentSuggestion:
    """Tests for app.services.triage.suggest_department."""

    def test_heart_maps_to_cardiology(self):
        from app.services.triage import suggest_department
        assert suggest_department("my heart is racing") == "Cardiology"

    def test_skin_maps_to_dermatology(self):
        from app.services.triage import suggest_department
        assert suggest_department("I have a skin rash") == "Dermatology"

    def test_child_maps_to_pediatrics(self):
        from app.services.triage import suggest_department
        assert suggest_department("my child has a fever") == "Pediatrics"

    def test_unknown_defaults_to_general(self):
        from app.services.triage import suggest_department
        assert suggest_department("I feel weird") == "General Medicine"

    def test_headache_maps_to_general(self):
        from app.services.triage import suggest_department
        assert suggest_department("bad headache for 2 days") == "General Medicine"


# ---------------------------------------------------------------------------
# 3. Emergency response constant
# ---------------------------------------------------------------------------

class TestEmergencyResponse:
    """Verify the EMERGENCY_RESPONSE payload structure."""

    def test_emergency_response_has_required_keys(self):
        from app.services.triage import EMERGENCY_RESPONSE
        assert "emergency" in EMERGENCY_RESPONSE
        assert "message" in EMERGENCY_RESPONSE
        assert EMERGENCY_RESPONSE["emergency"] is True

    def test_emergency_response_mentions_1122(self):
        from app.services.triage import EMERGENCY_RESPONSE
        assert "1122" in EMERGENCY_RESPONSE["message"]


# ---------------------------------------------------------------------------
# 4. Config / Settings
# ---------------------------------------------------------------------------

class TestSettings:
    """Tests for app.config.Settings."""

    def test_settings_loads_with_defaults(self):
        from app.config import Settings
        s = Settings()
        assert isinstance(s.DATABASE_URL, str)
        assert "carebot" in s.DATABASE_URL
        assert isinstance(s.CORS_ORIGINS, list)
        assert s.BACKEND_PORT == 8000

    def test_jwt_secret_has_default(self):
        from app.config import Settings
        s = Settings()
        assert len(s.JWT_SECRET) > 0


# ---------------------------------------------------------------------------
# 5. AI Engine: system prompt safety guardrails
# ---------------------------------------------------------------------------

class TestSystemPrompt:
    """Verify SYSTEM_PROMPT contains required safety guardrails."""

    def test_prompt_forbids_diagnosis(self):
        from app.services.ai_engine import SYSTEM_PROMPT
        assert "NEVER diagnose" in SYSTEM_PROMPT

    def test_prompt_forbids_prescribing(self):
        from app.services.ai_engine import SYSTEM_PROMPT
        assert "NEVER prescribe" in SYSTEM_PROMPT

    def test_prompt_mentions_emergency_number(self):
        from app.services.ai_engine import SYSTEM_PROMPT
        assert "1122" in SYSTEM_PROMPT

    def test_prompt_mentions_disclaimer(self):
        from app.services.ai_engine import SYSTEM_PROMPT
        assert "not medical advice" in SYSTEM_PROMPT.lower() or "not a medical diagnosis" in SYSTEM_PROMPT.lower()


# ---------------------------------------------------------------------------
# 6. AI Engine: tool definitions completeness
# ---------------------------------------------------------------------------

class TestToolDefinitions:
    """Verify TOOL_DEFINITIONS and TOOL_HANDLERS are consistent."""

    def test_16_tool_definitions(self):
        from app.services.ai_engine import TOOL_DEFINITIONS
        assert len(TOOL_DEFINITIONS) == 16

    def test_16_tool_handlers(self):
        from app.services.ai_engine import TOOL_HANDLERS
        assert len(TOOL_HANDLERS) == 16

    def test_every_definition_has_handler(self):
        from app.services.ai_engine import TOOL_DEFINITIONS, TOOL_HANDLERS
        definition_names = {t["function"]["name"] for t in TOOL_DEFINITIONS}
        handler_names = set(TOOL_HANDLERS.keys())
        assert definition_names == handler_names

    def test_every_definition_has_parameters(self):
        from app.services.ai_engine import TOOL_DEFINITIONS
        for tool in TOOL_DEFINITIONS:
            func = tool["function"]
            assert "parameters" in func, f"{func['name']} missing parameters"
            assert func["parameters"]["type"] == "object"


# ---------------------------------------------------------------------------
# 7. AI Engine: _prepare_tool_input
# ---------------------------------------------------------------------------

class TestPrepareToolInput:
    """Tests for the parameter remapping helper."""

    def test_injects_patient_id(self):
        from app.services.ai_engine import _prepare_tool_input
        result = _prepare_tool_input("get_my_profile", {}, "p1", "c1")
        assert result["patient_id"] == "p1"

    def test_does_not_inject_patient_id_for_get_doctors(self):
        from app.services.ai_engine import _prepare_tool_input
        result = _prepare_tool_input("get_doctors", {}, "p1", "c1")
        assert "patient_id" not in result

    def test_remaps_date_for_book_appointment(self):
        from app.services.ai_engine import _prepare_tool_input
        result = _prepare_tool_input(
            "book_appointment",
            {"date": "2025-01-15", "doctor_id": "d1", "time_slot": "09:00"},
            "p1", "c1",
        )
        assert "date_str" in result
        assert "date" not in result

    def test_remaps_query_for_search_faq(self):
        from app.services.ai_engine import _prepare_tool_input
        result = _prepare_tool_input(
            "search_health_faq", {"query": "flu"}, "p1", "c1"
        )
        assert "query_text" in result
        assert "query" not in result

    def test_injects_clinic_id_for_get_doctors(self):
        from app.services.ai_engine import _prepare_tool_input
        result = _prepare_tool_input("get_doctors", {}, "p1", "c1")
        assert result["clinic_id"] == "c1"


# ---------------------------------------------------------------------------
# 8. Tool function signatures exist
# ---------------------------------------------------------------------------

class TestToolFunctionSignatures:
    """Verify that tool handler functions have the expected parameters."""

    def test_triage_symptoms_params(self):
        from app.services.tools import triage_symptoms
        sig = inspect.signature(triage_symptoms)
        params = set(sig.parameters.keys())
        assert {"patient_id", "symptoms", "severity"}.issubset(params)

    def test_book_appointment_params(self):
        from app.services.tools import book_appointment
        sig = inspect.signature(book_appointment)
        params = set(sig.parameters.keys())
        assert {"patient_id", "clinic_id", "doctor_id", "date_str", "time_slot"}.issubset(params)

    def test_all_tool_handlers_are_async(self):
        from app.services.ai_engine import TOOL_HANDLERS
        for name, handler in TOOL_HANDLERS.items():
            assert inspect.iscoroutinefunction(handler), f"{name} is not async"


# ---------------------------------------------------------------------------
# 9. Pydantic schemas
# ---------------------------------------------------------------------------

class TestSchemas:
    """Verify Pydantic schemas validate correctly."""

    def test_chat_message_valid(self):
        from app.models.schemas import ChatMessage
        msg = ChatMessage(message="Hello")
        assert msg.message == "Hello"

    def test_patient_login_requires_fields(self):
        from app.models.schemas import PatientLogin
        login = PatientLogin(email="a@b.com", date_of_birth="2000-01-01")
        assert login.email == "a@b.com"

    def test_token_response_fields(self):
        from app.models.schemas import TokenResponse
        tr = TokenResponse(token="tok", role="patient", user_id="u1", clinic_id="c1")
        assert tr.role == "patient"

    def test_lab_result_entry_defaults(self):
        from app.models.schemas import LabResultEntry
        entry = LabResultEntry(test_name="CBC", value="5.0")
        assert entry.status == "normal"
        assert entry.unit is None

    def test_doctor_create_defaults(self):
        from app.models.schemas import DoctorCreate
        doc = DoctorCreate(name="Dr. Ali")
        assert doc.slot_duration_min == 30
        assert doc.slots_start == "09:00"
        assert doc.slots_end == "17:00"
