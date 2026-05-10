"""
pytest configuration.
Environment variables are set HERE, before any app code is imported,
because pydantic-settings reads them at import time.
"""
import os

os.environ.setdefault("STUDENT_JWT_SECRET", "test-student-secret-key-for-pytest")
os.environ.setdefault("SUPABASE_URL", "https://test-project.supabase.co")
os.environ.setdefault("SUPABASE_ANON_KEY", "test-anon-key")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key")
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://user:pass@localhost:5432/test")
os.environ.setdefault("SECRET_KEY", "test-secret-key")

# For E2E tests that need real OpenAI API, use actual key from .env file
# Only set test key if OPENAI_API_KEY is not already set in environment
if "OPENAI_API_KEY" not in os.environ:
    # Load from .env file if exists
    env_file = os.path.join(os.path.dirname(__file__), "..", ".env")
    if os.path.exists(env_file):
        with open(env_file) as f:
            for line in f:
                if line.startswith("OPENAI_API_KEY="):
                    key = line.strip().split("=", 1)[1]
                    os.environ["OPENAI_API_KEY"] = key
                    break
    else:
        # Fallback to test key for unit tests
        os.environ.setdefault("OPENAI_API_KEY", "test-openai-key")

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.fixture
async def client():
    """Async HTTP client wired directly to the FastAPI app (no real network)."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://testserver"
    ) as ac:
        yield ac


@pytest.fixture
def auth_headers():
    """Authorization headers for tests."""
    return {"Authorization": "Bearer test-token"}

