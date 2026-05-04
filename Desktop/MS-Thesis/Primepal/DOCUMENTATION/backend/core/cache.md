# Cache (Redis)

**File:** `backend/app/core/cache.py`

Redis-based caching utility for PrimePal. Reduces load on OpenAI LLM and the database by caching frequently accessed data. Uses `redis.asyncio` (aioredis) for non-blocking operations.

## Module State

```python
_redis_client: Optional[aioredis.Redis] = None  # Global, initialized on startup
```

Redis is optional -- if the connection fails, caching is silently disabled (all `cache_get` calls return `None`, all `cache_set` calls return `False`).

## Lifecycle Functions

### `init_redis(redis_url: str = "redis://localhost:6379") -> None`

Initializes the Redis connection pool. Called during FastAPI lifespan startup in `main.py`.

- Creates client with `encoding="utf8"` and `decode_responses=True`
- Sends a `PING` to verify connectivity
- On failure: logs a warning and sets `_redis_client = None` (caching disabled)

### `close_redis() -> None`

Closes the Redis connection. Called during FastAPI lifespan shutdown.

## Cache Operations

### `cache_get(key: str) -> Optional[Any]`

Retrieves a cached value. Returns `None` if:
- Redis is unavailable (`_redis_client is None`)
- Key not found
- Any exception during retrieval

Values are deserialized from JSON via `json.loads()`.

### `cache_set(key: str, value: Any, ttl: int = 3600) -> bool`

Stores a value in cache with a TTL (time-to-live) in seconds.

- **Default TTL:** 3600 seconds (1 hour)
- Values are serialized via `json.dumps(value, default=str)` (the `default=str` handles datetime objects)
- Uses `SETEX` (atomic set + expire)
- Returns `True` on success, `False` on failure or Redis unavailable

### `cache_delete(key: str) -> bool`

Deletes a cached value. Returns `True` on success, `False` on failure or Redis unavailable.

### `make_cache_key(*parts: str) -> str`

Builds a colon-delimited cache key from multiple parts.

```python
make_cache_key("performance_profile", student_id)
# -> "performance_profile:abc123-def456"
```

## Known Cache Key Patterns

| Key Pattern | TTL | Used By |
|-------------|-----|---------|
| `teacher_role:{user_id}` | 3600s (1hr) | `security.py` -- teacher/admin role lookups |
| `performance_profile:{student_id}` | 3600s (1hr) | `performance_profile.py` -- per-student adaptive difficulty data |

Additional cache keys may be used by endpoint modules (missions, stories, spelling) with varying TTLs.

## Error Handling

All cache operations are wrapped in try/except blocks. Errors are logged as warnings but never propagated to callers. This ensures a Redis outage degrades performance (more LLM calls, more DB queries) but never crashes student-facing requests.
