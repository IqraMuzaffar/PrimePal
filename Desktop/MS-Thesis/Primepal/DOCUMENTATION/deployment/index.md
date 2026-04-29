# Deployment

## Subsections

| File | Description |
|------|-------------|
| [environment-variables.md](environment-variables.md) | All env vars for backend and frontend |
| [docker.md](docker.md) | Docker Compose setup and container details |
| [production-checklist.md](production-checklist.md) | Pre-deployment verification checklist |

## Architecture Overview

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Frontend   │    │   Backend    │    │    Redis     │
│  (Next.js)   │───▶│  (FastAPI)   │───▶│   (Cache)    │
│  Port 3000   │    │  Port 8000   │    │  Port 6379   │
└──────────────┘    └──────┬───────┘    └──────────────┘
                           │
                    ┌──────▼───────┐
                    │   Supabase   │
                    │ (PostgreSQL  │
                    │  + pgvector  │
                    │  + Auth      │
                    │  + Storage)  │
                    └──────────────┘
```

## Quick Deploy

```bash
# 1. Set environment variables
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local

# 2. Start backend + Redis
docker-compose up -d

# 3. Start frontend
cd frontend && npm run build && npm start

# 4. Run database migrations
cd supabase && supabase db push
```
