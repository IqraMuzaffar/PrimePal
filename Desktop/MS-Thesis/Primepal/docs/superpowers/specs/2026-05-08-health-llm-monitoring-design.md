# System Health & LLM Monitoring — Design Spec

**Date:** 2026-05-08

## Overview

Add a lightweight monitoring system that tracks LLM call performance (latency, tokens, cost, errors) and system health (DB, Redis, OpenAI connectivity). Data stored in existing Supabase. Viewable via a new admin dashboard page. Zero additional infrastructure cost.

## Database: `llm_metrics` table

Migration `038_llm_metrics.sql`:

```sql
CREATE TABLE IF NOT EXISTS llm_metrics (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    endpoint VARCHAR(100) NOT NULL,
    model VARCHAR(50) NOT NULL,
    prompt_tokens INT,
    completion_tokens INT,
    total_tokens INT,
    latency_ms INT NOT NULL,
    cache_hit BOOLEAN NOT NULL DEFAULT FALSE,
    success BOOLEAN NOT NULL DEFAULT TRUE,
    error TEXT,
    student_id UUID,
    classroom_id UUID
);

CREATE INDEX idx_llm_metrics_created_at ON llm_metrics (created_at DESC);
CREATE INDEX idx_llm_metrics_endpoint ON llm_metrics (endpoint);
```

No RLS needed — only admin endpoints read this table, using service role client.

## Backend: `backend/app/core/llm_tracker.py`

### `track_llm()` — async context manager

Wraps any LLM call. Measures latency, extracts token usage from response, inserts a row into `llm_metrics` as a non-blocking background insert.

```python
async with track_llm("missions/daily", model="gpt-4o-mini", student_id=sid, classroom_id=cid) as tracker:
    result = await chain.ainvoke({...})
    tracker.set_tokens(result)  # extracts prompt/completion tokens
```

On exit, inserts to `llm_metrics` via `asyncio.to_thread` (non-blocking). On exception, sets `success=False` and captures `error`.

### `log_cache_hit()` — simple function

For cache hits (no LLM call made), logs a row with `cache_hit=True`, `latency_ms=0`, `total_tokens=0`.

```python
await log_cache_hit("missions/daily", student_id=sid, classroom_id=cid)
```

### Token extraction

- **Direct OpenAI calls** (`chat.completions.create`): `response.usage.prompt_tokens`, `response.usage.completion_tokens`
- **LangChain calls** (`chain.ainvoke`): Access via `result` Pydantic model — LangChain doesn't expose token counts directly. Use `tiktoken` estimation or set tokens to null.
- **Whisper calls**: No token count — set `prompt_tokens=null`, `total_tokens=null`, track latency only.
- **Streaming calls**: Token counts unavailable mid-stream. Log latency + endpoint only, tokens null.

Pragmatic approach: log what's available. Latency and endpoint are always available; tokens are best-effort.

## Backend: Health Endpoints

### `GET /health/detailed` (no auth)

Checks:
- **Database**: `SELECT 1` via Supabase, measure latency
- **Redis**: `ping()` if connected, report status
- **OpenAI**: Check if API key is set (don't make a real call — too expensive for health checks)

Also queries `llm_metrics` for 24h aggregates:
- `total_calls`: COUNT(*)
- `total_tokens`: SUM(total_tokens)
- `avg_latency_ms`: AVG(latency_ms)
- `cache_hit_rate`: COUNT(cache_hit=true) / COUNT(*)
- `error_count`: COUNT(success=false)
- `estimated_cost_usd`: calculated from total_tokens using gpt-4o-mini pricing ($0.15/M input, $0.60/M output)

### `GET /admin/monitoring/stats` (admin auth)

Same aggregates as above but with more detail:
- Breakdown by endpoint (top 5 by call count)
- Breakdown by model
- 24h and 7d windows

### `GET /admin/monitoring/calls?limit=50` (admin auth)

Returns last N `llm_metrics` rows ordered by `created_at DESC`.

## Backend: Where to instrument

Add `track_llm()` wrapper to these call sites:

| File | Function | Endpoint label |
|------|----------|---------------|
| `missions.py` | `get_daily_missions` | `missions/daily` |
| `missions.py` | `get_pillar_missions` | `missions/pillar` |
| `missions.py` | `submit_speaking_answer` | `missions/speaking` |
| `puzzle_palace.py` | `get_puzzle_palace_rooms` | `puzzle-palace/rooms` |
| `story_time.py` | `get_story` | `story-time/story` |
| `speaking.py` | `get_speaking_prompts` | `speaking/prompts` |
| `speaking.py` | `evaluate_speaking` | `speaking/evaluate` |
| `speaking.py` | `evaluate_pronunciation` | `speaking/evaluate-pro` |
| `chat.py` | `chat` | `chat/stream` |
| `chatbot.py` | `translate_to_english` | `chat/translate` |
| `evaluator.py` | insight report calls | `evaluator/insights` |

Add `log_cache_hit()` at each cache-hit early return in the above endpoints.

## Frontend: `/admin/dashboard/monitoring/page.tsx`

### Layout

**Top row — 3 health status cards:**
- Database (green/red dot + latency)
- Redis (green/yellow dot + status message)
- OpenAI (green/red dot)

**Middle row — 6 stat cards (24h):**
- Total LLM Calls
- Total Tokens Used
- Avg Latency
- Cache Hit Rate (%)
- Error Count
- Estimated Cost ($)

**Bottom — Recent LLM calls table (last 50):**

| Time | Endpoint | Model | Tokens | Latency | Cache | Status |
|------|----------|-------|--------|---------|-------|--------|

Auto-refreshes every 30 seconds via React Query with `refetchInterval: 30000`.

### Auth

Uses existing admin auth (`getAdminHeaders()` from `lib/adminAuth.ts`).

### Queries

Add to `frontend/lib/hooks/admin-queries.ts`:
- `useMonitoringStats()` → `GET /admin/monitoring/stats`
- `useMonitoringCalls(limit)` → `GET /admin/monitoring/calls?limit=50`
- `useHealthDetailed()` → `GET /health/detailed`

## Out of Scope

- Charts/graphs (no charting library)
- Alerting/notifications
- Per-student cost breakdown
- Prometheus/Grafana/external services
- Log aggregation
- Historical data retention policy (keep all data for thesis duration)
