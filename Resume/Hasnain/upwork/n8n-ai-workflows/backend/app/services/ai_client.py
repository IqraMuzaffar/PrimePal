import json

from openai import AsyncOpenAI

from app.config import get_settings

settings = get_settings()

_client: AsyncOpenAI | None = None


def _get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    return _client


async def classify_email(subject: str, sender: str, body: str) -> dict:
    """Classify an email into urgent / sales_lead / support / spam."""
    response = await _get_client().chat.completions.create(
        model=settings.LLM_MODEL,
        response_format={"type": "json_object"},
        messages=[
            {
                "role": "system",
                "content": (
                    "You are an email classifier. Classify the email into one of these "
                    "categories: urgent, sales_lead, support, spam.\n\n"
                    "Return a JSON object with these fields:\n"
                    "- category: one of urgent, sales_lead, support, spam\n"
                    "- confidence: a number between 0 and 1\n"
                    "- summary: a brief 1-2 sentence summary of the email\n"
                    "- suggested_action: what the recipient should do\n"
                    "- key_entities: array of important names, companies, or topics mentioned"
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Subject: {subject}\n"
                    f"From: {sender}\n\n"
                    f"Body:\n{body}"
                ),
            },
        ],
    )
    return json.loads(response.choices[0].message.content)


async def extract_invoice(text: str) -> dict:
    """Extract structured invoice data from raw text."""
    response = await _get_client().chat.completions.create(
        model=settings.LLM_MODEL,
        response_format={"type": "json_object"},
        messages=[
            {
                "role": "system",
                "content": (
                    "You are an invoice data extractor. Extract structured data from "
                    "the provided invoice text.\n\n"
                    "Return a JSON object with these fields:\n"
                    "- vendor: the company or person that issued the invoice\n"
                    "- amount: the total amount as a number\n"
                    "- currency: the currency code (default USD)\n"
                    "- invoice_number: the invoice/reference number\n"
                    "- invoice_date: the invoice date in YYYY-MM-DD format\n"
                    "- due_date: the due date in YYYY-MM-DD format\n"
                    "- line_items: array of objects with {description, qty, unit_price, total}\n"
                    "- confidence: a number between 0 and 1 indicating extraction confidence\n\n"
                    "If a field is not found, use an empty string or 0 as appropriate."
                ),
            },
            {
                "role": "user",
                "content": f"Invoice text:\n{text}",
            },
        ],
    )
    result = json.loads(response.choices[0].message.content)

    # Auto-flag for approval if amount > 5000
    amount = result.get("amount", 0)
    if isinstance(amount, str):
        try:
            amount = float(amount.replace(",", ""))
        except ValueError:
            amount = 0
    result["amount"] = amount
    result["needs_approval"] = amount > 5000

    return result


async def score_lead(
    first_name: str,
    last_name: str,
    email: str,
    company: str,
    job_title: str,
    industry: str,
    message: str,
) -> dict:
    """Score and qualify a sales lead."""
    response = await _get_client().chat.completions.create(
        model=settings.LLM_MODEL,
        response_format={"type": "json_object"},
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a lead scoring AI. Score and qualify the lead based on the "
                    "information provided.\n\n"
                    "Scoring guide:\n"
                    "- HOT (75-100): Decision maker + budget signal + clear need\n"
                    "- WARM (40-74): Some interest but missing budget/authority signals\n"
                    "- COLD (0-39): Vague inquiry, no company info, unclear intent\n\n"
                    "Return a JSON object with these fields:\n"
                    "- score: integer 0-100\n"
                    "- category: one of hot, warm, cold\n"
                    "- reasoning: brief explanation of the score\n"
                    "- key_signals: array of signals that influenced the score\n"
                    "- suggested_followup: recommended next action\n"
                    "- draft_email: if hot or warm, include an object with "
                    "{subject, body} for a follow-up email. If cold, set to null."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Lead Information:\n"
                    f"Name: {first_name} {last_name}\n"
                    f"Email: {email}\n"
                    f"Company: {company}\n"
                    f"Job Title: {job_title}\n"
                    f"Industry: {industry}\n"
                    f"Message: {message}"
                ),
            },
        ],
    )
    return json.loads(response.choices[0].message.content)
