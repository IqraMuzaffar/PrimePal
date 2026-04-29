from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.cache import init_redis, close_redis
from app.api.v1.router import api_router

app = FastAPI(
    title="PrimePal API",
    description="AI-powered English language learning platform for Pakistani primary students",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    await init_redis("redis://localhost:6379")

@app.on_event("shutdown")
async def shutdown_event():
    await close_redis()

app.include_router(api_router, prefix="/api/v1")


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "primepal-api"}
