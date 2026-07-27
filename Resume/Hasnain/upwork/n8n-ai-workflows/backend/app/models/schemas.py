from pydantic import BaseModel


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------


class EmailRequest(BaseModel):
    subject: str
    sender: str
    body: str


class LeadRequest(BaseModel):
    first_name: str
    last_name: str
    email: str
    company: str = ""
    job_title: str = ""
    industry: str = ""
    message: str = ""


# ---------------------------------------------------------------------------
# Response models
# ---------------------------------------------------------------------------


class EmailResponse(BaseModel):
    id: int
    category: str  # urgent / sales_lead / support / spam
    confidence: float
    summary: str
    suggested_action: str
    key_entities: list[str]


class InvoiceResponse(BaseModel):
    id: int
    vendor: str
    amount: float
    currency: str
    invoice_number: str
    invoice_date: str
    due_date: str
    line_items: list[dict]
    needs_approval: bool
    confidence: float


class LeadResponse(BaseModel):
    id: int
    score: int
    category: str  # hot / warm / cold
    reasoning: str
    key_signals: list[str]
    suggested_followup: str
    draft_email: dict | None


class StatsResponse(BaseModel):
    total_processed: int
    emails: dict
    invoices: dict
    leads: dict
    today: dict
    recent_activity: list[dict]
    pipeline_summary: dict
