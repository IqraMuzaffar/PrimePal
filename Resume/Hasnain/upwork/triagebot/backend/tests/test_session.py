def test_session_state_structure():
    state = {
        "session_id": "test-123",
        "turn_count": 0,
        "symptoms": None,
        "severity": None,
        "department": None,
        "status": "in_progress",
        "conversation_history": [],
    }
    assert state["turn_count"] == 0
    assert state["status"] == "in_progress"
    state["turn_count"] += 1
    state["conversation_history"].append({"role": "patient", "content": "headache"})
    assert state["turn_count"] == 1
    assert len(state["conversation_history"]) == 1
