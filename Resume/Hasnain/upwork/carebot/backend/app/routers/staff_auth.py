from fastapi import APIRouter, HTTPException
from app.database import query_one
from app.auth import create_token
from app.models.schemas import StaffLogin, TokenResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/staff/login", response_model=TokenResponse)
async def staff_login(body: StaffLogin):
    """Staff login with email + password. For demo, compare plain text password."""
    staff = await query_one(
        "SELECT id, clinic_id, name, role, password_hash FROM staff WHERE email = $1 AND is_active = true",
        body.email,
    )
    if not staff:
        raise HTTPException(401, "Invalid credentials")

    # For demo: accept the placeholder hash OR a plain-text match.
    # Production would use bcrypt.verify(body.password, staff["password_hash"]).
    placeholder = "$2b$12$placeholder_hash_for_demo"
    is_placeholder_hash = staff["password_hash"] == placeholder
    is_plaintext_match = staff["password_hash"] == body.password
    if not is_placeholder_hash and not is_plaintext_match:
        raise HTTPException(401, "Invalid credentials")

    token = create_token(
        user_id=str(staff["id"]),
        role="staff",
        clinic_id=str(staff["clinic_id"]),
        extra={"name": staff["name"], "staff_role": staff["role"]},
    )
    return TokenResponse(
        token=token,
        role="staff",
        user_id=str(staff["id"]),
        clinic_id=str(staff["clinic_id"]),
    )
