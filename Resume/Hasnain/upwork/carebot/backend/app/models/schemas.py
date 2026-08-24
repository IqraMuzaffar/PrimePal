from pydantic import BaseModel, Field
from datetime import date, datetime, time
from typing import Optional

# --- Auth ---
class PatientLogin(BaseModel):
    email: str
    date_of_birth: date

class StaffLogin(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    token: str
    role: str
    user_id: str
    clinic_id: str

# --- Patient ---
class PatientProfileUpdate(BaseModel):
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None

class AppointmentCreate(BaseModel):
    doctor_id: str
    date: date
    time_slot: time
    reason: Optional[str] = None

class AppointmentCancel(BaseModel):
    reason: Optional[str] = None

# --- Admin ---
class PatientCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    blood_type: Optional[str] = None
    address: Optional[str] = None
    allergies: Optional[list[str]] = None
    chronic_conditions: Optional[list[str]] = None
    emergency_contact: Optional[dict] = None
    insurance: Optional[dict] = None

class AppointmentUpdate(BaseModel):
    status: Optional[str] = None
    visit_notes: Optional[dict] = None

class LabOrderCreate(BaseModel):
    patient_id: str
    doctor_id: str
    test_panel: str
    priority: str = "routine"
    appointment_id: Optional[str] = None

class LabResultEntry(BaseModel):
    test_name: str
    value: str
    unit: Optional[str] = None
    reference_range: Optional[str] = None
    status: str = "normal"

class LabOrderUpdate(BaseModel):
    status: Optional[str] = None
    results: Optional[list[LabResultEntry]] = None

class PrescriptionCreate(BaseModel):
    patient_id: str
    doctor_id: str
    appointment_id: Optional[str] = None
    notes: Optional[str] = None
    items: list[dict]  # [{drug_name, dosage, frequency, duration, instructions}]

class PrescriptionUpdate(BaseModel):
    status: str

class DoctorCreate(BaseModel):
    name: str
    department_id: Optional[str] = None
    specialization: Optional[str] = None
    qualification: Optional[str] = None
    bio: Optional[str] = None
    available_days: Optional[list[str]] = None
    slot_duration_min: int = 30
    slots_start: str = "09:00"
    slots_end: str = "17:00"
    consultation_fee: Optional[float] = None

class DoctorUpdate(BaseModel):
    name: Optional[str] = None
    specialization: Optional[str] = None
    available_days: Optional[list[str]] = None
    slot_duration_min: Optional[int] = None
    slots_start: Optional[str] = None
    slots_end: Optional[str] = None
    consultation_fee: Optional[float] = None
    is_active: Optional[bool] = None

class FAQCreate(BaseModel):
    category: str
    question: str
    answer: str
    source: Optional[str] = None

class FAQUpdate(BaseModel):
    category: Optional[str] = None
    question: Optional[str] = None
    answer: Optional[str] = None
    source: Optional[str] = None

# --- Chat ---
class ChatMessage(BaseModel):
    message: str
