from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    app_env: str = "development"
    app_name: str = "TriageBot"
    database_url: str = "postgresql://triagebot:triagebot_dev@localhost:5432/triagebot"
    redis_url: str = "redis://localhost:6379/0"
    anthropic_api_key: str = ""
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_whatsapp_number: str = ""
    chroma_persist_dir: str = "./chroma_data"
    jwt_secret: str = "triagebot-dev-secret-change-in-prod"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 480
    cors_origins: str = "http://localhost:3000"
    emergency_number: str = "911"

    class Config:
        env_file = ".env"

settings = Settings()
