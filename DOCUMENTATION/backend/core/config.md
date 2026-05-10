# Config

**File:** `backend/app/core/config.py`

Uses `pydantic-settings` (`BaseSettings`) to load configuration from environment variables and a `.env` file. The settings object is instantiated as a module-level singleton `settings = Settings()`.

## Settings Class

```python
class Settings(BaseSettings):
    class Config:
        env_file = ".env"
```

## All Fields

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `APP_ENV` | `str` | `"development"` | Environment name (development/production) |
| `SECRET_KEY` | `str` | `"change-me-in-production"` | General app secret key |
| `DATABASE_URL` | `str` | `"postgresql+asyncpg://user:password@localhost:5432/primepal"` | PostgreSQL connection string (not actively used -- Supabase client is the primary DB interface) |
| `QDRANT_URL` | `str` | `"http://localhost:6333"` | Qdrant vector DB URL (unused -- pgvector is used instead) |
| `QDRANT_COLLECTION` | `str` | `"snc_curriculum"` | Qdrant collection name (unused) |
| `OPENAI_API_KEY` | `str` | `""` | OpenAI API key for LLM calls and Whisper |
| `EMBEDDING_MODEL` | `str` | `"sentence-transformers/all-MiniLM-L6-v2"` | Local HuggingFace embedding model (384 dims, free, no API cost) |
| `CHAT_MODEL` | `str` | `"gpt-4o-mini"` | LLM model for chat, missions, evaluations (90% cheaper than gpt-4o) |
| `WHISPER_MODEL` | `str` | `"whisper-1"` | OpenAI speech-to-text model |
| `SUPABASE_URL` | `str` | `""` | Supabase project URL |
| `SUPABASE_ANON_KEY` | `str` | `""` | Supabase anon/public key (respects RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | `str` | `""` | Supabase service role key (bypasses RLS) |
| `STUDENT_JWT_SECRET` | `str` | `"change-student-secret-in-production"` | Custom JWT signing secret for student tokens |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `int` | `1440` | Token expiry (24 hours; note: `security.py` uses its own `TOKEN_EXPIRE_HOURS = 24` constant) |
| `ALLOWED_ORIGINS` | `List[str]` | `["http://localhost:3000"]` | CORS allowed origins for CORSMiddleware |

## Usage

```python
from app.core.config import settings

# Access any setting
settings.OPENAI_API_KEY
settings.CHAT_MODEL          # "gpt-4o-mini"
settings.SUPABASE_URL
settings.ALLOWED_ORIGINS     # ["http://localhost:3000"]
```

## Notes

- The `DATABASE_URL` and Qdrant settings are vestigial -- all DB access goes through the Supabase client, and pgvector replaces Qdrant.
- In production, override all default secrets (`SECRET_KEY`, `STUDENT_JWT_SECRET`) via environment variables or `.env`.
- The `.env` file is loaded automatically by pydantic-settings via `Config.env_file = ".env"`.
