from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    OPENAI_API_KEY: str = ""
    LLM_MODEL: str = "gpt-4o-mini"
    DATABASE_PATH: str = "data/workflows.db"
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5678"

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()
