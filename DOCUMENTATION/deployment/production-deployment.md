# Production Deployment — PrimePal

Deployed: 2026-05-10. This document covers the live production setup, how to manage it, and how to troubleshoot.

## Live URLs

| Service | URL | Platform |
|---------|-----|----------|
| **Frontend** | https://prime-pal-alpha.vercel.app | Vercel (Hobby) |
| **Backend API** | https://primepalbe-ymrsb.ondigitalocean.app | DigitalOcean App Platform |
| **API Base Path** | https://primepalbe-ymrsb.ondigitalocean.app/api/v1 | — |
| **Health Check** | https://primepalbe-ymrsb.ondigitalocean.app/health | — |
| **Detailed Health** | https://primepalbe-ymrsb.ondigitalocean.app/health/detailed | — |
| **Database** | https://ygpfvkffzrzijqekflep.supabase.co | Supabase (Cloud) |

## Architecture Diagram

```
    Users in Lahore, Pakistan
            |
    +-----------------+          +-----------------------------+
    |  Vercel CDN     |          |  DigitalOcean App Platform  |
    |  (126 PoPs)     |          |  Region: Bangalore (blr)    |
    +-----------------+          +-----------------------------+
    |  Frontend       |  HTTPS   |  Backend (FastAPI)          |
    |  Next.js 14     | -------> |  Python 3.12                |
    |  Region: Mumbai |          |  2 Uvicorn workers          |
    |  (bom1)         |          |  Port: 8000                 |
    +-----------------+          +-----------------------------+
                                    |              |
                              +----------+   +-----------+
                              | Supabase |   | OpenAI    |
                              | Postgres |   | gpt-4o-mini|
                              | pgvector |   | whisper-1 |
                              | GoTrue   |   | embeddings|
                              +----------+   +-----------+
```

**Note:** Redis is not currently provisioned. The backend runs with graceful degradation — caching is disabled, LLM responses are not cached. The app is fully functional without Redis; responses may be slightly slower on repeated queries.

## Frontend — Vercel

### Platform Details

| Setting | Value |
|---------|-------|
| Platform | Vercel Hobby (free) |
| Framework | Next.js 14.2.35 |
| Root Directory | `frontend` |
| Region (Serverless Functions) | Mumbai, India (`bom1`) |
| Build Command | `npm run build` (auto-detected) |
| Output | Auto (not standalone — Vercel manages this) |
| Auto-Deploy | Yes — on push/merge to `main` |
| Preview Deploys | Yes — on pull requests |

### Config File

`frontend/vercel.json`:
```json
{
  "regions": ["bom1"]
}
```

### Environment Variables (set in Vercel Dashboard)

| Variable | Value | Where to Set |
|----------|-------|--------------|
| `NEXT_PUBLIC_API_URL` | `https://primepalbe-ymrsb.ondigitalocean.app/api/v1` | Vercel → Settings → Environment Variables |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://ygpfvkffzrzijqekflep.supabase.co` | Vercel → Settings → Environment Variables |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | *(Supabase anon key)* | Vercel → Settings → Environment Variables |

### How to Redeploy Frontend

- **Automatic:** Push or merge to `main` on GitHub.
- **Manual:** Vercel Dashboard → Deployments → click "..." on latest → Redeploy.
- **After changing env vars:** Must redeploy for `NEXT_PUBLIC_*` vars to take effect (they are baked at build time).

### Key Notes

- `next.config.mjs` has `output: "standalone"` removed — Vercel does not need it.
- Static assets (JS, CSS, images) are served from Vercel's global CDN (126 PoPs) regardless of function region.
- SSR pages and API routes run in Mumbai (`bom1`).

---

## Backend — DigitalOcean App Platform

### Platform Details

| Setting | Value |
|---------|-------|
| Platform | DigitalOcean App Platform |
| App ID | `a6826471-1614-475a-b3a3-aff6e3bbc26b` |
| App Name | `primepalbe` |
| Component Name | `primepal-desktop-ms-thesis-prime` |
| Region | Bangalore, India (`blr`) |
| Instance Size | `apps-s-1vcpu-2gb` (1 vCPU, 2 GB RAM) |
| Instance Count | 1 |
| Source | GitHub `IqraMuzaffar/PrimePal`, branch `main` |
| Source Directory | `Desktop/MS-Thesis/Primepal/backend` |
| Dockerfile | `Desktop/MS-Thesis/Primepal/backend/Dockerfile` |
| HTTP Port | 8000 |
| Auto-Deploy | Yes — on push to `main` |
| Alerts | Deployment failed, Domain failed |

### Health Check Configuration

| Setting | Value |
|---------|-------|
| Path | `/health` |
| Initial Delay | 60 seconds |
| Period | 30 seconds |
| Timeout | 10 seconds |
| Failure Threshold | 5 |

### Environment Variables (set via doctl or DO Dashboard)

| Variable | Type | Scope | Description |
|----------|------|-------|-------------|
| `APP_ENV` | Plain | RUN_TIME | `production` |
| `SUPABASE_URL` | SECRET | RUN_TIME | Supabase project URL |
| `SUPABASE_ANON_KEY` | SECRET | RUN_TIME | Supabase anonymous key (RLS-aware) |
| `SUPABASE_SERVICE_ROLE_KEY` | SECRET | RUN_TIME | Supabase service role key (bypasses RLS) |
| `OPENAI_API_KEY` | SECRET | RUN_TIME | OpenAI API key for LLM/embeddings/whisper |
| `STUDENT_JWT_SECRET` | SECRET | RUN_TIME | Custom JWT secret for student auth |
| `SECRET_KEY` | SECRET | RUN_TIME | FastAPI application secret |
| `REDIS_URL` | Plain | RUN_TIME | Redis connection URL (currently `redis://localhost:6379` — unused) |
| `ALLOWED_ORIGINS` | Plain | RUN_TIME | `["https://prime-pal-alpha.vercel.app"]` |

### Dockerfile

Multi-stage build using `python:3.12-slim`. Runs 2 Uvicorn workers. Image size ~500MB.

```dockerfile
# Builder stage: install Python dependencies
FROM python:3.12-slim as builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# Runtime stage: copy deps + app code
FROM python:3.12-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH
COPY . .
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
```

### Dependencies Cleanup

The following unused packages were removed from `requirements.txt` to reduce image size and memory:

| Package | Size Impact | Why Removed |
|---------|-------------|-------------|
| `sentence-transformers` | ~800MB (pulls PyTorch) | Zero imports in app code |
| `tf-keras` | ~500MB (pulls TensorFlow) | Zero imports in app code |
| `langchain-huggingface` | ~100MB | Zero imports in app code |

Active LLM dependencies: `openai`, `langchain`, `langchain-openai`, `langchain-community`.

---

## doctl CLI — Managing the Backend

### Setup

```bash
# doctl is installed at:
# C:\Users\Iqra Muzaffar\AppData\Local\Microsoft\WinGet\Packages\DigitalOcean.Doctl_Microsoft.Winget.Source_8wekyb3d8bbwe\doctl.exe

# For convenience, set alias in your shell:
alias doctl='"/c/Users/Iqra Muzaffar/AppData/Local/Microsoft/WinGet/Packages/DigitalOcean.Doctl_Microsoft.Winget.Source_8wekyb3d8bbwe/doctl.exe"'

# Authenticate (already done — token stored locally):
doctl auth init --access-token <your-api-token>
```

### Common Commands

```bash
APP_ID="a6826471-1614-475a-b3a3-aff6e3bbc26b"

# Check app status
doctl apps get $APP_ID

# View current spec (all config + env vars)
doctl apps spec get $APP_ID

# List deployments (check for errors)
doctl apps list-deployments $APP_ID --format ID,Phase,Progress

# View runtime logs
doctl apps logs $APP_ID --type run

# View build logs
doctl apps logs $APP_ID --type build

# Force a new deployment (without code push)
doctl apps create-deployment $APP_ID

# Update app spec (e.g., change env vars, instance size)
doctl apps update $APP_ID --spec path/to/updated-spec.yaml

# Restart the app
doctl apps create-deployment $APP_ID --force-rebuild
```

### Updating Environment Variables

1. Export current spec: `doctl apps spec get $APP_ID > spec.yaml`
2. Edit `spec.yaml` — change the env var values
3. Apply: `doctl apps update $APP_ID --spec spec.yaml`
4. Delete `spec.yaml` (contains secrets)

---

## Redis — Current Status

Redis is **NOT currently provisioned**. The backend uses graceful degradation:

- `cache_get()` returns `None` (cache miss on every call)
- `cache_set()` returns `False` (no-op)
- The `/health/detailed` endpoint reports: `"redis": {"ok": false, "message": "not connected (graceful degradation)"}`

### Impact

- App is fully functional without Redis
- LLM responses are not cached — repeated identical queries hit OpenAI each time
- Slightly higher OpenAI API costs and slower repeat responses

### Adding Redis Later

**Option A: DigitalOcean Managed Redis** (~$15/mo, covered by credits)
```bash
# Add to app spec under a `databases:` block:
databases:
  - name: redis
    engine: REDIS
    version: "7"

# Then update REDIS_URL env var to: ${redis.DATABASE_URL}
```

**Option B: Upstash Free Redis** ($0, 256MB, 500K cmds/mo)
1. Sign up at upstash.com, create Redis in ap-south-1 (Mumbai)
2. Copy the `REDIS_URL` (format: `rediss://default:xxx@xxx.upstash.io:6379`)
3. Update the env var via doctl

---

## Billing & Credits

| Platform | Cost | Credits | Duration |
|----------|------|---------|----------|
| Vercel (Hobby) | $0/mo | Free forever | Unlimited |
| DigitalOcean App Platform | ~$22/mo (compute + bandwidth) | $200 GitHub Student Pack | ~9 months |
| Supabase | $0/mo (free tier) | Free forever | Unlimited |
| OpenAI API | Per-usage (~$0.15-0.60/M tokens) | User's own API key | Ongoing |

**DigitalOcean billing dashboard:** https://cloud.digitalocean.com/account/billing

---

## Troubleshooting

### Backend not responding

```bash
# 1. Check deployment status
doctl apps list-deployments $APP_ID --format ID,Phase,Progress

# 2. Check runtime logs for errors
doctl apps logs $APP_ID --type run

# 3. Check health endpoint
curl https://primepalbe-ymrsb.ondigitalocean.app/health
curl https://primepalbe-ymrsb.ondigitalocean.app/health/detailed
```

### Deployment fails on health check

- Health check waits 60s before first probe (`initial_delay_seconds: 60`)
- If the app takes longer to start (heavy deps), increase this in the spec
- Check runtime logs: `doctl apps logs $APP_ID --type run`
- Common cause: missing or invalid env vars (OpenAI key, Supabase keys)

### CORS errors in browser

- Check `ALLOWED_ORIGINS` env var includes the exact frontend URL
- Must include protocol: `https://prime-pal-alpha.vercel.app` (no trailing slash)
- Update via doctl if the Vercel URL changes

### Frontend can't reach backend

1. Check `NEXT_PUBLIC_API_URL` in Vercel env vars matches backend URL + `/api/v1`
2. Redeploy frontend after changing `NEXT_PUBLIC_*` vars (they're baked at build time)
3. Test backend directly: `curl https://primepalbe-ymrsb.ondigitalocean.app/health`

### OOM (Out of Memory)

- Current instance: 1 vCPU, 2 GB RAM, 2 Uvicorn workers
- If OOM occurs, scale up: change `instance_size_slug` to `apps-s-1vcpu-4gb` ($44/mo) in the spec
- Or reduce workers to 1 in the Dockerfile CMD

### Rotating Secrets

1. Generate new secret/key on the source platform (Supabase, OpenAI, etc.)
2. Export spec: `doctl apps spec get $APP_ID > spec.yaml`
3. Update the secret value in `spec.yaml`
4. Apply: `doctl apps update $APP_ID --spec spec.yaml`
5. Delete `spec.yaml` immediately
6. App auto-redeploys with new secrets

---

## File Reference

| File | Purpose |
|------|---------|
| `frontend/vercel.json` | Vercel config — sets serverless function region to Mumbai |
| `frontend/next.config.mjs` | Next.js config — standalone output removed for Vercel |
| `backend/Dockerfile` | Multi-stage Docker build, 2 Uvicorn workers |
| `backend/requirements.txt` | Python dependencies (cleaned — no TensorFlow/PyTorch) |
| `backend/app/core/config.py` | All backend env var definitions with defaults |
| `backend/app/core/cache.py` | Redis client with graceful degradation |
| `backend/app/main.py` | FastAPI app entry point, middleware, health endpoints |
| `.do/app.yaml` | DigitalOcean App Platform spec (reference — actual spec managed via doctl) |
| `docker-compose.yml` | Local development Docker setup (not used in production) |
