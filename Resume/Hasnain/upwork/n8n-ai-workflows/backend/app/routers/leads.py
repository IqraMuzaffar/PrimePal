import time

from fastapi import APIRouter, HTTPException

from app.database import log_workflow_run, save_lead
from app.models.schemas import LeadRequest, LeadResponse
from app.services.ai_client import score_lead

router = APIRouter(prefix="/api", tags=["leads"])


@router.post("/score-lead", response_model=LeadResponse)
async def score_lead_endpoint(req: LeadRequest):
    start = time.time()
    try:
        result = await score_lead(
            first_name=req.first_name,
            last_name=req.last_name,
            email=req.email,
            company=req.company,
            job_title=req.job_title,
            industry=req.industry,
            message=req.message,
        )

        draft_email = result.get("draft_email")
        record_id = await save_lead(
            {
                "first_name": req.first_name,
                "last_name": req.last_name,
                "email": req.email,
                "company": req.company,
                "job_title": req.job_title,
                "message": req.message,
                "ai_score": result.get("score", 0),
                "ai_category": result.get("category", "cold"),
                "ai_reasoning": result.get("reasoning", ""),
                "key_signals": result.get("key_signals", []),
                "draft_email_subject": draft_email.get("subject", "") if draft_email else None,
                "draft_email_body": draft_email.get("body", "") if draft_email else None,
            }
        )

        duration_ms = int((time.time() - start) * 1000)
        await log_workflow_run("lead_scoring", "success", 1, duration_ms)

        return LeadResponse(
            id=record_id,
            score=result.get("score", 0),
            category=result.get("category", "cold"),
            reasoning=result.get("reasoning", ""),
            key_signals=result.get("key_signals", []),
            suggested_followup=result.get("suggested_followup", ""),
            draft_email=draft_email,
        )
    except Exception as e:
        duration_ms = int((time.time() - start) * 1000)
        await log_workflow_run(
            "lead_scoring", "error", 0, duration_ms, str(e)
        )
        raise HTTPException(status_code=500, detail=str(e))
