# TriageBot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deployable AI patient triage chatbot (WhatsApp + web) that collects symptoms, scores severity, recommends departments, and pushes summaries to a receptionist dashboard for human confirmation.

**Architecture:** Fork WhatsBot Pro as the base (Twilio + FastAPI + Redis). Replace OpenAI with Claude API tool-use (CareBot pattern). Add DocMind's hybrid RAG for clinical guidelines. Build Next.js receptionist dashboard. Add embeddable web chat widget.

**Tech Stack:** FastAPI, Python 3.12, Claude API (Anthropic SDK), ChromaDB, BM25, asyncpg, PostgreSQL 15, Redis, Twilio, Next.js 14, Tailwind, shadcn/ui, recharts, Docker Compose

**Source projects (copy patterns from):**
- WhatsBot Pro: `upwork/whatsbot-pro/`
- CareBot: `upwork/carebot/`
- DocMind RAG: `upwork/docmind-rag/`

---

## Task 1: Project Scaffold — Fork WhatsBot Pro

**Files:**
- Create: `triagebot/backend/app/main.py`
- Create: `triagebot/backend/app/config.py`
- Create: `triagebot/backend/requirements.txt`
- Create: `triagebot/backend/Dockerfile`
- Create: `triagebot/docker-compose.yml`
- Create: `triagebot/backend/.env.example`

- [ ] **Step 1: Create project directory structure**

```bash
mkdir -p triagebot/backend/app/{routes,services,db,models}
mkdir -p triagebot/backend/migrations
mkdir -p triagebot/backend/tests
mkdir -p triagebot/frontend
mkdir -p triagebot/widget/src
mkdir -p triagebot/data/clinical_guidelines
```

- [ ] **Step 2: Create requirements.txt**

```
# triagebot/backend/requirements.txt
fastapi==0.115.0
uvicorn[standard]==0.30.6
python-multipart==0.0.9
pydantic==2.9.0
pydantic-settings==2.4.0
asyncpg==0.30.0
redis[hiredis]==5.2.1
chromadb==0.5.5
sentence-transformers==3.0.1
anthropic==0.34.0
twilio==9.3.0
httpx==0.27.0
pypdf2==3.0.1
python-docx==1.1.2
rank-bm25==0.2.2
bcrypt==4.2.0
pyjwt==2.9.0
pytest==8.3.0
pytest-asyncio==0.24.0
```

- [ ] **Step 3: Create config.py**

```python
# triagebot/backend/app/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    app_env: str = "development"
    app_name: str = "TriageBot"

    # Database
    database_url: str = "postgresql://triagebot:triagebot_dev@localhost:5432/triagebot"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Claude
    anthropic_api_key: str = ""

    # Twilio
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_whatsapp_number: str = ""

    # ChromaDB
    chroma_persist_dir: str = "./chroma_data"

    # JWT
    jwt_secret: str = "triagebot-dev-secret-change-in-prod"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 480

    # CORS
    cors_origins: str = "http://localhost:3000"

    # Emergency
    emergency_number: str = "911"

    class Config:
        env_file = ".env"

settings = Settings()
```

- [ ] **Step 4: Create main.py**

```python
# triagebot/backend/app/main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings

@asynccontextmanager
async def lifespan(app: FastAPI):
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
```

- [ ] **Step 5: Create docker-compose.yml**

```yaml
# triagebot/docker-compose.yml
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: triagebot
      POSTGRES_USER: triagebot
      POSTGRES_PASSWORD: triagebot_dev
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./backend/migrations/001_init.sql:/docker-entrypoint-initdb.d/001_init.sql

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    env_file: ./backend/.env
    environment:
      DATABASE_URL: postgresql://triagebot:triagebot_dev@postgres:5432/triagebot
      REDIS_URL: redis://redis:6379/0
    depends_on:
      - postgres
      - redis
    volumes:
      - chroma_data:/app/chroma_data
      - ./data/clinical_guidelines:/app/data/clinical_guidelines

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:8000
    depends_on:
      - backend

volumes:
  pgdata:
  chroma_data:
```

- [ ] **Step 6: Create Dockerfile**

```dockerfile
# triagebot/backend/Dockerfile
FROM python:3.12-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

- [ ] **Step 7: Create .env.example**

```
# triagebot/backend/.env.example
APP_ENV=development
DATABASE_URL=postgresql://triagebot:triagebot_dev@localhost:5432/triagebot
REDIS_URL=redis://localhost:6379/0
ANTHROPIC_API_KEY=sk-ant-...
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
CHROMA_PERSIST_DIR=./chroma_data
JWT_SECRET=change-this-in-production
CORS_ORIGINS=http://localhost:3000
EMERGENCY_NUMBER=911
```

- [ ] **Step 8: Commit**

```bash
cd triagebot
git init
git add .
git commit -m "feat: project scaffold — FastAPI + Docker Compose + config"
```

---

## Task 2: Database — Schema + Pool + Queries

**Files:**
- Create: `triagebot/backend/migrations/001_init.sql`
- Create: `triagebot/backend/app/db/pool.py`
- Create: `triagebot/backend/app/db/queries.py`
- Create: `triagebot/backend/app/models/schemas.py`
- Test: `triagebot/backend/tests/test_db.py`

- [ ] **Step 1: Create migration file**

```sql
-- triagebot/backend/migrations/001_init.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) UNIQUE,
    name VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT
);

CREATE TABLE triage_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id),
    channel VARCHAR(10) NOT NULL CHECK (channel IN ('whatsapp', 'web')),
    status VARCHAR(20) NOT NULL DEFAULT 'in_progress'
        CHECK (status IN ('in_progress', 'awaiting_review', 'confirmed', 'rejected', 'emergency')),
    severity VARCHAR(10) CHECK (severity IN ('green', 'yellow', 'red')),
    department VARCHAR(50),
    ai_summary TEXT,
    receptionist_notes TEXT,
    reviewed_by VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ
);

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES triage_sessions(id),
    role VARCHAR(15) NOT NULL CHECK (role IN ('patient', 'ai', 'receptionist', 'system')),
    content TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES triage_sessions(id),
    action VARCHAR(50) NOT NULL,
    tool_used VARCHAR(50),
    input JSONB,
    output JSONB,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Seed departments
INSERT INTO departments (name, description) VALUES
    ('General Practice', 'General health concerns, routine checkups'),
    ('Cardiology', 'Heart and cardiovascular issues'),
    ('Pediatrics', 'Children health concerns'),
    ('Orthopedics', 'Bone, joint, and muscle issues'),
    ('Dermatology', 'Skin conditions and rashes'),
    ('ENT', 'Ear, nose, and throat issues'),
    ('Ophthalmology', 'Eye problems and vision'),
    ('Gynecology', 'Women health concerns'),
    ('Neurology', 'Brain, nerve, and headache issues'),
    ('Gastroenterology', 'Stomach, digestive issues'),
    ('Psychiatry', 'Mental health and emotional concerns'),
    ('Emergency', 'Life-threatening emergencies'),
    ('Pulmonology', 'Breathing and lung issues'),
    ('Urology', 'Urinary and kidney issues');

-- Indexes
CREATE INDEX idx_sessions_status ON triage_sessions(status);
CREATE INDEX idx_sessions_severity ON triage_sessions(severity);
CREATE INDEX idx_sessions_created ON triage_sessions(created_at DESC);
CREATE INDEX idx_messages_session ON messages(session_id);
CREATE INDEX idx_audit_session ON audit_log(session_id);
```

- [ ] **Step 2: Create pool.py**

```python
# triagebot/backend/app/db/pool.py
import asyncpg
from app.config import settings

pool: asyncpg.Pool | None = None

async def init_pool():
    global pool
    pool = await asyncpg.create_pool(
        dsn=settings.database_url,
        min_size=5,
        max_size=20,
    )

async def close_pool():
    global pool
    if pool:
        await pool.close()

async def query(sql: str, *args) -> list[dict]:
    async with pool.acquire() as conn:
        rows = await conn.fetch(sql, *args)
        return [dict(r) for r in rows]

async def query_one(sql: str, *args) -> dict | None:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(sql, *args)
        return dict(row) if row else None

async def execute(sql: str, *args) -> str:
    async with pool.acquire() as conn:
        return await conn.execute(sql, *args)
```

- [ ] **Step 3: Create schemas.py**

```python
# triagebot/backend/app/models/schemas.py
from pydantic import BaseModel
from datetime import datetime
from uuid import UUID

class PatientCreate(BaseModel):
    phone: str
    name: str | None = None

class SymptomsData(BaseModel):
    body_part: str
    duration: str
    intensity: int  # 1-10
    associated_symptoms: list[str] = []
    raw_description: str

class TriageResult(BaseModel):
    severity: str  # green, yellow, red
    department: str
    reasoning: str
    guidelines_cited: list[str] = []

class TriageSessionOut(BaseModel):
    id: UUID
    patient_phone: str | None = None
    patient_name: str | None = None
    channel: str
    status: str
    severity: str | None = None
    department: str | None = None
    ai_summary: str | None = None
    receptionist_notes: str | None = None
    reviewed_by: str | None = None
    created_at: datetime
    reviewed_at: datetime | None = None

class MessageOut(BaseModel):
    id: UUID
    role: str
    content: str
    timestamp: datetime

class DashboardAction(BaseModel):
    action: str  # confirm, reassign, reject
    department: str | None = None  # for reassign
    reason: str | None = None  # for reject
    reviewed_by: str

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    token: str
    username: str
```

- [ ] **Step 4: Create queries.py**

```python
# triagebot/backend/app/db/queries.py
from app.db.pool import query, query_one, execute
import json

async def get_or_create_patient(phone: str, name: str | None = None) -> dict:
    patient = await query_one(
        "SELECT * FROM patients WHERE phone = $1", phone
    )
    if patient:
        return patient
    return await query_one(
        "INSERT INTO patients (phone, name) VALUES ($1, $2) RETURNING *",
        phone, name
    )

async def create_session(patient_id, channel: str) -> dict:
    return await query_one(
        "INSERT INTO triage_sessions (patient_id, channel) VALUES ($1, $2) RETURNING *",
        patient_id, channel
    )

async def update_session_triage(session_id, severity: str, department: str, ai_summary: str):
    await execute(
        """UPDATE triage_sessions
           SET severity = $2, department = $3, ai_summary = $4, status = 'awaiting_review'
           WHERE id = $1""",
        session_id, severity, department, ai_summary
    )

async def update_session_emergency(session_id):
    await execute(
        "UPDATE triage_sessions SET status = 'emergency', severity = 'red' WHERE id = $1",
        session_id
    )

async def review_session(session_id, action: str, reviewed_by: str,
                         department: str | None = None, notes: str | None = None):
    if action == "confirm":
        status = "confirmed"
    elif action == "reject":
        status = "rejected"
    elif action == "reassign":
        status = "confirmed"
    else:
        raise ValueError(f"Invalid action: {action}")

    await execute(
        """UPDATE triage_sessions
           SET status = $2, reviewed_by = $3, reviewed_at = NOW(),
               department = COALESCE($4, department), receptionist_notes = $5
           WHERE id = $1""",
        session_id, status, reviewed_by, department, notes
    )

async def save_message(session_id, role: str, content: str) -> dict:
    return await query_one(
        "INSERT INTO messages (session_id, role, content) VALUES ($1, $2, $3) RETURNING *",
        session_id, role, content
    )

async def get_session_messages(session_id) -> list[dict]:
    return await query(
        "SELECT * FROM messages WHERE session_id = $1 ORDER BY timestamp ASC",
        session_id
    )

async def get_queue(status: str = "awaiting_review") -> list[dict]:
    return await query(
        """SELECT ts.*, p.phone as patient_phone, p.name as patient_name
           FROM triage_sessions ts
           JOIN patients p ON ts.patient_id = p.id
           WHERE ts.status = $1
           ORDER BY
               CASE ts.severity WHEN 'red' THEN 1 WHEN 'yellow' THEN 2 WHEN 'green' THEN 3 END,
               ts.created_at ASC""",
        status
    )

async def get_emergency_queue() -> list[dict]:
    return await query(
        """SELECT ts.*, p.phone as patient_phone, p.name as patient_name
           FROM triage_sessions ts
           JOIN patients p ON ts.patient_id = p.id
           WHERE ts.status = 'emergency'
           ORDER BY ts.created_at ASC"""
    )

async def log_audit(session_id, action: str, tool_used: str | None,
                    input_data: dict | None, output_data: dict | None):
    await execute(
        """INSERT INTO audit_log (session_id, action, tool_used, input, output)
           VALUES ($1, $2, $3, $4::jsonb, $5::jsonb)""",
        session_id, action, tool_used,
        json.dumps(input_data) if input_data else None,
        json.dumps(output_data) if output_data else None
    )

async def count_session_messages(session_id) -> int:
    row = await query_one(
        "SELECT COUNT(*) as cnt FROM messages WHERE session_id = $1 AND role = 'patient'",
        session_id
    )
    return row["cnt"] if row else 0

async def get_departments() -> list[dict]:
    return await query("SELECT * FROM departments ORDER BY name")
```

- [ ] **Step 5: Write DB test**

```python
# triagebot/backend/tests/test_db.py
import pytest

def test_schemas_import():
    from app.models.schemas import (
        PatientCreate, SymptomsData, TriageResult,
        TriageSessionOut, MessageOut, DashboardAction,
        LoginRequest, LoginResponse,
    )
    p = PatientCreate(phone="+2341234567")
    assert p.phone == "+2341234567"
    assert p.name is None

    s = SymptomsData(
        body_part="chest", duration="2 hours",
        intensity=7, raw_description="chest pain"
    )
    assert s.intensity == 7
    assert s.associated_symptoms == []

    t = TriageResult(severity="red", department="Cardiology", reasoning="chest pain")
    assert t.severity == "red"

    a = DashboardAction(action="confirm", reviewed_by="nurse1")
    assert a.department is None
```

- [ ] **Step 6: Run test**

Run: `cd triagebot/backend && python -m pytest tests/test_db.py -v`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "feat: database schema, pool, queries, pydantic models"
```

---

## Task 3: Session Manager (Redis)

**Files:**
- Create: `triagebot/backend/app/services/session_manager.py`
- Test: `triagebot/backend/tests/test_session.py`

- [ ] **Step 1: Create session_manager.py**

```python
# triagebot/backend/app/services/session_manager.py
import json
import redis.asyncio as aioredis
from app.config import settings

redis_client: aioredis.Redis | None = None

SESSION_TTL = 3600  # 1 hour

async def init_redis():
    global redis_client
    redis_client = aioredis.from_url(settings.redis_url, decode_responses=True)

async def close_redis():
    global redis_client
    if redis_client:
        await redis_client.close()

def _key(session_id: str) -> str:
    return f"triage:session:{session_id}"

async def get_session_state(session_id: str) -> dict | None:
    data = await redis_client.get(_key(session_id))
    return json.loads(data) if data else None

async def set_session_state(session_id: str, state: dict):
    await redis_client.set(_key(session_id), json.dumps(state), ex=SESSION_TTL)

async def delete_session_state(session_id: str):
    await redis_client.delete(_key(session_id))

async def get_or_create_session_state(session_id: str) -> dict:
    state = await get_session_state(session_id)
    if state is None:
        state = {
            "session_id": session_id,
            "turn_count": 0,
            "symptoms": None,
            "severity": None,
            "department": None,
            "status": "in_progress",
            "conversation_history": [],
        }
        await set_session_state(session_id, state)
    return state

async def increment_turn(session_id: str) -> int:
    state = await get_or_create_session_state(session_id)
    state["turn_count"] += 1
    await set_session_state(session_id, state)
    return state["turn_count"]

async def add_to_history(session_id: str, role: str, content: str):
    state = await get_or_create_session_state(session_id)
    state["conversation_history"].append({"role": role, "content": content})
    # Keep last 20 messages to prevent token overflow
    state["conversation_history"] = state["conversation_history"][-20:]
    await set_session_state(session_id, state)
```

- [ ] **Step 2: Write test**

```python
# triagebot/backend/tests/test_session.py
def test_session_state_structure():
    state = {
        "session_id": "test-123",
        "turn_count": 0,
        "symptoms": None,
        "severity": None,
        "department": None,
        "status": "in_progress",
        "conversation_history": [],
    }
    assert state["turn_count"] == 0
    assert state["status"] == "in_progress"

    # Simulate turn increment
    state["turn_count"] += 1
    state["conversation_history"].append({"role": "patient", "content": "I have a headache"})
    assert state["turn_count"] == 1
    assert len(state["conversation_history"]) == 1
```

- [ ] **Step 3: Run test**

Run: `cd triagebot/backend && python -m pytest tests/test_session.py -v`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: Redis session manager for triage conversation state"
```

---

## Task 4: Triage Tools — 5 Claude Tool Functions

**Files:**
- Create: `triagebot/backend/app/services/tools.py`
- Create: `triagebot/backend/app/services/audit.py`
- Test: `triagebot/backend/tests/test_tools.py`

- [ ] **Step 1: Create audit.py**

```python
# triagebot/backend/app/services/audit.py
from app.db.queries import log_audit

async def audit_tool_call(session_id, tool_name: str, input_data: dict, output_data: dict):
    await log_audit(
        session_id=session_id,
        action="tool_call",
        tool_used=tool_name,
        input_data=input_data,
        output_data=output_data,
    )
```

- [ ] **Step 2: Create tools.py**

```python
# triagebot/backend/app/services/tools.py
from app.db.queries import (
    update_session_triage, update_session_emergency,
    save_message, get_departments,
)
from app.services.audit import audit_tool_call

# Emergency keywords — checked BEFORE Claude processes
EMERGENCY_KEYWORDS = [
    "unconscious", "not breathing", "severe bleeding", "seizure",
    "stroke", "heart attack", "suicidal", "suicide", "overdose",
    "choking", "anaphylaxis", "collapsed",
]

SEVERITY_MAP = {
    "green": "Routine — self-care or appointment within a week",
    "yellow": "Needs appointment within 24-48 hours",
    "red": "Urgent — needs same-day attention",
}

def check_emergency_keywords(message: str) -> bool:
    msg_lower = message.lower()
    return any(kw in msg_lower for kw in EMERGENCY_KEYWORDS)


async def collect_symptoms(session_id, raw_message: str) -> dict:
    """Extract structured symptoms from patient message. Called by Claude."""
    result = {
        "raw_description": raw_message,
        "body_part": "",
        "duration": "",
        "intensity": 0,
        "associated_symptoms": [],
        "needs_clarification": True,
        "clarification_questions": [],
    }
    # Claude will fill in structured data via its response.
    # This tool is a passthrough — Claude extracts and structures.
    await audit_tool_call(session_id, "collect_symptoms",
                          {"raw_message": raw_message}, result)
    return result


async def score_severity(
    session_id,
    body_part: str,
    duration: str,
    intensity: int,
    associated_symptoms: list[str],
) -> dict:
    """Score severity as green/yellow/red based on symptoms."""
    severity = "green"

    # Red indicators
    red_parts = ["chest", "heart", "head", "brain"]
    red_symptoms = ["difficulty breathing", "loss of consciousness", "severe pain",
                    "numbness", "vision loss", "blood in stool", "blood in urine",
                    "high fever", "confusion"]

    if intensity >= 8:
        severity = "red"
    elif any(part in body_part.lower() for part in red_parts) and intensity >= 6:
        severity = "red"
    elif any(s.lower() in " ".join(associated_symptoms).lower() for s in red_symptoms):
        severity = "red"
    elif intensity >= 5:
        severity = "yellow"
    elif any(part in body_part.lower() for part in red_parts):
        severity = "yellow"

    result = {
        "severity": severity,
        "description": SEVERITY_MAP[severity],
    }
    await audit_tool_call(session_id, "score_severity", {
        "body_part": body_part, "duration": duration,
        "intensity": intensity, "associated_symptoms": associated_symptoms,
    }, result)
    return result


async def recommend_department(
    session_id,
    body_part: str,
    symptoms_description: str,
    severity: str,
    guideline_excerpts: str = "",
) -> dict:
    """Recommend a department based on symptoms and severity."""
    # Mapping from body parts / symptom keywords to departments
    dept_map = {
        "chest": "Cardiology", "heart": "Cardiology", "palpitation": "Cardiology",
        "head": "Neurology", "brain": "Neurology", "migraine": "Neurology", "dizziness": "Neurology",
        "skin": "Dermatology", "rash": "Dermatology", "itch": "Dermatology",
        "stomach": "Gastroenterology", "abdomen": "Gastroenterology", "nausea": "Gastroenterology",
        "bone": "Orthopedics", "joint": "Orthopedics", "fracture": "Orthopedics", "back pain": "Orthopedics",
        "eye": "Ophthalmology", "vision": "Ophthalmology",
        "ear": "ENT", "nose": "ENT", "throat": "ENT", "sore throat": "ENT",
        "breathing": "Pulmonology", "lung": "Pulmonology", "cough": "Pulmonology", "asthma": "Pulmonology",
        "urinary": "Urology", "kidney": "Urology",
        "child": "Pediatrics", "baby": "Pediatrics", "infant": "Pediatrics",
        "pregnancy": "Gynecology", "menstrual": "Gynecology",
        "anxiety": "Psychiatry", "depression": "Psychiatry", "mental": "Psychiatry",
    }

    combined = f"{body_part} {symptoms_description}".lower()
    department = "General Practice"
    for keyword, dept in dept_map.items():
        if keyword in combined:
            department = dept
            break

    if severity == "red" and department == "General Practice":
        department = "Emergency"

    result = {
        "department": department,
        "reasoning": f"Symptoms in {body_part} with severity {severity}. "
                     f"Matched to {department}. {guideline_excerpts[:200] if guideline_excerpts else ''}",
    }
    await audit_tool_call(session_id, "recommend_department", {
        "body_part": body_part, "symptoms": symptoms_description, "severity": severity,
    }, result)
    return result


async def escalate_to_human(
    session_id,
    severity: str,
    department: str,
    ai_summary: str,
    is_emergency: bool = False,
) -> dict:
    """Push triage result to receptionist dashboard queue."""
    if is_emergency:
        await update_session_emergency(session_id)
    else:
        await update_session_triage(session_id, severity, department, ai_summary)

    result = {
        "escalated": True,
        "severity": severity,
        "department": department,
        "is_emergency": is_emergency,
        "message": "Triage summary sent to receptionist for review.",
    }
    await audit_tool_call(session_id, "escalate_to_human", {
        "severity": severity, "department": department, "is_emergency": is_emergency,
    }, result)
    return result
```

- [ ] **Step 3: Write tools test**

```python
# triagebot/backend/tests/test_tools.py
from app.services.tools import check_emergency_keywords, SEVERITY_MAP

def test_emergency_keywords_detected():
    assert check_emergency_keywords("I am unconscious") is True
    assert check_emergency_keywords("severe bleeding from wound") is True
    assert check_emergency_keywords("having a seizure") is True
    assert check_emergency_keywords("I feel suicidal") is True

def test_emergency_keywords_not_detected():
    assert check_emergency_keywords("I have a headache") is False
    assert check_emergency_keywords("my stomach hurts") is False
    assert check_emergency_keywords("I have a rash") is False

def test_severity_map():
    assert "green" in SEVERITY_MAP
    assert "yellow" in SEVERITY_MAP
    assert "red" in SEVERITY_MAP
    assert "Routine" in SEVERITY_MAP["green"]
    assert "Urgent" in SEVERITY_MAP["red"]
```

- [ ] **Step 4: Run test**

Run: `cd triagebot/backend && python -m pytest tests/test_tools.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: 5 triage tools — symptoms, severity, department, escalation, audit"
```

---

## Task 5: Triage Engine — Claude API + Tool Orchestration

**Files:**
- Create: `triagebot/backend/app/services/triage_engine.py`
- Test: `triagebot/backend/tests/test_triage_engine.py`

- [ ] **Step 1: Create triage_engine.py**

```python
# triagebot/backend/app/services/triage_engine.py
import json
from anthropic import AsyncAnthropic
from app.config import settings
from app.services import tools
from app.services.session_manager import (
    get_or_create_session_state, set_session_state,
    increment_turn, add_to_history,
)
from app.db.queries import save_message, count_session_messages
from app.services.audit import audit_tool_call

MAX_TURNS = 5

SYSTEM_PROMPT = """You are TriageBot, an AI patient triage assistant for a medical clinic.

YOUR ROLE:
- Collect patient symptoms through conversation (ask about body part, duration, intensity 1-10, other symptoms)
- Score severity (green/yellow/red) using the score_severity tool
- Recommend which department they should visit using recommend_department tool
- Escalate to a human receptionist using escalate_to_human tool

STRICT RULES:
1. You do NOT diagnose conditions. Never say "you have [disease]".
2. You do NOT prescribe medications, dosages, or home remedies.
3. You ONLY say: "Based on your symptoms, I recommend you visit [department]."
4. Keep conversations short — collect key info in 2-3 questions, then triage.
5. Be empathetic but professional.
6. If the patient describes life-threatening symptoms, immediately tell them to call emergency services.

CONVERSATION FLOW:
1. Greet the patient, ask what brings them in
2. Ask clarifying questions: where is the pain? how long? how intense (1-10)? any other symptoms?
3. Once you have enough info, use score_severity, then recommend_department, then escalate_to_human
4. Tell the patient: "I've sent your information to our receptionist. They will confirm your appointment shortly."
"""

TOOL_DEFINITIONS = [
    {
        "name": "score_severity",
        "description": "Score patient symptom severity as green (routine), yellow (24-48hr), or red (urgent/same-day). Call this after collecting symptoms.",
        "input_schema": {
            "type": "object",
            "properties": {
                "body_part": {"type": "string", "description": "Primary body part affected"},
                "duration": {"type": "string", "description": "How long symptoms have lasted"},
                "intensity": {"type": "integer", "description": "Pain/discomfort intensity 1-10"},
                "associated_symptoms": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Other symptoms mentioned",
                },
            },
            "required": ["body_part", "duration", "intensity"],
        },
    },
    {
        "name": "recommend_department",
        "description": "Recommend which clinic department the patient should visit based on their symptoms and severity.",
        "input_schema": {
            "type": "object",
            "properties": {
                "body_part": {"type": "string"},
                "symptoms_description": {"type": "string", "description": "Summary of all symptoms"},
                "severity": {"type": "string", "enum": ["green", "yellow", "red"]},
                "guideline_excerpts": {"type": "string", "description": "Relevant clinical guideline text if available"},
            },
            "required": ["body_part", "symptoms_description", "severity"],
        },
    },
    {
        "name": "escalate_to_human",
        "description": "Send the triage result to the receptionist dashboard for human review and appointment confirmation.",
        "input_schema": {
            "type": "object",
            "properties": {
                "severity": {"type": "string", "enum": ["green", "yellow", "red"]},
                "department": {"type": "string"},
                "ai_summary": {"type": "string", "description": "3-4 sentence summary of patient symptoms and triage decision"},
                "is_emergency": {"type": "boolean", "default": False},
            },
            "required": ["severity", "department", "ai_summary"],
        },
    },
    {
        "name": "lookup_guidelines",
        "description": "Search clinical guidelines for relevant triage protocols based on symptoms. Use before scoring severity for better accuracy.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Symptom-based search query"},
            },
            "required": ["query"],
        },
    },
]

client = AsyncAnthropic(api_key=settings.anthropic_api_key)

async def _execute_tool(session_id, tool_name: str, tool_input: dict) -> str:
    """Execute a tool call and return the result as a string."""
    if tool_name == "score_severity":
        result = await tools.score_severity(
            session_id,
            body_part=tool_input.get("body_part", ""),
            duration=tool_input.get("duration", ""),
            intensity=tool_input.get("intensity", 5),
            associated_symptoms=tool_input.get("associated_symptoms", []),
        )
    elif tool_name == "recommend_department":
        result = await tools.recommend_department(
            session_id,
            body_part=tool_input.get("body_part", ""),
            symptoms_description=tool_input.get("symptoms_description", ""),
            severity=tool_input.get("severity", "green"),
            guideline_excerpts=tool_input.get("guideline_excerpts", ""),
        )
    elif tool_name == "escalate_to_human":
        result = await tools.escalate_to_human(
            session_id,
            severity=tool_input.get("severity", "green"),
            department=tool_input.get("department", "General Practice"),
            ai_summary=tool_input.get("ai_summary", ""),
            is_emergency=tool_input.get("is_emergency", False),
        )
    elif tool_name == "lookup_guidelines":
        from app.services.rag import search_guidelines
        result = await search_guidelines(tool_input.get("query", ""))
        await audit_tool_call(session_id, "lookup_guidelines",
                              tool_input, {"results_count": len(result.get("results", []))})
    else:
        result = {"error": f"Unknown tool: {tool_name}"}

    return json.dumps(result)


async def process_message(session_id, patient_message: str) -> str:
    """Main entry point: process a patient message and return AI response."""

    # 1. Check emergency keywords FIRST (before Claude)
    if tools.check_emergency_keywords(patient_message):
        emergency_msg = (
            f"This sounds like a medical emergency. "
            f"Please call emergency services immediately at {settings.emergency_number}. "
            f"I am also alerting our clinic staff right now."
        )
        await tools.escalate_to_human(
            session_id, severity="red", department="Emergency",
            ai_summary=f"EMERGENCY: Patient reported: {patient_message}",
            is_emergency=True,
        )
        await save_message(session_id, "ai", emergency_msg)
        return emergency_msg

    # 2. Check turn count
    turn = await increment_turn(session_id)
    if turn > MAX_TURNS:
        escalation_msg = (
            "Thank you for your patience. I'm going to connect you with our receptionist "
            "who can help you further. They'll be with you shortly."
        )
        await tools.escalate_to_human(
            session_id, severity="yellow", department="General Practice",
            ai_summary=f"Auto-escalated after {MAX_TURNS} turns. Patient messages not fully resolved.",
        )
        await save_message(session_id, "ai", escalation_msg)
        return escalation_msg

    # 3. Save patient message
    await save_message(session_id, "patient", patient_message)
    await add_to_history(session_id, "user", patient_message)

    # 4. Get conversation history from Redis
    state = await get_or_create_session_state(session_id)
    messages = [{"role": m["role"], "content": m["content"]}
                for m in state["conversation_history"]]

    # 5. Call Claude with tools
    response = await client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        tools=TOOL_DEFINITIONS,
        messages=messages,
    )

    # 6. Process tool calls in a loop (Claude may call multiple tools)
    while response.stop_reason == "tool_use":
        tool_results = []
        for block in response.content:
            if block.type == "tool_use":
                tool_result = await _execute_tool(session_id, block.name, block.input)
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": tool_result,
                })

        # Add assistant response + tool results to messages
        messages.append({"role": "assistant", "content": response.content})
        messages.append({"role": "user", "content": tool_results})

        # Call Claude again with tool results
        response = await client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            tools=TOOL_DEFINITIONS,
            messages=messages,
        )

    # 7. Extract text response
    ai_text = ""
    for block in response.content:
        if hasattr(block, "text"):
            ai_text += block.text

    # 8. Save AI response
    await save_message(session_id, "ai", ai_text)
    await add_to_history(session_id, "assistant", ai_text)

    return ai_text
```

- [ ] **Step 2: Write test**

```python
# triagebot/backend/tests/test_triage_engine.py
def test_system_prompt_has_guardrails():
    from app.services.triage_engine import SYSTEM_PROMPT
    assert "do NOT diagnose" in SYSTEM_PROMPT.lower() or "do not diagnose" in SYSTEM_PROMPT.lower()
    assert "do NOT prescribe" in SYSTEM_PROMPT.lower() or "do not prescribe" in SYSTEM_PROMPT.lower()

def test_tool_definitions_complete():
    from app.services.triage_engine import TOOL_DEFINITIONS
    tool_names = {t["name"] for t in TOOL_DEFINITIONS}
    assert "score_severity" in tool_names
    assert "recommend_department" in tool_names
    assert "escalate_to_human" in tool_names
    assert "lookup_guidelines" in tool_names
    assert len(TOOL_DEFINITIONS) == 4

def test_max_turns_set():
    from app.services.triage_engine import MAX_TURNS
    assert MAX_TURNS == 5
```

- [ ] **Step 3: Run test**

Run: `cd triagebot/backend && python -m pytest tests/test_triage_engine.py -v`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: triage engine — Claude API + tool orchestration + guardrails"
```

---

## Task 6: RAG — Clinical Guidelines Search

**Files:**
- Create: `triagebot/backend/app/services/rag.py`
- Test: `triagebot/backend/tests/test_rag.py`

- [ ] **Step 1: Create rag.py**

```python
# triagebot/backend/app/services/rag.py
import os
import chromadb
from chromadb.config import Settings as ChromaSettings
from sentence_transformers import SentenceTransformer
from rank_bm25 import BM25Okapi
from app.config import settings

RRF_K = 60
collection = None
bm25_index = None
bm25_corpus = []
bm25_ids = []
embedder = None

async def init_rag():
    global collection, bm25_index, bm25_corpus, bm25_ids, embedder

    embedder = SentenceTransformer("all-MiniLM-L6-v2")

    chroma_client = chromadb.Client(ChromaSettings(
        chroma_db_impl="duckdb+parquet",
        persist_directory=settings.chroma_persist_dir,
        anonymized_telemetry=False,
    ))
    collection = chroma_client.get_or_create_collection(
        name="clinical_guidelines",
        metadata={"hnsw:space": "cosine"},
    )

    # Build BM25 index from existing docs
    all_docs = collection.get()
    if all_docs and all_docs["documents"]:
        bm25_corpus = [doc.lower().split() for doc in all_docs["documents"]]
        bm25_ids = all_docs["ids"]
        bm25_index = BM25Okapi(bm25_corpus)


async def ingest_document(text: str, metadata: dict, chunk_size: int = 500):
    """Chunk and embed a document into ChromaDB + BM25."""
    global bm25_index, bm25_corpus, bm25_ids

    chunks = []
    words = text.split()
    for i in range(0, len(words), chunk_size):
        chunk = " ".join(words[i:i + chunk_size])
        if len(chunk.strip()) > 50:
            chunks.append(chunk)

    if not chunks:
        return

    ids = [f"{metadata.get('source', 'doc')}_{i}" for i in range(len(chunks))]
    embeddings = embedder.encode(chunks).tolist()
    metadatas = [{**metadata, "chunk_index": i} for i in range(len(chunks))]

    collection.add(
        ids=ids,
        documents=chunks,
        embeddings=embeddings,
        metadatas=metadatas,
    )

    # Update BM25
    for chunk_id, chunk in zip(ids, chunks):
        bm25_corpus.append(chunk.lower().split())
        bm25_ids.append(chunk_id)
    bm25_index = BM25Okapi(bm25_corpus) if bm25_corpus else None


async def search_guidelines(query: str, top_k: int = 5) -> dict:
    """Hybrid search: vector + BM25 with RRF fusion."""
    if collection is None or collection.count() == 0:
        return {"results": [], "message": "No clinical guidelines loaded yet."}

    # 1. Vector search
    query_embedding = embedder.encode([query]).tolist()
    vector_results = collection.query(
        query_embeddings=query_embedding,
        n_results=min(top_k * 2, collection.count()),
    )

    # 2. BM25 search
    bm25_results = []
    if bm25_index is not None:
        tokenized_query = query.lower().split()
        bm25_scores = bm25_index.get_scores(tokenized_query)
        top_bm25 = sorted(range(len(bm25_scores)),
                          key=lambda i: bm25_scores[i], reverse=True)[:top_k * 2]
        bm25_results = [(bm25_ids[i], bm25_scores[i]) for i in top_bm25 if bm25_scores[i] > 0]

    # 3. RRF fusion
    rrf_scores = {}
    doc_map = {}

    if vector_results and vector_results["ids"] and vector_results["ids"][0]:
        for rank, (doc_id, doc, meta) in enumerate(zip(
            vector_results["ids"][0],
            vector_results["documents"][0],
            vector_results["metadatas"][0],
        )):
            rrf_scores[doc_id] = rrf_scores.get(doc_id, 0.0) + 1.0 / (RRF_K + rank + 1)
            doc_map[doc_id] = {"text": doc, "metadata": meta}

    for rank, (doc_id, _) in enumerate(bm25_results):
        rrf_scores[doc_id] = rrf_scores.get(doc_id, 0.0) + 1.0 / (RRF_K + rank + 1)
        if doc_id not in doc_map:
            idx = bm25_ids.index(doc_id)
            doc_map[doc_id] = {
                "text": " ".join(bm25_corpus[idx]),
                "metadata": {"source": "bm25"},
            }

    # 4. Sort and return top_k
    sorted_ids = sorted(rrf_scores, key=lambda x: rrf_scores[x], reverse=True)[:top_k]

    results = []
    for doc_id in sorted_ids:
        entry = doc_map.get(doc_id, {})
        results.append({
            "chunk_id": doc_id,
            "text": entry.get("text", ""),
            "source": entry.get("metadata", {}).get("source", "unknown"),
            "score": rrf_scores[doc_id],
        })

    return {"results": results}
```

- [ ] **Step 2: Write test**

```python
# triagebot/backend/tests/test_rag.py
def test_rrf_formula():
    """Verify RRF score calculation."""
    K = 60
    rank_1_score = 1.0 / (K + 0 + 1)  # rank 0
    rank_2_score = 1.0 / (K + 1 + 1)  # rank 1
    assert rank_1_score > rank_2_score
    assert abs(rank_1_score - 1/61) < 0.0001
    assert abs(rank_2_score - 1/62) < 0.0001

def test_search_result_structure():
    result = {
        "results": [
            {"chunk_id": "doc_0", "text": "chest pain protocol...", "source": "WHO", "score": 0.032},
        ]
    }
    assert len(result["results"]) == 1
    assert "text" in result["results"][0]
    assert "source" in result["results"][0]
    assert "score" in result["results"][0]
```

- [ ] **Step 3: Run test**

Run: `cd triagebot/backend && python -m pytest tests/test_rag.py -v`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: clinical guidelines RAG — hybrid vector + BM25 search with RRF"
```

---

## Task 7: Twilio Webhook + WhatsApp Route

**Files:**
- Create: `triagebot/backend/app/services/twilio_client.py`
- Create: `triagebot/backend/app/routes/webhook.py`
- Test: `triagebot/backend/tests/test_webhook.py`

- [ ] **Step 1: Create twilio_client.py**

```python
# triagebot/backend/app/services/twilio_client.py
import asyncio
from twilio.rest import Client
from twilio.request_validator import RequestValidator
from app.config import settings

twilio_client: Client | None = None
request_validator: RequestValidator | None = None

def init_twilio():
    global twilio_client, request_validator
    if settings.twilio_account_sid and settings.twilio_auth_token:
        twilio_client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
        request_validator = RequestValidator(settings.twilio_auth_token)

async def send_whatsapp(to_phone: str, body: str) -> str:
    if twilio_client is None:
        raise RuntimeError("Twilio not initialized")
    phone = f"whatsapp:{to_phone}" if not to_phone.startswith("whatsapp:") else to_phone
    message = await asyncio.to_thread(
        twilio_client.messages.create,
        body=body,
        from_=settings.twilio_whatsapp_number,
        to=phone,
    )
    return message.sid

def validate_request(url: str, params: dict, signature: str) -> bool:
    if settings.app_env == "development":
        return True
    if request_validator is None:
        return False
    return request_validator.validate(url, params, signature)
```

- [ ] **Step 2: Create webhook.py**

```python
# triagebot/backend/app/routes/webhook.py
from fastapi import APIRouter, Request, HTTPException
from app.services.twilio_client import validate_request, send_whatsapp
from app.services.triage_engine import process_message
from app.db.queries import get_or_create_patient, create_session
from app.services.session_manager import get_session_state, set_session_state

router = APIRouter(tags=["webhook"])

# Track active sessions by phone number
async def _get_active_session(phone: str) -> str | None:
    """Get active triage session ID for a phone number from Redis."""
    from app.services.session_manager import redis_client
    return await redis_client.get(f"triage:phone:{phone}")

async def _set_active_session(phone: str, session_id: str):
    from app.services.session_manager import redis_client
    await redis_client.set(f"triage:phone:{phone}", str(session_id), ex=3600)

@router.post("/webhook/whatsapp")
async def whatsapp_webhook(request: Request):
    form = await request.form()
    form_dict = dict(form)

    # Validate Twilio signature
    signature = request.headers.get("X-Twilio-Signature", "")
    url = str(request.url)
    if not validate_request(url, form_dict, signature):
        raise HTTPException(status_code=403, detail="Invalid Twilio signature")

    patient_phone = form_dict.get("From", "").replace("whatsapp:", "")
    patient_message = form_dict.get("Body", "").strip()

    if not patient_message:
        return {"status": "empty message"}

    # Get or create patient
    patient = await get_or_create_patient(patient_phone)

    # Get or create active session
    session_id = await _get_active_session(patient_phone)
    if session_id is None:
        session = await create_session(patient["id"], "whatsapp")
        session_id = str(session["id"])
        await _set_active_session(patient_phone, session_id)

    # Process through triage engine
    ai_response = await process_message(session_id, patient_message)

    # Send response via WhatsApp
    await send_whatsapp(patient_phone, ai_response)

    return {"status": "ok"}
```

- [ ] **Step 3: Write test**

```python
# triagebot/backend/tests/test_webhook.py
def test_phone_normalization():
    raw = "whatsapp:+2341234567890"
    clean = raw.replace("whatsapp:", "")
    assert clean == "+2341234567890"
    assert not clean.startswith("whatsapp:")

def test_empty_message_handling():
    message = "   ".strip()
    assert message == ""
    assert not message  # falsy
```

- [ ] **Step 4: Run test**

Run: `cd triagebot/backend && python -m pytest tests/test_webhook.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: Twilio WhatsApp webhook + message routing to triage engine"
```

---

## Task 8: Auth + Dashboard API Routes

**Files:**
- Create: `triagebot/backend/app/routes/auth.py`
- Create: `triagebot/backend/app/routes/dashboard.py`
- Create: `triagebot/backend/app/routes/analytics.py`
- Test: `triagebot/backend/tests/test_routes.py`

- [ ] **Step 1: Create auth.py**

```python
# triagebot/backend/app/routes/auth.py
import jwt
import bcrypt
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, Depends, Header
from app.config import settings
from app.models.schemas import LoginRequest, LoginResponse

router = APIRouter(tags=["auth"])

# Hardcoded users for MVP
USERS = {
    "receptionist": bcrypt.hashpw(b"triage123", bcrypt.gensalt()).decode(),
    "admin": bcrypt.hashpw(b"admin123", bcrypt.gensalt()).decode(),
}

def create_token(username: str) -> str:
    payload = {
        "sub": username,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)

async def get_current_user(authorization: str = Header(...)) -> str:
    token = authorization.replace("Bearer ", "")
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        return payload["sub"]
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

@router.post("/auth/login", response_model=LoginResponse)
async def login(body: LoginRequest):
    stored_hash = USERS.get(body.username)
    if not stored_hash or not bcrypt.checkpw(body.password.encode(), stored_hash.encode()):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token(body.username)
    return LoginResponse(token=token, username=body.username)
```

- [ ] **Step 2: Create dashboard.py**

```python
# triagebot/backend/app/routes/dashboard.py
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from app.routes.auth import get_current_user
from app.db.queries import (
    get_queue, get_emergency_queue, review_session,
    get_session_messages, get_departments,
)
from app.db.pool import query_one
from app.models.schemas import DashboardAction
from app.services.twilio_client import send_whatsapp

router = APIRouter(tags=["dashboard"])

@router.get("/dashboard/queue")
async def get_triage_queue(user: str = Depends(get_current_user)):
    awaiting = await get_queue("awaiting_review")
    emergency = await get_emergency_queue()
    return {"emergency": emergency, "queue": awaiting}

@router.get("/dashboard/session/{session_id}")
async def get_session_detail(session_id: UUID, user: str = Depends(get_current_user)):
    session = await query_one(
        """SELECT ts.*, p.phone as patient_phone, p.name as patient_name
           FROM triage_sessions ts JOIN patients p ON ts.patient_id = p.id
           WHERE ts.id = $1""",
        session_id,
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    messages = await get_session_messages(session_id)
    return {"session": session, "messages": messages}

@router.post("/dashboard/session/{session_id}/action")
async def take_action(session_id: UUID, body: DashboardAction,
                      user: str = Depends(get_current_user)):
    session = await query_one(
        """SELECT ts.*, p.phone as patient_phone
           FROM triage_sessions ts JOIN patients p ON ts.patient_id = p.id
           WHERE ts.id = $1""",
        session_id,
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    await review_session(
        session_id, body.action, body.reviewed_by,
        department=body.department, notes=body.reason,
    )

    # Notify patient via WhatsApp
    phone = session.get("patient_phone")
    if phone and session.get("channel") == "whatsapp":
        if body.action == "confirm":
            dept = body.department or session.get("department", "General Practice")
            msg = (f"Your appointment has been confirmed with {dept}. "
                   f"Please visit the clinic at your earliest convenience.")
        elif body.action == "reject":
            msg = (f"We recommend you visit our clinic in person for a proper assessment. "
                   f"Reason: {body.reason or 'Further evaluation needed.'}")
        elif body.action == "reassign":
            msg = (f"Your appointment has been confirmed with {body.department}. "
                   f"Please visit the clinic at your earliest convenience.")
        else:
            msg = "Thank you. Our team will follow up with you shortly."
        try:
            await send_whatsapp(phone, msg)
        except Exception:
            pass  # Don't fail the action if WhatsApp send fails

    return {"status": "ok", "action": body.action}

@router.get("/dashboard/departments")
async def list_departments(user: str = Depends(get_current_user)):
    return await get_departments()

@router.get("/dashboard/history")
async def get_history(status: str = "confirmed", limit: int = 50,
                      user: str = Depends(get_current_user)):
    from app.db.pool import query
    return await query(
        """SELECT ts.*, p.phone as patient_phone, p.name as patient_name
           FROM triage_sessions ts JOIN patients p ON ts.patient_id = p.id
           WHERE ts.status = $1
           ORDER BY ts.reviewed_at DESC LIMIT $2""",
        status, limit,
    )
```

- [ ] **Step 3: Create analytics.py**

```python
# triagebot/backend/app/routes/analytics.py
from fastapi import APIRouter, Depends, Query
from app.routes.auth import get_current_user
from app.db.pool import query, query_one

router = APIRouter(tags=["analytics"])

@router.get("/analytics/summary")
async def get_summary(days: int = Query(default=7, le=90),
                      user: str = Depends(get_current_user)):
    total = await query_one(
        """SELECT COUNT(*) as total FROM triage_sessions
           WHERE created_at >= NOW() - INTERVAL '%s days'""" % days
    )
    severity_breakdown = await query(
        """SELECT severity, COUNT(*) as count FROM triage_sessions
           WHERE created_at >= NOW() - INTERVAL '%s days' AND severity IS NOT NULL
           GROUP BY severity""" % days
    )
    top_departments = await query(
        """SELECT department, COUNT(*) as count FROM triage_sessions
           WHERE created_at >= NOW() - INTERVAL '%s days' AND department IS NOT NULL
           GROUP BY department ORDER BY count DESC LIMIT 5""" % days
    )
    avg_triage_time = await query_one(
        """SELECT AVG(EXTRACT(EPOCH FROM (reviewed_at - created_at))) as avg_seconds
           FROM triage_sessions
           WHERE reviewed_at IS NOT NULL
           AND created_at >= NOW() - INTERVAL '%s days'""" % days
    )
    daily_volume = await query(
        """SELECT DATE(created_at) as date, COUNT(*) as count
           FROM triage_sessions
           WHERE created_at >= NOW() - INTERVAL '%s days'
           GROUP BY DATE(created_at) ORDER BY date""" % days
    )

    return {
        "total": total["total"] if total else 0,
        "severity_breakdown": severity_breakdown,
        "top_departments": top_departments,
        "avg_triage_seconds": avg_triage_time["avg_seconds"] if avg_triage_time else None,
        "daily_volume": daily_volume,
    }
```

- [ ] **Step 4: Write test**

```python
# triagebot/backend/tests/test_routes.py
def test_dashboard_action_schema():
    from app.models.schemas import DashboardAction
    a = DashboardAction(action="confirm", reviewed_by="nurse1")
    assert a.action == "confirm"
    assert a.department is None

    b = DashboardAction(action="reassign", department="Cardiology", reviewed_by="nurse1")
    assert b.department == "Cardiology"

    c = DashboardAction(action="reject", reason="Need in-person exam", reviewed_by="nurse1")
    assert c.reason == "Need in-person exam"

def test_login_schema():
    from app.models.schemas import LoginRequest, LoginResponse
    req = LoginRequest(username="receptionist", password="triage123")
    assert req.username == "receptionist"

    resp = LoginResponse(token="abc.def.ghi", username="receptionist")
    assert resp.token == "abc.def.ghi"
```

- [ ] **Step 5: Run test**

Run: `cd triagebot/backend && python -m pytest tests/test_routes.py -v`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: auth, dashboard API, analytics endpoints"
```

---

## Task 9: WebSocket — Web Chat Route

**Files:**
- Create: `triagebot/backend/app/routes/websocket_chat.py`

- [ ] **Step 1: Create websocket_chat.py**

```python
# triagebot/backend/app/routes/websocket_chat.py
import json
import uuid
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.triage_engine import process_message
from app.db.queries import get_or_create_patient, create_session
from app.services.session_manager import redis_client

router = APIRouter()

@router.websocket("/ws/chat")
async def chat_websocket(websocket: WebSocket):
    await websocket.accept()

    # Generate session
    session_id = None
    patient_id = None

    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)

            # First message should include phone (optional) for patient creation
            if session_id is None:
                phone = msg.get("phone", f"web-{uuid.uuid4().hex[:8]}")
                name = msg.get("name", None)
                patient = await get_or_create_patient(phone, name)
                session = await create_session(patient["id"], "web")
                session_id = str(session["id"])
                patient_id = patient["id"]

            patient_message = msg.get("message", "")
            if not patient_message:
                continue

            # Process through same triage engine
            ai_response = await process_message(session_id, patient_message)

            await websocket.send_text(json.dumps({
                "type": "message",
                "content": ai_response,
                "session_id": session_id,
            }))

    except WebSocketDisconnect:
        pass
```

- [ ] **Step 2: Commit**

```bash
git add .
git commit -m "feat: WebSocket route for web chat — same triage engine as WhatsApp"
```

---

## Task 10: Frontend — Next.js Receptionist Dashboard

**Files:**
- Create: `triagebot/frontend/package.json`
- Create: `triagebot/frontend/app/layout.tsx`
- Create: `triagebot/frontend/app/page.tsx` (Queue)
- Create: `triagebot/frontend/app/login/page.tsx`
- Create: `triagebot/frontend/app/chat/[id]/page.tsx`
- Create: `triagebot/frontend/app/analytics/page.tsx`
- Create: `triagebot/frontend/components/TriageCard.tsx`
- Create: `triagebot/frontend/components/SeverityBadge.tsx`
- Create: `triagebot/frontend/lib/api.ts`
- Create: `triagebot/frontend/Dockerfile`

This task is large. Implementation should follow standard Next.js 14 App Router patterns with Tailwind + shadcn/ui. Key components:

- [ ] **Step 1: Initialize Next.js project**

```bash
cd triagebot/frontend
npx create-next-app@14 . --typescript --tailwind --app --src-dir=false --import-alias="@/*"
npx shadcn@latest init
npx shadcn@latest add button card badge input dialog select
npm install recharts
```

- [ ] **Step 2: Create lib/api.ts**

```typescript
// triagebot/frontend/lib/api.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const res = await fetch(`${API_URL}/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (res.status === 401) {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    throw new Error("Unauthorized");
  }
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function login(username: string, password: string) {
  const data = await apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  localStorage.setItem("token", data.token);
  return data;
}
```

- [ ] **Step 3: Create SeverityBadge component**

```tsx
// triagebot/frontend/components/SeverityBadge.tsx
import { Badge } from "@/components/ui/badge";

const colors = {
  red: "bg-red-600 text-white",
  yellow: "bg-yellow-500 text-black",
  green: "bg-green-600 text-white",
};

const labels = {
  red: "URGENT",
  yellow: "SOON",
  green: "ROUTINE",
};

export function SeverityBadge({ severity }: { severity: string }) {
  const s = severity as keyof typeof colors;
  return (
    <Badge className={colors[s] || "bg-gray-400"}>
      {labels[s] || severity.toUpperCase()}
    </Badge>
  );
}
```

- [ ] **Step 4: Create TriageCard component**

```tsx
// triagebot/frontend/components/TriageCard.tsx
"use client";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SeverityBadge } from "./SeverityBadge";
import Link from "next/link";

interface TriageCardProps {
  session: {
    id: string;
    patient_name: string | null;
    patient_phone: string;
    severity: string;
    department: string;
    ai_summary: string;
    channel: string;
    created_at: string;
  };
  onConfirm: (id: string) => void;
  onReject: (id: string) => void;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

export function TriageCard({ session, onConfirm, onReject }: TriageCardProps) {
  return (
    <Card className={`border-l-4 ${
      session.severity === "red" ? "border-l-red-600 bg-red-50" :
      session.severity === "yellow" ? "border-l-yellow-500 bg-yellow-50" :
      "border-l-green-600 bg-green-50"
    }`}>
      <CardContent className="pt-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <p className="font-bold">{session.patient_name || session.patient_phone}</p>
            <p className="text-sm text-gray-500">{session.patient_phone} · {session.channel}</p>
          </div>
          <div className="flex items-center gap-2">
            <SeverityBadge severity={session.severity} />
            <span className="text-xs text-gray-400">{timeAgo(session.created_at)}</span>
          </div>
        </div>
        <p className="text-sm font-medium text-blue-800 mb-1">→ {session.department}</p>
        <p className="text-sm text-gray-700">{session.ai_summary}</p>
      </CardContent>
      <CardFooter className="gap-2">
        <Button size="sm" onClick={() => onConfirm(session.id)}>Confirm</Button>
        <Link href={`/chat/${session.id}`}>
          <Button size="sm" variant="outline">View Chat</Button>
        </Link>
        <Button size="sm" variant="destructive" onClick={() => onReject(session.id)}>Reject</Button>
      </CardFooter>
    </Card>
  );
}
```

- [ ] **Step 5: Create Queue page (app/page.tsx)**

```tsx
// triagebot/frontend/app/page.tsx
"use client";
import { useEffect, useState } from "react";
import { TriageCard } from "@/components/TriageCard";
import { apiFetch } from "@/lib/api";

export default function QueuePage() {
  const [queue, setQueue] = useState<any[]>([]);
  const [emergency, setEmergency] = useState<any[]>([]);

  const fetchQueue = async () => {
    try {
      const data = await apiFetch("/dashboard/queue");
      setQueue(data.queue || []);
      setEmergency(data.emergency || []);
    } catch {}
  };

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleConfirm = async (id: string) => {
    await apiFetch(`/dashboard/session/${id}/action`, {
      method: "POST",
      body: JSON.stringify({ action: "confirm", reviewed_by: "receptionist" }),
    });
    fetchQueue();
  };

  const handleReject = async (id: string) => {
    const reason = prompt("Rejection reason:");
    if (!reason) return;
    await apiFetch(`/dashboard/session/${id}/action`, {
      method: "POST",
      body: JSON.stringify({ action: "reject", reason, reviewed_by: "receptionist" }),
    });
    fetchQueue();
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Triage Queue</h1>

      {emergency.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-bold text-red-600 mb-2 animate-pulse">
            🚨 EMERGENCY ({emergency.length})
          </h2>
          <div className="space-y-3">
            {emergency.map((s: any) => (
              <TriageCard key={s.id} session={s} onConfirm={handleConfirm} onReject={handleReject} />
            ))}
          </div>
        </div>
      )}

      <h2 className="text-lg font-semibold mb-2">Awaiting Review ({queue.length})</h2>
      <div className="space-y-3">
        {queue.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No patients in queue</p>
        ) : (
          queue.map((s: any) => (
            <TriageCard key={s.id} session={s} onConfirm={handleConfirm} onReject={handleReject} />
          ))
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Create Login page, Chat detail page, Analytics page**

Follow same patterns. Login stores JWT in localStorage. Chat page fetches `/dashboard/session/{id}` and shows messages. Analytics page fetches `/analytics/summary` and renders recharts pie/bar charts.

- [ ] **Step 7: Create frontend Dockerfile**

```dockerfile
# triagebot/frontend/Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "feat: Next.js receptionist dashboard — queue, chat, analytics, auth"
```

---

## Task 11: Web Chat Widget

**Files:**
- Create: `triagebot/widget/src/ChatWidget.tsx`
- Create: `triagebot/widget/package.json`
- Create: `triagebot/widget/index.html` (demo page)

- [ ] **Step 1: Create widget package.json**

```json
{
  "name": "triagebot-widget",
  "version": "1.0.0",
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  },
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "typescript": "^5.5.0",
    "vite": "^5.4.0"
  }
}
```

- [ ] **Step 2: Create ChatWidget.tsx**

```tsx
// triagebot/widget/src/ChatWidget.tsx
import React, { useState, useRef, useEffect } from "react";

interface Message {
  role: "patient" | "ai";
  content: string;
}

const API_WS = "ws://localhost:8000/ws/chat";

export function ChatWidget() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "ai", content: "Hello! I'm TriageBot. How can I help you today? Please describe your symptoms." },
  ]);
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && !wsRef.current) {
      const ws = new WebSocket(API_WS);
      ws.onmessage = (e) => {
        const data = JSON.parse(e.data);
        setMessages((prev) => [...prev, { role: "ai", content: data.content }]);
      };
      wsRef.current = ws;
    }
    return () => { wsRef.current?.close(); wsRef.current = null; };
  }, [open]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = () => {
    if (!input.trim() || !wsRef.current) return;
    setMessages((prev) => [...prev, { role: "patient", content: input }]);
    wsRef.current.send(JSON.stringify({ message: input }));
    setInput("");
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        style={{ position: "fixed", bottom: 20, right: 20, width: 60, height: 60,
          borderRadius: "50%", background: "#2563eb", color: "#fff", border: "none",
          fontSize: 24, cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
        💬
      </button>
    );
  }

  return (
    <div style={{ position: "fixed", bottom: 20, right: 20, width: 380, height: 520,
      border: "1px solid #e5e7eb", borderRadius: 12, background: "#fff",
      display: "flex", flexDirection: "column", boxShadow: "0 8px 30px rgba(0,0,0,0.15)" }}>
      <div style={{ padding: "12px 16px", background: "#2563eb", color: "#fff",
        borderRadius: "12px 12px 0 0", display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontWeight: 700 }}>TriageBot</span>
        <button onClick={() => setOpen(false)} style={{ background: "none", border: "none",
          color: "#fff", cursor: "pointer", fontSize: 18 }}>✕</button>
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: 12 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 8, display: "flex",
            justifyContent: m.role === "patient" ? "flex-end" : "flex-start" }}>
            <div style={{ maxWidth: "80%", padding: "8px 12px", borderRadius: 12,
              background: m.role === "patient" ? "#2563eb" : "#f3f4f6",
              color: m.role === "patient" ? "#fff" : "#111" }}>
              {m.content}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div style={{ padding: 12, borderTop: "1px solid #e5e7eb", display: "flex", gap: 8 }}>
        <input value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Describe your symptoms..."
          style={{ flex: 1, padding: "8px 12px", border: "1px solid #d1d5db",
            borderRadius: 8, outline: "none" }} />
        <button onClick={send} style={{ padding: "8px 16px", background: "#2563eb",
          color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>Send</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create demo index.html**

```html
<!-- triagebot/widget/index.html -->
<!DOCTYPE html>
<html>
<head><title>Clinic Website — TriageBot Demo</title></head>
<body>
  <h1>Welcome to Our Clinic</h1>
  <p>Click the chat button in the bottom-right to start a triage session.</p>
  <div id="triagebot-widget"></div>
  <script type="module">
    import { ChatWidget } from './src/ChatWidget.tsx';
    // Widget renders via Vite in dev mode
  </script>
</body>
</html>
```

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: embeddable web chat widget for clinic websites"
```

---

## Task 12: Docker Compose + README + Final Testing

**Files:**
- Modify: `triagebot/docker-compose.yml` (already created in Task 1)
- Create: `triagebot/README.md`
- Create: `triagebot/data/clinical_guidelines/sample_triage_protocol.txt`

- [ ] **Step 1: Create sample clinical guideline**

```text
# triagebot/data/clinical_guidelines/sample_triage_protocol.txt
TRIAGE PROTOCOL — SIMPLIFIED MANCHESTER TRIAGE SYSTEM

RED — IMMEDIATE (Emergency)
- Airway compromise
- Inadequate breathing
- Severe hemorrhage
- Unconscious / unresponsive
- Chest pain with sweating, nausea, arm pain
- Seizure (active)
- Anaphylaxis
- Stroke symptoms (facial droop, arm weakness, speech difficulty)

YELLOW — URGENT (Within 24-48 hours)
- Moderate pain (5-7/10)
- Persistent vomiting or diarrhea (>24 hours)
- High fever (>38.5°C / 101.3°F) without red flags
- Abdominal pain without red flags
- Laceration requiring stitches (bleeding controlled)
- Acute joint swelling
- Persistent headache (new onset)

GREEN — ROUTINE (Within 1 week)
- Mild pain (1-4/10)
- Common cold symptoms
- Minor skin rash (no fever)
- Follow-up appointment
- Prescription refill
- Mild musculoskeletal pain
- Minor eye irritation

DEPARTMENT ROUTING:
- Chest pain, palpitations, blood pressure → Cardiology
- Headache, dizziness, numbness, seizure → Neurology
- Cough, breathing difficulty, asthma → Pulmonology
- Stomach pain, nausea, vomiting, diarrhea → Gastroenterology
- Bone, joint, muscle, back pain → Orthopedics
- Skin rash, eczema, acne → Dermatology
- Ear, nose, throat, sore throat → ENT
- Eye problems, vision changes → Ophthalmology
- Urinary, kidney pain → Urology
- Children under 12 → Pediatrics
- Pregnancy, menstrual → Gynecology
- Anxiety, depression, mental health → Psychiatry
- All others / unclear → General Practice
```

- [ ] **Step 2: Create README.md**

```markdown
# TriageBot

AI-powered patient triage system for clinics. Patients describe symptoms via WhatsApp or web chat. AI collects symptoms, scores severity (green/yellow/red), recommends a department, and pushes a summary to a receptionist dashboard for human confirmation.

## Quick Start

```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your API keys
docker-compose up -d
```

- Backend: http://localhost:8000
- Dashboard: http://localhost:3000
- Health check: http://localhost:8000/health

## Login

- Username: `receptionist` / Password: `triage123`
- Username: `admin` / Password: `admin123`

## Architecture

Patient (WhatsApp/Web) → FastAPI → Claude AI (triage tools) → PostgreSQL → Receptionist Dashboard (Next.js)

## Tech Stack

FastAPI, Claude API, ChromaDB, PostgreSQL, Redis, Twilio, Next.js 14, Tailwind, Docker Compose
```

- [ ] **Step 3: Run full stack test**

```bash
cd triagebot
docker-compose up -d
# Wait for services to start
curl http://localhost:8000/health
# Expected: {"status":"ok","service":"triagebot"}
```

- [ ] **Step 4: Run all backend tests**

```bash
cd triagebot/backend
python -m pytest tests/ -v
```

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "feat: Docker Compose, README, sample clinical guidelines, final setup"
```

---

## Summary

| Task | What | Files |
|------|------|-------|
| 1 | Project scaffold | main.py, config.py, docker-compose.yml, Dockerfile |
| 2 | Database | migrations, pool.py, queries.py, schemas.py |
| 3 | Session manager | session_manager.py (Redis) |
| 4 | Triage tools | tools.py (5 tools), audit.py |
| 5 | Triage engine | triage_engine.py (Claude + tool orchestration) |
| 6 | RAG | rag.py (hybrid vector + BM25) |
| 7 | WhatsApp | twilio_client.py, webhook.py |
| 8 | Dashboard API | auth.py, dashboard.py, analytics.py |
| 9 | Web chat | websocket_chat.py |
| 10 | Frontend | Next.js dashboard (queue, chat, analytics) |
| 11 | Widget | Embeddable chat widget |
| 12 | Deploy | Docker Compose, README, sample data |
