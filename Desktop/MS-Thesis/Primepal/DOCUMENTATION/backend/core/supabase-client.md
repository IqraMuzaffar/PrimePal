# Supabase Client

**File:** `backend/app/core/supabase_client.py`

Provides two Supabase client factory functions.

## Functions

### `get_supabase() -> Client`
Returns a Supabase client using the **anon key**. Respects RLS policies — queries are scoped to the authenticated user's permissions.

### `get_supabase_admin() -> Client`
Returns a Supabase client using the **service role key**. Bypasses ALL RLS policies. Used for server-side admin operations like:
- Embedding storage (pgvector inserts)
- Cross-user queries in evaluator reports
- Admin endpoint operations

## Usage
```python
from app.core.supabase_client import get_supabase, get_supabase_admin

supabase = get_supabase()
result = supabase.table("students").select("*").eq("classroom_id", cid).execute()

admin = get_supabase_admin()
admin.table("snc_knowledge_base").insert(records).execute()
```
