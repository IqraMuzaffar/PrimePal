def test_schemas_import():
    from app.models.schemas import (
        PatientCreate, SymptomsData, TriageResult,
        TriageSessionOut, MessageOut, DashboardAction,
        LoginRequest, LoginResponse,
    )
    p = PatientCreate(phone="+2341234567")
    assert p.phone == "+2341234567"
    assert p.name is None

    s = SymptomsData(
        body_part="chest", duration="2 hours",
        intensity=7, raw_description="chest pain"
    )
    assert s.intensity == 7
    assert s.associated_symptoms == []

    t = TriageResult(severity="red", department="Cardiology", reasoning="chest pain")
    assert t.severity == "red"

    a = DashboardAction(action="confirm", reviewed_by="nurse1")
    assert a.department is None
