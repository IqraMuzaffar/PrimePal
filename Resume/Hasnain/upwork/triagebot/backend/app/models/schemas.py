from pydantic import BaseModel
from datetime import datetime
from uuid import UUID

class PatientCreate(BaseModel):
    phone: str
    name: str | None = None

class SymptomsData(BaseModel):
    body_part: str
    duration: str
    intensity: int
    associated_symptoms: list[str] = []
    raw_description: str

class TriageResult(BaseModel):
    severity: str
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
    action: str
    department: str | None = None
    reason: str | None = None
    reviewed_by: str

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    token: str
    username: str
