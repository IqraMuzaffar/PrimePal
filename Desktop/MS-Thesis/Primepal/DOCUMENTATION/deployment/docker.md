# Docker Setup

## docker-compose.yml

The compose file runs two services:

### Redis
- Image: `redis:7-alpine`
- Port: 6379
- Health check: `redis-cli ping`
- Persistent volume: `redis_data`

### Backend
- Builds from `backend/Dockerfile`
- Port: 8000
- Depends on Redis (waits for healthy)
- Health check: `curl http://localhost:8000/health`
- Environment variables loaded from `.env`

## Usage

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop
docker-compose down

# Rebuild after code changes
docker-compose up -d --build
```

## Notes
- The frontend is NOT included in docker-compose — it runs separately via `npm run dev` or `npm start`
- Redis URL is currently hardcoded as `redis://localhost:6379` in `main.py` (see TICKETS/01 for planned fix to make it configurable)
- The backend Dockerfile is at `backend/Dockerfile`
