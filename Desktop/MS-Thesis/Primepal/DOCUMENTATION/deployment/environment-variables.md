# Environment Variables

All environment variables are defined in `backend/app/core/config.py` as fields on the `Settings` class (Pydantic BaseSettings). The backend loads these from a `.env` file or the process environment.

## Backend Variables

### Application

| Variable | Type | Default | Required | Description |
|----------|------|---------|----------|-------------|
| `APP_ENV` | `str` | `"development"` | No | Environment name. Set to `"production"` in production. |
| `SECRET_KEY` | `str` | `"change-me-in-production"` | **Yes (production)** | Secret key for general application use. Must be changed from default in production. |

### Database

| Variable | Type | Default | Required | Description |
|----------|------|---------|----------|-------------|
| `DATABASE_URL` | `str` | `"postgresql+asyncpg://user:password@localhost:5432/primepal"` | **Yes** | PostgreSQL connection string. Used for direct DB access. Format: `postgresql+asyncpg://user:pass@host:port/dbname`. |

### Vector Database (Qdrant)

| Variable | Type | Default | Required | Description |
|----------|------|---------|----------|-------------|
| `QDRANT_URL` | `str` | `"http://localhost:6333"` | No | Qdrant vector database URL. Configured but not actively used -- pgvector via Supabase is used instead. |
| `QDRANT_COLLECTION` | `str` | `"snc_curriculum"` | No | Qdrant collection name for SNC curriculum embeddings. |

### LLM / AI

| Variable | Type | Default | Required | Description |
|----------|------|---------|----------|-------------|
| `OPENAI_API_KEY` | `str` | `""` (empty) | **Yes** | OpenAI API key. Used for GPT-4o-mini (chat, missions, evaluations, translations, daily plans), GPT-4o (tutor responses), and Whisper (speech-to-text). |
| `EMBEDDING_MODEL` | `str` | `"sentence-transformers/all-MiniLM-L6-v2"` | No | Model used for generating text embeddings. Default uses a local, free HuggingFace model. |
| `CHAT_MODEL` | `str` | `"gpt-4o-mini"` | No | OpenAI model for cost-optimized chat completions. 90% cheaper than gpt-4o. |

### Speech-to-Text

| Variable | Type | Default | Required | Description |
|----------|------|---------|----------|-------------|
| `WHISPER_MODEL` | `str` | `"whisper-1"` | No | OpenAI Whisper model for speech transcription. Used by speaking practice and mission speaking endpoints. |

### Supabase

| Variable | Type | Default | Required | Description |
|----------|------|---------|----------|-------------|
| `SUPABASE_URL` | `str` | `""` (empty) | **Yes** | Supabase project URL (e.g., `https://xxxx.supabase.co`). |
| `SUPABASE_ANON_KEY` | `str` | `""` (empty) | **Yes** | Supabase anonymous/public key. Used for user-scoped queries that respect RLS. |
| `SUPABASE_SERVICE_ROLE_KEY` | `str` | `""` (empty) | **Yes** | Supabase service role key. Bypasses Row Level Security. Used for admin operations, background tasks, and cross-user queries. **Never expose to the frontend.** |

### Authentication

| Variable | Type | Default | Required | Description |
|----------|------|---------|----------|-------------|
| `STUDENT_JWT_SECRET` | `str` | `"change-student-secret-in-production"` | **Yes (production)** | Secret key for signing and verifying custom student JWTs. Separate from Supabase auth. Must be changed from default in production. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `int` | `1440` (24 hours) | No | Expiration time for student JWTs in minutes. |

### CORS

| Variable | Type | Default | Required | Description |
|----------|------|---------|----------|-------------|
| `ALLOWED_ORIGINS` | `List[str]` | `["http://localhost:3000"]` | **Yes (production)** | List of allowed CORS origins. Must include the frontend URL in production. |

## Frontend Variables

The frontend uses environment variables prefixed with `NEXT_PUBLIC_` for client-side access. These are typically set in `frontend/.env.local`.

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | **Yes** | Same Supabase project URL as backend |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Yes** | Same Supabase anonymous key as backend |
| `NEXT_PUBLIC_API_URL` | **Yes** | Backend API base URL (e.g., `http://localhost:8000`) |

## Docker Compose Variables

The `docker-compose.yml` passes these variables from the host environment to the backend container using `${VAR}` syntax:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `STUDENT_JWT_SECRET`
- `DATABASE_URL`

These must be set in the host `.env` file at the project root, or exported in the shell before running `docker-compose up`.

## Security Notes

1. **Change all default secrets** before production deployment: `SECRET_KEY`, `STUDENT_JWT_SECRET`.
2. **Never commit `.env` files** to version control. Both `backend/.env` and `frontend/.env.local` are in `.gitignore`.
3. **`SUPABASE_SERVICE_ROLE_KEY`** has full database access (bypasses RLS). Only the backend should have this key.
4. **`OPENAI_API_KEY`** has billing implications. Use rate limiting and caching to control costs.
5. **`ALLOWED_ORIGINS`** must be set to your actual frontend URL in production. Do not use `["*"]`.
