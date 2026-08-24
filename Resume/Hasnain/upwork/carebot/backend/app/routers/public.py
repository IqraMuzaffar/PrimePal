from fastapi import APIRouter, Query, HTTPException
from app.database import query, query_one

router = APIRouter(prefix="/api", tags=["public"])


@router.get("/clinic/info")
async def get_clinic_info():
    """Return clinic details with departments."""
    clinic = await query_one(
        "SELECT id, name, address, phone, email, operating_hours FROM clinics LIMIT 1"
    )
    if not clinic:
        raise HTTPException(404, "No clinic configured")
    departments = await query(
        "SELECT id, name, description FROM departments WHERE clinic_id = $1",
        clinic["id"],
    )
    return {**clinic, "departments": departments}


@router.get("/clinic/doctors")
async def get_doctors():
    """Public doctor list."""
    doctors = await query(
        """
        SELECT d.id, d.name, d.specialization, d.qualification, d.bio, d.photo_url,
               d.consultation_fee, d.available_days, d.slot_duration_min,
               d.slots_start::text, d.slots_end::text, dep.name as department
        FROM doctors d
        LEFT JOIN departments dep ON d.department_id = dep.id
        WHERE d.is_active = true
        ORDER BY d.name
        """
    )
    return {"doctors": doctors}


@router.get("/clinic/departments")
async def get_departments():
    """Department list."""
    deps = await query(
        "SELECT id, name, description FROM departments ORDER BY name"
    )
    return {"departments": deps}


@router.get("/booking/slots")
async def get_available_slots(
    doctor_id: str = Query(...), date: str = Query(...)
):
    """Available time slots for a doctor on a date."""
    from app.services.scheduler import get_available_slots
    slots = await get_available_slots(doctor_id, date)
    return {"slots": slots, "doctor_id": doctor_id, "date": date}
