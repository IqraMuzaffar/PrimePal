# Config

**File:** `backend/app/core/config.py`

Uses `pydantic-settings` to load configuration from environment variables and `.env` file.

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `APP_ENV` | `"development"` | Environment name |
| `SECRET_KEY` | `"change-me-in-production"` | App secret (must change in prod) |
| `DATABASE_URL` | `postgresql+asyncpg://...` | PostgreSQL connection string |
| `OPENAI_API_KEY` | `""` | OpenAI API key for LLM + embeddings |
| `CHAT_MODEL` | `"gpt-4o-mini"` | LLM model for chat/generation |
| `EMBEDDING_MODEL` | `"sentence-transformers/all-MiniLM-L6-v2"` | Embedding model identifier |
| `WHISPER_MODEL` | `"whisper-1"` | Speech-to-text model |
| `SUPABASE_URL` | `""` | Supabase project URL |
| `SUPABASE_ANON_KEY` | `""` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | `""` | Supabase service role key (bypasses RLS) |
| `STUDENT_JWT_SECRET` | `"change-student-secret-in-production"` | Custom JWT signing secret for students |
| `ALLOWED_ORIGINS` | `["http://localhost:3000"]` | CORS allowed origins |

## Usage
```python
from app.core.config import settings
print(settings.OPENAI_API_KEY)
```
