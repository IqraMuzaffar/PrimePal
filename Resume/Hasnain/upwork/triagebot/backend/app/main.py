from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Imports deferred to avoid circular imports
    from app.db.pool import init_pool, close_pool
    from app.services.session_manager import init_redis, close_redis
    from app.services.twilio_client import init_twilio
    from app.services.rag import init_rag

    await init_pool()
    await init_redis()
    init_twilio()
    await init_rag()
    yield
    await close_redis()
    await close_pool()

app = FastAPI(title="TriageBot", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.routes import webhook, dashboard, analytics, auth, websocket_chat
app.include_router(webhook.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(websocket_chat.router)

@app.get("/health")
async def health():
    return {"status": "ok", "service": "triagebot"}
