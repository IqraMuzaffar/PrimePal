"""
Redis caching utility for PrimePal.
Reduces load on OpenAI LLM and database by caching frequently accessed data.
"""
import json
import logging
from typing import Any, Optional

try:
    from redis import asyncio as aioredis
except ImportError:
    aioredis = None

logger = logging.getLogger(__name__)

# Global Redis client (initialized on startup)
_redis_client: Optional[aioredis.Redis] = None


async def init_redis(redis_url: str = "redis://localhost:6379") -> None:
    """Initialize Redis connection pool."""
    global _redis_client
    try:
        _redis_client = await aioredis.from_url(redis_url, encoding="utf8", decode_responses=True)
        await _redis_client.ping()
        logger.info("Redis connection established")
    except Exception as e:
        logger.warning(f"Redis connection failed: {e}. Caching disabled.")
        _redis_client = None


async def close_redis() -> None:
    """Close Redis connection."""
    global _redis_client
    if _redis_client:
        await _redis_client.close()


async def cache_get(key: str) -> Optional[Any]:
    """Retrieve cached value (returns None if not found or Redis unavailable)."""
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
