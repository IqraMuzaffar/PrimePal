import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.cache import init_redis, close_redis
from app.core.supabase_client import get_supabase_admin
from app.core.rate_limit import limiter
from app.api.v1.router import api_router

import os
logging.basicConfig(level=getattr(logging, os.getenv("LOG_LEVEL", "INFO").upper(), logging.INFO))
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_redis(settings.REDIS_URL)
    yield
    await close_redis()


app = FastAPI(
    title="PrimePal API",
    description="AI-powered English language learning platform for Pakistani primary students",
    version="0.1.0",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "primepal-api"}


@app.get("/health/detailed")
async def health_detailed():
    """Detailed health check with dependency verification and LLM stats."""
    import time
    from app.core.cache import _redis_client

    supabase = get_supabase_admin()
    checks = {}

    # Database check
    try:
        start = time.monotonic()
        await asyncio.to_thread(lambda: supabase.table("classrooms").select("id").limit(1).execute())
        db_ms = int((time.monotonic() - start) * 1000)
        checks["database"] = {"ok": True, "latency_ms": db_ms}
    except Exception as e:
        checks["database"] = {"ok": False, "message": str(e)[:200]}

    # Redis check
    if _redis_client:
        try:
            await _redis_client.ping()
            checks["redis"] = {"ok": True}
        except Exception:
            checks["redis"] = {"ok": False, "message": "ping failed"}
    else:
        checks["redis"] = {"ok": False, "message": "not connected (graceful degradation)"}

    # OpenAI check (just verify key exists)
    checks["openai"] = {"ok": bool(settings.OPENAI_API_KEY)}

    # LLM stats (24h) — query llm_metrics table
    llm_24h = {}
    try:
        stats_resp = await asyncio.to_thread(
            lambda: supabase.rpc("get_llm_stats_24h", {}).execute()
        )
        if stats_resp.data and len(stats_resp.data) > 0:
            row = stats_resp.data[0]
            total_tokens = row.get("total_tokens") or 0
            # Estimate cost: assume 30% input ($0.15/M), 70% output ($0.60/M) for gpt-4o-mini
            est_cost = (total_tokens * 0.3 * 0.15 / 1_000_000) + (total_tokens * 0.7 * 0.60 / 1_000_000)
            llm_24h = {
                "total_calls": row.get("total_calls") or 0,
                "total_tokens": total_tokens,
                "avg_latency_ms": round(row.get("avg_latency_ms") or 0),
                "cache_hit_rate": round(row.get("cache_hit_rate") or 0, 2),
                "error_count": row.get("error_count") or 0,
                "estimated_cost_usd": round(est_cost, 4),
            }
    except Exception as e:
        llm_24h = {"error": f"Could not fetch stats: {str(e)[:100]}"}

    all_ok = all(c.get("ok", False) for c in checks.values())

    return {
        "status": "healthy" if all_ok else "degraded",
        "checks": checks,
        "llm_24h": llm_24h,
    }
