from fastapi import APIRouter, HTTPException
from app.database import query_one
from app.auth import create_token
from app.models.schemas import PatientLogin, TokenResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/patient/login", response_model=TokenResponse)
async def patient_login(body: PatientLogin):
    """Patient login with email + date of birth."""
    patient = await query_one(
        "SELECT id, clinic_id, name FROM patients WHERE email = $1 AND date_of_birth = $2",
        body.email,
        body.date_of_birth,
    )
    if not patient:
        raise HTTPException(401, "Invalid email or date of birth")

    token = create_token(
        user_id=str(patient["id"]),
        role="patient",
        clinic_id=str(patient["clinic_id"]),
        extra={"name": patient["name"]},
    )
    return TokenResponse(
        token=token,
        role="patient",
        user_id=str(patient["id"]),
        clinic_id=str(patient["clinic_id"]),
    )
