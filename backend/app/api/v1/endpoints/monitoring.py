"""
Admin monitoring endpoints for LLM metrics and system health.

Endpoints (admin auth required):
    GET /admin/monitoring/stats   — 24h aggregate stats
    GET /admin/monitoring/calls   — Recent LLM call log
"""

import asyncio
import logging
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from app.core.security import get_current_teacher
from app.core.supabase_client import get_supabase_admin

logger = logging.getLogger(__name__)
router = APIRouter()


class LLMCallOut(BaseModel):
    id: int
    created_at: str
    endpoint: str
    model: str
    prompt_tokens: int | None = None
    completion_tokens: int | None = None
    total_tokens: int | None = None
    latency_ms: int
    cache_hit: bool
    success: bool
    error: str | None = None


class MonitoringStatsResponse(BaseModel):
    total_calls: int = 0
    total_tokens: int = 0
    avg_latency_ms: int = 0
    cache_hit_rate: float = 0.0
    error_count: int = 0
    estimated_cost_usd: float = 0.0
    calls_by_endpoint: list[dict] = []


@router.get("/stats", response_model=MonitoringStatsResponse)
async def get_monitoring_stats(teacher: dict = Depends(get_current_teacher)):
    """Get 24h aggregate LLM metrics."""
    supabase = get_supabase_admin()

    # Aggregate stats
    try:
        stats_resp = await asyncio.to_thread(
            lambda: supabase.rpc("get_llm_stats_24h").execute()
        )
        row = stats_resp.data[0] if stats_resp.data else {}
    except Exception:
        logger.warning("RPC get_llm_stats_24h failed, falling back to empty stats")
        row = {}

    total_tokens = row.get("total_tokens") or 0
    est_cost = (total_tokens * 0.3 * 0.15 / 1_000_000) + (total_tokens * 0.7 * 0.60 / 1_000_000)

    # Breakdown by endpoint (top 10)
    cutoff = (datetime.now(tz=timezone.utc) - timedelta(hours=24)).isoformat()
    breakdown_resp = await asyncio.to_thread(
        lambda: supabase.table("llm_metrics")
        .select("endpoint")
        .gte("created_at", cutoff)
        .execute()
    )

    # Count by endpoint manually
    endpoint_counts: dict[str, int] = {}
    for r in (breakdown_resp.data or []):
        ep = r.get("endpoint", "unknown")
        endpoint_counts[ep] = endpoint_counts.get(ep, 0) + 1

    calls_by_endpoint = [
        {"endpoint": ep, "count": count}
        for ep, count in sorted(endpoint_counts.items(), key=lambda x: -x[1])[:10]
    ]

    return MonitoringStatsResponse(
        total_calls=row.get("total_calls") or 0,
        total_tokens=total_tokens,
        avg_latency_ms=round(row.get("avg_latency_ms") or 0),
        cache_hit_rate=round(row.get("cache_hit_rate") or 0, 2),
        error_count=row.get("error_count") or 0,
        estimated_cost_usd=round(est_cost, 4),
        calls_by_endpoint=calls_by_endpoint,
    )


@router.get("/calls", response_model=list[LLMCallOut])
async def get_recent_calls(
    limit: int = Query(default=50, le=200),
    teacher: dict = Depends(get_current_teacher),
):
    """Get recent LLM call log."""
    supabase = get_supabase_admin()
    resp = await asyncio.to_thread(
        lambda: supabase.table("llm_metrics")
        .select("id, created_at, endpoint, model, prompt_tokens, completion_tokens, total_tokens, latency_ms, cache_hit, success, error")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return [LLMCallOut(**r) for r in (resp.data or [])]
