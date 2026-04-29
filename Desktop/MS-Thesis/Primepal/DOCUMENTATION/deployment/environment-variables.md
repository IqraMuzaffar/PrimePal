# Environment Variables

## Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project URL (`https://xxx.supabase.co`) |
| `SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (bypasses RLS) |
| `OPENAI_API_KEY` | Yes | OpenAI API key for LLM + embeddings + Whisper |
| `STUDENT_JWT_SECRET` | Yes | Custom secret for student JWT signing (HS256) |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SECRET_KEY` | Yes | App-level secret key |
| `APP_ENV` | No | `development` or `production` (default: development) |
| `ALLOWED_ORIGINS` | No | Comma-separated CORS origins (default: `http://localhost:3000`) |
| `CHAT_MODEL` | No | OpenAI model (default: `gpt-4o-mini`) |
| `WHISPER_MODEL` | No | STT model (default: `whisper-1`) |

## Frontend (`frontend/.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | Backend API base URL (e.g., `http://localhost:8000/api/v1`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |

## Docker Compose

The `docker-compose.yml` reads from the backend `.env` file and passes these variables to the backend container:
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`, `STUDENT_JWT_SECRET`, `DATABASE_URL`

## Production Notes

- `SECRET_KEY` must be changed from the default `change-me-in-production`
- `STUDENT_JWT_SECRET` must be changed from the default
- `ALLOWED_ORIGINS` must include the production frontend domain
- Never commit `.env` or `.env.local` to version control
- Rotate all secrets before first production deployment
