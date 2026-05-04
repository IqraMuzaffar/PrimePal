from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # App
    APP_ENV: str = "development"
    SECRET_KEY: str = "change-me-in-production"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://user:password@localhost:5432/primepal"

    # Vector DB (Qdrant)
    QDRANT_URL: str = "http://localhost:6333"
    QDRANT_COLLECTION: str = "snc_curriculum"

    # LLM
    OPENAI_API_KEY: str = ""
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"  # local, free embeddings
    CHAT_MODEL: str = "gpt-4o-mini"  # cost-optimized model (90% cheaper than gpt-4o)

    # Speech-to-Text
    WHISPER_MODEL: str = "whisper-1"

    # Supabase
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""

    # Student JWT (custom, separate from Supabase auth)
    STUDENT_JWT_SECRET: str = "change-student-secret-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:3003",
    ]

    class Config:
        env_file = ".env"


settings = Settings()
