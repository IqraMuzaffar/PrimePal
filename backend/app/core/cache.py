"""
Redis caching utility for PrimePal.
Reduces load on OpenAI LLM and database by caching frequently accessed data.

Falls back to an in-memory TTL cache when Redis is unavailable (e.g., in
production environments without a Redis instance configured). The in-memory
cache works well for single-instance deployments (DigitalOcean App Platform).
"""
import json
import logging
import time
from typing import Any, Optional

try:
    from redis import asyncio as aioredis
except ImportError:
    aioredis = None

logger = logging.getLogger(__name__)

# Global Redis client (initialized on startup)
_redis_client: Optional[Any] = None

# ---------------------------------------------------------------------------
# In-memory fallback cache (used when Redis is unavailable)
# ---------------------------------------------------------------------------
_mem_cache: dict[str, tuple[Any, float]] = {}  # key → (value, expires_at)
_mem_cache_enabled: bool = False  # set True when Redis fails


def _mem_get(key: str) -> Optional[Any]:
    entry = _mem_cache.get(key)
    if entry is None:
        return None
    value, expires_at = entry
    if time.monotonic() > expires_at:
        _mem_cache.pop(key, None)
        return None
    return value


def _mem_set(key: str, value: Any, ttl: int) -> None:
    _mem_cache[key] = (value, time.monotonic() + ttl)
    # Evict stale entries to bound memory usage (keep at most 2000 entries)
    if len(_mem_cache) > 2000:
        now = time.monotonic()
        expired = [k for k, (_, exp) in _mem_cache.items() if exp < now]
        for k in expired[:500]:
            _mem_cache.pop(k, None)


def _mem_delete(key: str) -> None:
    _mem_cache.pop(key, None)


def _mem_delete_pattern(pattern: str) -> int:
    """Simple glob-style pattern delete (supports trailing * only)."""
    import fnmatch
    keys = list(_mem_cache.keys())
    deleted = 0
    for k in keys:
        if fnmatch.fnmatch(k, pattern):
            _mem_cache.pop(k, None)
            deleted += 1
    return deleted


# ---------------------------------------------------------------------------
# Redis lifecycle
# ---------------------------------------------------------------------------

async def init_redis(redis_url: str = "redis://localhost:6379") -> None:
    """Initialize Redis connection pool. Falls back to in-memory cache on failure."""
    global _redis_client, _mem_cache_enabled
    if aioredis is None:
        logger.warning("aioredis not installed. Using in-memory cache fallback.")
        _mem_cache_enabled = True
        return
    try:
        _redis_client = await aioredis.from_url(redis_url, encoding="utf8", decode_responses=True)
        await _redis_client.ping()
        logger.info("Redis connection established")
        _mem_cache_enabled = False
    except Exception as e:
        logger.warning(f"Redis connection failed: {e}. Using in-memory cache fallback.")
        _redis_client = None
        _mem_cache_enabled = True


async def close_redis() -> None:
    """Close Redis connection."""
    global _redis_client
    if _redis_client:
        await _redis_client.close()


# ---------------------------------------------------------------------------
# Public cache API
# ---------------------------------------------------------------------------

async def cache_get(key: str) -> Optional[Any]:
    """Retrieve cached value (returns None if not found)."""
    if _mem_cache_enabled:
        return _mem_get(key)
    if not _redis_client:
        return None
    try:
        value = await _redis_client.get(key)
        if value:
            return json.loads(value)
    except Exception as e:
        logger.warning(f"Cache get error for {key}: {e}")
    return None


async def cache_set(key: str, value: Any, ttl: int = 3600) -> bool:
    """Store value in cache with TTL (in seconds). Returns True if successful."""
    if _mem_cache_enabled:
        _mem_set(key, value, ttl)
        return True
    if not _redis_client:
        return False
    try:
        await _redis_client.setex(key, ttl, json.dumps(value, default=str))
        return True
    except Exception as e:
        logger.warning(f"Cache set error for {key}: {e}")
        return False


async def cache_delete(key: str) -> bool:
    """Delete cached value. Returns True if successful."""
    if _mem_cache_enabled:
        _mem_delete(key)
        return True
    if not _redis_client:
        return False
    try:
        await _redis_client.delete(key)
        return True
    except Exception as e:
        logger.warning(f"Cache delete error for {key}: {e}")
        return False


async def cache_delete_pattern(pattern: str) -> int:
    """Delete all keys matching a glob pattern. Returns count of deleted keys."""
    if _mem_cache_enabled:
        return _mem_delete_pattern(pattern)
    if not _redis_client:
        return 0
    try:
        deleted = 0
        async for key in _redis_client.scan_iter(match=pattern, count=100):
            await _redis_client.delete(key)
            deleted += 1
        return deleted
    except Exception as e:
        logger.warning(f"Cache pattern delete error for {pattern}: {e}")
        return 0


def make_cache_key(*parts: str) -> str:
    """Build a cache key from multiple parts."""
    return ":".join(parts)


async def should_invalidate(student_id: str, ttl: int = 60) -> bool:
    """
    Debounce cache invalidation: returns True only if this student's caches
    haven't been invalidated in the last `ttl` seconds. Prevents rapid
    re-invalidation during a mission session (e.g., answering 10 questions).
    """
    debounce_key = f"invalidation_lock:{student_id}"
    if await cache_get(debounce_key):
        return False  # Already invalidated recently
    await cache_set(debounce_key, True, ttl=ttl)
    return True


async def debounced_invalidate(student_id: str, invalidators: list) -> None:
    """
    Run cache invalidation functions only if not recently invalidated.
    Each invalidator is an async callable that takes student_id.
    """
    if not await should_invalidate(student_id):
        return
    for fn in invalidators:
        await fn(student_id)


async def get_cached_grade_level(classroom_id: str) -> int:
    """Fetch classroom grade level with 24-hour cache. Grades don't change mid-year."""
    import asyncio
    from app.core.supabase_client import get_supabase_admin

    cache_key = make_cache_key("grade_level", classroom_id)
    cached = await cache_get(cache_key)
    if cached is not None:
        return cached

    supabase = get_supabase_admin()
    resp = await asyncio.to_thread(
        lambda: supabase.table("classrooms")
        .select("grade_level")
        .eq("id", classroom_id)
        .maybe_single()
        .execute()
    )
    if not resp.data:
        return 3  # safe default
    grade = resp.data["grade_level"]
    await cache_set(cache_key, grade, ttl=86400)  # 24 hours
    return grade
