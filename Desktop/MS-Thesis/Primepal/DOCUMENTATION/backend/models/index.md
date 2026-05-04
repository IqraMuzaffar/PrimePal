# Backend Models

**Directory:** `backend/app/models/`

## Current Status

The `models/` directory contains only an empty `__init__.py` file. This is the result of dead code cleanup -- PrimePal does not use SQLAlchemy ORM models.

## Why No Models?

PrimePal accesses the database exclusively through the **Supabase Python client** (`supabase-py`), which provides a REST-like query interface:

```python
# Instead of SQLAlchemy models:
supabase.table("students").select("*").eq("classroom_id", cid).execute()
supabase.table("students").insert({"student_name": "Ali", ...}).execute()
supabase.table("students").update({"points": 30}).eq("id", sid).execute()
```

Database schema is managed through Supabase migrations (see [Database > Tables](../../database/tables.md)), and Row Level Security is handled at the Supabase/PostgreSQL level (see [Database > RLS Policies](../../database/rls-policies.md)).

Request/response validation is handled by Pydantic schemas in `app/schemas/` (see [schemas/](../schemas/index.md)) and agent-internal Pydantic models.

## File

| File | Contents |
|------|----------|
| `__init__.py` | Empty (placeholder) |
