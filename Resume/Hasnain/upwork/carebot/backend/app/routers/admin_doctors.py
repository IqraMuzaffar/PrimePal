from fastapi import APIRouter, Depends, HTTPException
from app.auth import get_current_staff
from app.database import query, query_one, execute
from app.models.schemas import DoctorCreate, DoctorUpdate
import uuid
import json

router = APIRouter(
    prefix="/api/admin/doctors",
    tags=["admin-doctors"],
    dependencies=[Depends(get_current_staff)],
)


# ---------------------------------------------------------------------------
# GET /api/admin/doctors
# ---------------------------------------------------------------------------

@router.get("")
async def list_doctors(user: dict = Depends(get_current_staff)):
    """Return all doctors for this clinic with their department name."""
    rows = await query(
        """
        SELECT d.*,
               d.slots_start::text AS slots_start,
               d.slots_end::text   AS slots_end,
               dep.name            AS department_name
        FROM doctors d
        LEFT JOIN departments dep ON d.department_id = dep.id
        WHERE d.clinic_id = $1
        ORDER BY d.name
        """,
        user["clinic_id"],
    )
    return rows


# ---------------------------------------------------------------------------
# POST /api/admin/doctors
# ---------------------------------------------------------------------------

@router.post("", status_code=201)
async def create_doctor(
    body: DoctorCreate,
    user: dict = Depends(get_current_staff),
):
    """Insert a new doctor record for this clinic."""
    doctor_id = str(uuid.uuid4())

    await execute(
        """
        INSERT INTO doctors
            (id, clinic_id, department_id, name, specialization, qualification, bio,
             available_days, slot_duration_min, slots_start, slots_end, consultation_fee)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::time, $11::time, $12)
        """,
        doctor_id,
        user["clinic_id"],
        body.department_id,
        body.name,
        body.specialization,
        body.qualification,
        body.bio,
        json.dumps(body.available_days) if body.available_days is not None else None,
        body.slot_duration_min,
        body.slots_start,
        body.slots_end,
        body.consultation_fee,
    )

    return await query_one("SELECT * FROM doctors WHERE id = $1", doctor_id)


# ---------------------------------------------------------------------------
# PATCH /api/admin/doctors/{doctor_id}
# ---------------------------------------------------------------------------

@router.patch("/{doctor_id}")
async def update_doctor(
    doctor_id: str,
    body: DoctorUpdate,
    user: dict = Depends(get_current_staff),
):
    """Partially update a doctor record (only provided fields are SET)."""
    existing = await query_one(
        "SELECT id FROM doctors WHERE id = $1 AND clinic_id = $2",
        doctor_id,
        user["clinic_id"],
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Doctor not found")

    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    set_parts = []
    values = []
    idx = 1

    for field, value in updates.items():
        if field in ("available_days",):
            set_parts.append(f"{field} = ${idx}")
            values.append(json.dumps(value))
        elif field in ("slots_start", "slots_end"):
            set_parts.append(f"{field} = ${idx}::time")
            values.append(value)
        else:
            set_parts.append(f"{field} = ${idx}")
            values.append(value)
        idx += 1

    values.append(doctor_id)
    sql = f"UPDATE doctors SET {', '.join(set_parts)} WHERE id = ${idx}"
    await execute(sql, *values)

    return await query_one("SELECT * FROM doctors WHERE id = $1", doctor_id)
