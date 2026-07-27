import time

from fastapi import APIRouter, HTTPException

from app.database import log_workflow_run, save_email
from app.models.schemas import EmailRequest, EmailResponse
from app.services.ai_client import classify_email

router = APIRouter(prefix="/api", tags=["email"])


@router.post("/classify-email", response_model=EmailResponse)
async def classify_email_endpoint(req: EmailRequest):
    start = time.time()
    try:
        result = await classify_email(req.subject, req.sender, req.body)

        record_id = await save_email(
            {
                "subject": req.subject,
                "sender": req.sender,
                "body_preview": req.body[:500],
                "category": result.get("category", "unknown"),
                "confidence": result.get("confidence", 0),
                "ai_summary": result.get("summary", ""),
                "suggested_action": result.get("suggested_action", ""),
            }
        )

        duration_ms = int((time.time() - start) * 1000)
        await log_workflow_run("email_classification", "success", 1, duration_ms)

        return EmailResponse(
            id=record_id,
            category=result.get("category", "unknown"),
            confidence=result.get("confidence", 0),
            summary=result.get("summary", ""),
            suggested_action=result.get("suggested_action", ""),
            key_entities=result.get("key_entities", []),
        )
    except Exception as e:
        duration_ms = int((time.time() - start) * 1000)
        await log_workflow_run(
            "email_classification", "error", 0, duration_ms, str(e)
        )
        raise HTTPException(status_code=500, detail=str(e))
