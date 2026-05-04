# Backend Core Modules

Core modules provide shared infrastructure used across all endpoints and agents.

## Modules

| File | Description | Link |
|------|-------------|------|
| `config.py` | Application settings via pydantic-settings (.env) | [config.md](config.md) |
| `security.py` | JWT creation/validation, FastAPI auth dependencies for teachers, students, and admins | [security.md](security.md) |
| `supabase_client.py` | Supabase client factory (anon + service role), `@lru_cache` singletons | [supabase-client.md](supabase-client.md) |
| `cache.py` | Redis initialization, cache get/set/delete helpers, key builder | [cache.md](cache.md) |
| `permissions.py` | Role-based permission system (admin wildcard, teacher granular) | [permissions.md](permissions.md) |

## Quick Reference

```python
# Configuration
from app.core.config import settings
settings.OPENAI_API_KEY  # read any setting

# Auth dependencies (use in FastAPI route signatures)
from app.core.security import get_current_student, get_current_teacher, get_current_admin

# DB access
from app.core.supabase_client import get_supabase, get_supabase_admin

# Caching
from app.core.cache import cache_get, cache_set, cache_delete, make_cache_key

# Permissions
from app.core.permissions import check_permission
check_permission(teacher_dict, "report:read")
```
