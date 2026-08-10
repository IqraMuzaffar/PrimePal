from app.services.tools import check_emergency_keywords, SEVERITY_MAP

def test_emergency_keywords_detected():
    assert check_emergency_keywords("I am unconscious") is True
    assert check_emergency_keywords("severe bleeding from wound") is True
    assert check_emergency_keywords("having a seizure") is True
    assert check_emergency_keywords("I feel suicidal") is True

def test_emergency_keywords_not_detected():
    assert check_emergency_keywords("I have a headache") is False
    assert check_emergency_keywords("my stomach hurts") is False
    assert check_emergency_keywords("I have a rash") is False

def test_severity_map():
    assert "green" in SEVERITY_MAP
    assert "yellow" in SEVERITY_MAP
    assert "red" in SEVERITY_MAP
    assert "Routine" in SEVERITY_MAP["green"]
    assert "Urgent" in SEVERITY_MAP["red"]
