# Docker Compose Setup

Source file: `docker-compose.yml` (Compose version 3.8)

## Services

### redis

| Property | Value |
|----------|-------|
| Image | `redis:7-alpine` |
| Port mapping | `6379:6379` |
| Volume | `redis_data:/data` (named volume, persistent) |
| Healthcheck | `redis-cli ping` every 5s, timeout 3s, 5 retries |

Redis serves as the caching layer for LLM-generated content. Cached items include:

- Daily missions (1h TTL)
- Pillar missions (1h TTL)
- Student profiles (5min TTL)
- Leaderboards (10min TTL)
- Weekly progress (5min TTL)
- Daily summaries (2min TTL)
- Teacher daily plans (6h TTL)

### backend

| Property | Value |
|----------|-------|
| Build context | `./backend` |
| Dockerfile | `./backend/Dockerfile` |
| Port mapping | `8000:8000` |
| Depends on | `redis` (condition: `service_healthy`) |
| Healthcheck | `curl -f http://localhost:8000/health` every 10s, timeout 5s, 5 retries |

**Environment variables passed from host `.env`:**

| Variable | Purpose |
|----------|---------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anonymous/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (admin access) |
| `OPENAI_API_KEY` | OpenAI API key for LLM and Whisper |
| `STUDENT_JWT_SECRET` | Secret for signing student JWTs |
| `DATABASE_URL` | Direct PostgreSQL connection string |

The backend container waits for Redis to be healthy before starting. It runs the FastAPI app via Uvicorn on port 8000.

## Volumes

| Volume | Mount | Purpose |
|--------|-------|---------|
| `redis_data` | `/data` inside Redis container | Persists Redis RDB snapshots across container restarts |

## Networks

Docker Compose creates a default bridge network. Both `redis` and `backend` services share this network. The backend connects to Redis at `redis:6379` (Docker DNS resolution).

## Usage

```bash
# Start all services (detached)
docker-compose up -d

# View logs
docker-compose logs -f backend
docker-compose logs -f redis

# Rebuild after code changes
docker-compose up -d --build

# Stop all services
docker-compose down

# Stop and remove volumes (destroys Redis cache)
docker-compose down -v
```

## What Is Not in Docker Compose

| Component | Reason |
|-----------|--------|
| **Frontend (Next.js)** | Deployed separately (Vercel, or `npm start` behind reverse proxy) |
| **Supabase** | Cloud-hosted SaaS -- accessed via `SUPABASE_URL` env var |
| **Qdrant** | Vector DB is configured in `config.py` but not used in production (pgvector via Supabase is used instead) |

## Production Considerations

1. **Redis persistence**: The `redis_data` volume persists cache across restarts. For production, consider configuring Redis `maxmemory` and eviction policy (`allkeys-lru`).
2. **Backend replicas**: For horizontal scaling, run multiple backend containers behind a load balancer. Redis caching ensures LLM call deduplication.
3. **Health checks**: Both services have health checks. Use an orchestrator (Docker Swarm, Kubernetes) to restart unhealthy containers.
4. **Secrets management**: Environment variables are loaded from the host `.env` file via `${VAR}` interpolation. In production, use a secrets manager instead of `.env` files on disk.
5. **Redis URL**: Currently hardcoded as `redis://localhost:6379` in the backend. When running in Docker, the backend connects via the Docker network using `redis://redis:6379`. See TICKETS/01 for the planned fix to make this configurable via env var.
