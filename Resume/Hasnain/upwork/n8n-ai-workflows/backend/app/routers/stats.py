from fastapi import APIRouter

from app.database import get_emails, get_invoices, get_leads, get_stats, get_workflow_runs
from app.models.schemas import StatsResponse

router = APIRouter(prefix="/api", tags=["stats"])


@router.get("/stats", response_model=StatsResponse)
async def stats_endpoint():
    data = await get_stats()
    return data


@router.get("/emails")
async def list_emails(limit: int = 50):
    return await get_emails(limit)


@router.get("/invoices")
async def list_invoices(limit: int = 50):
    return await get_invoices(limit)


@router.get("/leads")
async def list_leads(limit: int = 50):
    return await get_leads(limit)


@router.get("/workflow-runs")
async def list_workflow_runs(limit: int = 50):
    return await get_workflow_runs(limit)
