# Deployment

## Subsections

| File | Description |
|------|-------------|
| [environment-variables.md](environment-variables.md) | All env vars for backend and frontend |
| [docker.md](docker.md) | Docker Compose setup and container details |
| [production-checklist.md](production-checklist.md) | Pre-deployment verification checklist |

## Architecture Overview

```
                        Internet
                           |
                    +--------------+
                    |  Reverse     |
                    |  Proxy/CDN   |
                    +--------------+
                      /          \
             +--------+        +--------+
             |Frontend|        |Backend |
             |Next.js |        |FastAPI |
             |:3000   |        |:8000   |
             +--------+        +--------+
                                /      \
                        +------+      +-------+
                        |Redis |      |Supabase|
                        |:6379 |      |(Cloud) |
                        +------+      +-------+
                                      |  |  |  |
                               PostgreSQL pgvector
                               GoTrue Auth  Storage
```

PrimePal runs as two application services (Next.js frontend, FastAPI backend) with Redis for caching and Supabase as the managed database, auth, and storage layer.

### Service Roles

| Service | Role | Port |
|---------|------|------|
| **Frontend** | Next.js 14 app -- teacher and student UIs | 3000 |
| **Backend** | FastAPI app -- REST API, LLM orchestration, RAG pipeline | 8000 |
| **Redis** | Cache layer -- LLM response caching to reduce OpenAI spend | 6379 |
| **Supabase** | PostgreSQL + pgvector + GoTrue auth + file storage (cloud-hosted) | N/A |

## Quick Deploy (Development)

```bash
# 1. Clone and configure
cp backend/.env.example backend/.env     # Edit with real credentials
cp frontend/.env.local.example frontend/.env.local

# 2. Start backend + Redis via Docker Compose
docker-compose up -d

# 3. Verify backend is healthy
curl http://localhost:8000/health

# 4. Start frontend (separate process)
cd frontend && npm install && npm run dev

# 5. Run database migrations (if first deploy)
cd supabase && supabase db push
```

## Quick Deploy (Production)

```bash
# 1. Set all env vars (see environment-variables.md)
# 2. Build and start services
docker-compose up -d --build

# 3. Build and start frontend
cd frontend && npm run build && npm start

# 4. Verify health
curl http://localhost:8000/health

# 5. Run production checklist (see production-checklist.md)
```

## Key Decisions

- **Supabase is cloud-hosted** -- not part of Docker Compose. The backend connects to it via `SUPABASE_URL` and service role key.
- **Redis is local** -- runs as a Docker container alongside the backend. Used for caching LLM outputs (missions, stories, spelling words) to reduce OpenAI API costs.
- **Frontend is deployed separately** -- not in Docker Compose. Can be deployed to Vercel, or run via `npm start` behind a reverse proxy.
- **Two auth systems** -- Teachers use Supabase GoTrue (email/password). Students use custom PyJWT (avatar + PIN login). See [architecture/auth-flows.md](../architecture/auth-flows.md).
