"""Pure-logic tests for n8n AI Workflows — no DB, no API keys required."""

import pytest
from pydantic import ValidationError


# ---------------------------------------------------------------------------
# 1. Config defaults
# ---------------------------------------------------------------------------

def test_settings_defaults():
    """Settings class exposes sensible defaults when no env is set."""
    from app.config import Settings

    s = Settings()
    assert s.LLM_MODEL == "gpt-4o-mini"
    assert s.DATABASE_PATH == "data/workflows.db"
    assert "localhost:3000" in s.CORS_ORIGINS


# ---------------------------------------------------------------------------
# 2-3. EmailRequest schema
# ---------------------------------------------------------------------------

def test_email_request_valid():
    from app.models.schemas import EmailRequest

    req = EmailRequest(subject="Hello", sender="alice@co.com", body="Test body")
    assert req.subject == "Hello"
    assert req.sender == "alice@co.com"


def test_email_request_missing_field():
    from app.models.schemas import EmailRequest

    with pytest.raises(ValidationError):
        EmailRequest(subject="Hello", sender="alice@co.com")  # missing body


# ---------------------------------------------------------------------------
# 4-5. LeadRequest schema
# ---------------------------------------------------------------------------

def test_lead_request_minimal():
    from app.models.schemas import LeadRequest

    lead = LeadRequest(first_name="Bob", last_name="Smith", email="bob@co.com")
    assert lead.company == ""
    assert lead.job_title == ""
    assert lead.industry == ""
    assert lead.message == ""


def test_lead_request_full():
    from app.models.schemas import LeadRequest

    lead = LeadRequest(
        first_name="Bob",
        last_name="Smith",
        email="bob@co.com",
        company="Acme",
        job_title="CTO",
        industry="SaaS",
        message="Interested in enterprise plan",
    )
    assert lead.company == "Acme"
    assert lead.job_title == "CTO"


# ---------------------------------------------------------------------------
# 6. EmailResponse schema
# ---------------------------------------------------------------------------

def test_email_response_schema():
    from app.models.schemas import EmailResponse

    resp = EmailResponse(
        id=1,
        category="urgent",
        confidence=0.95,
        summary="Server down",
        suggested_action="Escalate immediately",
        key_entities=["prod-server", "AWS"],
    )
    assert resp.category == "urgent"
    assert resp.confidence == 0.95
    assert len(resp.key_entities) == 2


# ---------------------------------------------------------------------------
# 7. InvoiceResponse needs_approval flag
# ---------------------------------------------------------------------------

def test_invoice_response_schema():
    from app.models.schemas import InvoiceResponse

    inv = InvoiceResponse(
        id=1,
        vendor="Acme Corp",
        amount=7500.00,
        currency="USD",
        invoice_number="INV-001",
        invoice_date="2025-01-15",
        due_date="2025-02-15",
        line_items=[{"description": "Consulting", "qty": 10, "unit_price": 750, "total": 7500}],
        needs_approval=True,
        confidence=0.92,
    )
    assert inv.needs_approval is True
    assert inv.amount == 7500.00


# ---------------------------------------------------------------------------
# 8. LeadResponse schema
# ---------------------------------------------------------------------------

def test_lead_response_schema():
    from app.models.schemas import LeadResponse

    resp = LeadResponse(
        id=1,
        score=85,
        category="hot",
        reasoning="Decision maker with clear budget",
        key_signals=["CTO title", "enterprise inquiry"],
        suggested_followup="Schedule demo call",
        draft_email={"subject": "Follow up", "body": "Hi Bob..."},
    )
    assert resp.score == 85
    assert resp.category == "hot"
    assert resp.draft_email is not None


# ---------------------------------------------------------------------------
# 9. LeadResponse allows null draft_email for cold leads
# ---------------------------------------------------------------------------

def test_lead_response_cold_no_draft():
    from app.models.schemas import LeadResponse

    resp = LeadResponse(
        id=2,
        score=20,
        category="cold",
        reasoning="Vague inquiry",
        key_signals=[],
        suggested_followup="Add to nurture campaign",
        draft_email=None,
    )
    assert resp.draft_email is None
    assert resp.category == "cold"


# ---------------------------------------------------------------------------
# 10. Invoice approval threshold logic (from ai_client.extract_invoice)
# ---------------------------------------------------------------------------

def test_invoice_approval_threshold_logic():
    """The ai_client sets needs_approval = amount > 5000. Verify the threshold."""
    # Replicate the pure logic from ai_client.extract_invoice
    def needs_approval(amount) -> bool:
        if isinstance(amount, str):
            try:
                amount = float(amount.replace(",", ""))
            except ValueError:
                amount = 0
        return amount > 5000

    assert needs_approval(6000) is True
    assert needs_approval(5000) is False
    assert needs_approval(4999.99) is False
    assert needs_approval("7,500.00") is True
    assert needs_approval("invalid") is False
