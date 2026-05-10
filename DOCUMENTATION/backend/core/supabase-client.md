# Supabase Client

**File:** `backend/app/core/supabase_client.py`

Provides two Supabase client factory functions, both cached as singletons via `@lru_cache(maxsize=1)`.

## Functions

### `get_supabase() -> Client`

Returns a Supabase client using the **anon key** (`settings.SUPABASE_ANON_KEY`).

- **Respects RLS** -- Queries are scoped to the authenticated user's Row Level Security policies
- **Use for:** Public-facing queries where RLS should enforce access control
- **Cached:** `@lru_cache(maxsize=1)` -- only one instance is ever created

```python
@lru_cache(maxsize=1)
def get_supabase() -> Client:
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
```

### `get_supabase_admin() -> Client`

Returns a Supabase client using the **service role key** (`settings.SUPABASE_SERVICE_ROLE_KEY`).

- **Bypasses ALL RLS** -- Full unrestricted access to all tables and rows
- **Use for:** Trusted server-side operations only
- **Cached:** `@lru_cache(maxsize=1)` -- only one instance is ever created

```python
@lru_cache(maxsize=1)
def get_supabase_admin() -> Client:
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
```

## When to Use Which

| Client | When |
|--------|------|
| `get_supabase()` | Validating teacher GoTrue JWTs via `supabase.auth.get_user(token)` |
| `get_supabase_admin()` | All other database operations: reads, writes, cross-user queries, embedding storage, interaction logging, evaluator reports, admin operations |

In practice, `get_supabase_admin()` is the more commonly used client because most server-side operations need to bypass RLS (e.g., reading a student's classroom, writing interaction logs, generating evaluator reports across students).

## Usage

```python
from app.core.supabase_client import get_supabase, get_supabase_admin

# Teacher GoTrue validation
supabase = get_supabase()
response = supabase.auth.get_user(token)

# Database operations (bypasses RLS)
admin = get_supabase_admin()
result = admin.table("students").select("*").eq("classroom_id", cid).execute()
admin.table("snc_knowledge_base").insert(records).execute()
admin.rpc("match_snc_documents", params).execute()
```
