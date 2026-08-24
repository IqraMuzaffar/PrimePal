from fastapi import APIRouter, Depends, Query, HTTPException, Request
from app.auth import get_current_staff
from app.database import query, query_one, execute
from app.models.schemas import PatientCreate
from app.services.audit import log_audit
import uuid

router = APIRouter(
    prefix="/api/admin",
    tags=["admin"],
    dependencies=[Depends(get_current_staff)],
)


# ---------------------------------------------------------------------------
# GET /api/admin/patients
# ---------------------------------------------------------------------------

@router.get("/patients")
async def list_patients(
    user: dict = Depends(get_current_staff),
    search: str | None = Query(None, description="Search by name, phone, email, or patient_number"),
):
    """List patients for the clinic, with optional search filter."""
    clinic_id = user["clinic_id"]

    if search:
        pattern = f"%{search}%"
        rows = await query(
            """
            SELECT
                p.*,
                MAX(a.date) AS last_visit
            FROM patients p
            LEFT JOIN appointments a ON a.patient_id = p.id
            WHERE p.clinic_id = $1
              AND (
                  p.name           ILIKE $2
               OR p.phone          ILIKE $2
               OR p.email          ILIKE $2
               OR p.patient_number ILIKE $2
              )
            GROUP BY p.id
            ORDER BY p.name
            """,
            clinic_id,
            pattern,
        )
    else:
        rows = await query(
            """
            SELECT
                p.*,
                MAX(a.date) AS last_visit
            FROM patients p
            LEFT JOIN appointments a ON a.patient_id = p.id
            WHERE p.clinic_id = $1
            GROUP BY p.id
            ORDER BY p.name
            """,
            clinic_id,
        )

    return rows


# ---------------------------------------------------------------------------
# GET /api/admin/patients/{patient_id}
# ---------------------------------------------------------------------------

@router.get("/patients/{patient_id}")
async def get_patient(
    patient_id: str,
    user: dict = Depends(get_current_staff),
):
    """Return a full patient record: demographics + recent appointments + active medications + recent lab results."""
    clinic_id = user["clinic_id"]

    patient = await query_one(
        "SELECT * FROM patients WHERE id = $1 AND clinic_id = $2",
        patient_id,
        clinic_id,
    )
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Recent appointments (last 10)
    appointments = await query(
        """
        SELECT a.*, d.name AS doctor_name, d.specialization
        FROM appointments a
        JOIN doctors d ON a.doctor_id = d.id
        WHERE a.patient_id = $1
        ORDER BY a.date DESC, a.time_slot DESC
        LIMIT 10
        """,
        patient_id,
    )

    # Active medications (prescriptions with items)
    import json as _json
    medications = await query(
        """
        SELECT p.*, d.name AS doctor_name,
               json_agg(json_build_object(
                 'drug_name',    pi.drug_name,
                 'dosage',       pi.dosage,
                 'frequency',    pi.frequency,
                 'duration',     pi.duration,
                 'instructions', pi.instructions
               )) AS items
        FROM prescriptions p
        JOIN doctors d ON p.doctor_id = d.id
        LEFT JOIN prescription_items pi ON pi.prescription_id = p.id
        WHERE p.patient_id = $1 AND p.status = 'active'
        GROUP BY p.id, d.name
        ORDER BY p.created_at DESC
        """,
        patient_id,
    )
    for row in medications:
        if isinstance(row.get("items"), str):
            row["items"] = _json.loads(row["items"])

    # Recent lab results (last 10 orders)
    lab_results = await query(
        """
        SELECT lo.*, d.name AS doctor_name,
               json_agg(json_build_object(
                 'test_name',       lr.test_name,
                 'value',           lr.value,
                 'unit',            lr.unit,
                 'reference_range', lr.reference_range,
                 'status',          lr.status
               )) FILTER (WHERE lr.id IS NOT NULL) AS results
        FROM lab_orders lo
        JOIN doctors d ON lo.doctor_id = d.id
        LEFT JOIN lab_results lr ON lr.lab_order_id = lo.id
        WHERE lo.patient_id = $1
        GROUP BY lo.id, d.name
        ORDER BY lo.ordered_at DESC
        LIMIT 10
        """,
        patient_id,
    )
    for row in lab_results:
        if isinstance(row.get("results"), str):
            row["results"] = _json.loads(row["results"])

    return {
        **dict(patient),
        "recent_appointments": appointments,
        "active_medications": medications,
        "recent_lab_results": lab_results,
    }


# ---------------------------------------------------------------------------
# POST /api/admin/patients
# ---------------------------------------------------------------------------

@router.post("/patients", status_code=201)
async def create_patient(
    body: PatientCreate,
    request: Request,
    user: dict = Depends(get_current_staff),
):
    """Register a new patient with an auto-generated patient number (CH-XXXX)."""
    clinic_id = user["clinic_id"]

    # Generate patient_number from sequence
    seq_row = await query_one("SELECT nextval('patient_number_seq') AS seq")
    patient_number = f"CH-{seq_row['seq']:04d}"

    patient_id = str(uuid.uuid4())
    await execute(
        """
        INSERT INTO patients
            (id, clinic_id, patient_number, name, email, phone, date_of_birth,
             gender, blood_type, address, allergies, chronic_conditions,
             emergency_contact, insurance)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        """,
        patient_id,
        clinic_id,
        patient_number,
        body.name,
        body.email,
        body.phone,
        body.date_of_birth,
        body.gender,
        body.blood_type,
        body.address,
        body.allergies,
        body.chronic_conditions,
        body.emergency_contact,
        body.insurance,
    )

    # Audit log
    ip = request.client.host if request.client else None
    await log_audit(
        clinic_id=clinic_id,
        user_type="staff",
        user_id=user["sub"],
        action="patient_created",
        resource="patients",
        resource_id=patient_id,
        details={"patient_number": patient_number, "name": body.name},
        ip_address=ip,
    )

    return await query_one("SELECT * FROM patients WHERE id = $1", patient_id)
