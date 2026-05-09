"""
Lightweight LLM call tracker — logs metrics to llm_metrics table.

Usage:
    # For LLM calls:
    async with track_llm("missions/daily", model="gpt-4o-mini", student_id=sid, classroom_id=cid) as tracker:
        result = await client.chat.completions.create(...)
        tracker.set_usage(result.usage)  # optional — extracts token counts

    # For cache hits:
    await log_cache_hit("missions/daily", student_id=sid, classroom_id=cid)
"""

import asyncio
import logging
import time
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from typing import Optional

from app.core.supabase_client import get_supabase_admin

logger = logging.getLogger(__name__)


@dataclass
class _TrackerState:
    endpoint: str
    model: str
    student_id: Optional[str] = None
    classroom_id: Optional[str] = None
    prompt_tokens: Optional[int] = None
    completion_tokens: Optional[int] = None
    total_tokens: Optional[int] = None
    success: bool = True
    error: Optional[str] = None
    _start: float = field(default_factory=time.monotonic)

    def set_usage(self, usage) -> None:
        """Extract token counts from OpenAI usage object."""
        if usage is None:
            return
        self.prompt_tokens = getattr(usage, "prompt_tokens", None)
        self.completion_tokens = getattr(usage, "completion_tokens", None)
        self.total_tokens = getattr(usage, "total_tokens", None)

    def set_tokens(self, prompt: int = 0, completion: int = 0) -> None:
        """Manually set token counts."""
        self.prompt_tokens = prompt
        self.completion_tokens = completion
        self.total_tokens = prompt + completion

    @property
    def latency_ms(self) -> int:
        return int((time.monotonic() - self._start) * 1000)


def _insert_metric(state: _TrackerState) -> None:
    """Synchronous insert — called via asyncio.to_thread for non-blocking."""
    try:
        supabase = get_supabase_admin()
        supabase.table("llm_metrics").insert({
            "endpoint": state.endpoint,
            "model": state.model,
            "prompt_tokens": state.prompt_tokens,
            "completion_tokens": state.completion_tokens,
            "total_tokens": state.total_tokens,
            "latency_ms": state.latency_ms,
            "cache_hit": False,
            "success": state.success,
            "error": state.error,
            "student_id": state.student_id,
            "classroom_id": state.classroom_id,
        }).execute()
    except Exception as e:
        logger.warning("Failed to log LLM metric: %s", e)


@asynccontextmanager
async def track_llm(
    endpoint: str,
    model: str = "gpt-4o-mini",
    student_id: str | None = None,
    classroom_id: str | None = None,
):
    """Async context manager that tracks an LLM call's latency, tokens, and success."""
    state = _TrackerState(
        endpoint=endpoint,
        model=model,
        student_id=student_id,
        classroom_id=classroom_id,
    )
    try:
        yield state
    except Exception as exc:
        state.success = False
        state.error = str(exc)[:500]
        raise
    finally:
        # Non-blocking insert
        asyncio.get_event_loop().run_in_executor(None, _insert_metric, state)


async def log_cache_hit(
    endpoint: str,
    student_id: str | None = None,
    classroom_id: str | None = None,
) -> None:
    """Log a cache hit (no LLM call made)."""
    try:
        supabase = get_supabase_admin()
        await asyncio.to_thread(
            lambda: supabase.table("llm_metrics").insert({
                "endpoint": endpoint,
                "model": "cache",
                "latency_ms": 0,
                "cache_hit": True,
                "success": True,
                "student_id": student_id,
                "classroom_id": classroom_id,
            }).execute()
        )
    except Exception as e:
        logger.warning("Failed to log cache hit: %s", e)
