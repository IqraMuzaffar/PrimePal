def test_system_prompt_has_guardrails():
    from app.services.triage_engine import SYSTEM_PROMPT
    prompt_lower = SYSTEM_PROMPT.lower()
    assert "do not diagnose" in prompt_lower
    assert "do not prescribe" in prompt_lower

def test_tool_definitions_complete():
    from app.services.triage_engine import TOOL_DEFINITIONS
    tool_names = {t["name"] for t in TOOL_DEFINITIONS}
    assert "score_severity" in tool_names
    assert "recommend_department" in tool_names
    assert "escalate_to_human" in tool_names
    assert "lookup_guidelines" in tool_names
    assert len(TOOL_DEFINITIONS) == 4

def test_max_turns_set():
    from app.services.triage_engine import MAX_TURNS
    assert MAX_TURNS == 5
