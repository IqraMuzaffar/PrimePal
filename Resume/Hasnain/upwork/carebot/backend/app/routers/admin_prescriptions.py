from fastapi import APIRouter, Depends, HTTPException, Request
from app.auth import get_current_staff
from app.database import query, query_one, execute
from app.models.schemas import PrescriptionCreate, PrescriptionUpdate
from app.services.audit import log_audit
import uuid
import json

router = APIRouter(
    prefix="/api/admin/prescriptions",
    tags=["admin-prescriptions"],
    dependencies=[Depends(get_current_staff)],
)


# ---------------------------------------------------------------------------
# GET /api/admin/prescriptions
# ---------------------------------------------------------------------------

@router.get("")
async def list_prescriptions(user: dict = Depends(get_current_staff)):
    """Return all prescriptions with items, patient name, and doctor name."""
    rows = await query(
        """
        SELECT pr.*,
               p.name AS patient_name,
               d.name AS doctor_name,
               json_agg(
                 json_build_object(
                   'id',           pi.id,
                   'drug_name',    pi.drug_name,
                   'dosage',       pi.dosage,
                   'frequency',    pi.frequency,
                   'duration',     pi.duration,
                   'instructions', pi.instructions
                 )
               ) FILTER (WHERE pi.id IS NOT NULL) AS items
        FROM prescriptions pr
        JOIN patients p ON pr.patient_id = p.id
        JOIN doctors  d ON pr.doctor_id  = d.id
        LEFT JOIN prescription_items pi ON pi.prescription_id = pr.id
        WHERE pr.clinic_id = $1
        GROUP BY pr.id, p.name, d.name
        ORDER BY pr.created_at DESC
        """,
        user["clinic_id"],
    )

    for row in rows:
        if isinstance(row.get("items"), str):
            row["items"] = json.loads(row["items"])

    return rows


# ---------------------------------------------------------------------------
# POST /api/admin/prescriptions
# ---------------------------------------------------------------------------

@router.post("", status_code=201)
async def create_prescription(
    request: Request,
    body: PrescriptionCreate,
    user: dict = Depends(get_current_staff),
):
    """Create prescription + items. Checks patient allergies against drug names."""
    # --- Allergy check ---
    patient = await query_one(
        "SELECT name, allergies FROM patients WHERE id = $1 AND clinic_id = $2",
        body.patient_id,
        user["clinic_id"],
    )
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    allergies: list = patient.get("allergies") or []
    allergy_warnings: list[dict] = []

    for item in body.items:
        drug_name: str = item.get("drug_name", "")
        for allergy in allergies:
            if allergy.lower() in drug_name.lower() or drug_name.lower() in allergy.lower():
                allergy_warnings.append({
                    "drug_name": drug_name,
                    "allergy": allergy,
                    "warning": f"Patient is allergic to '{allergy}' — conflicts with '{drug_name}'",
                })

    # --- Insert prescription ---
    prescription_id = str(uuid.uuid4())
    await execute(
        """
        INSERT INTO prescriptions
            (id, clinic_id, patient_id, doctor_id, appointment_id, notes, status)
        VALUES ($1, $2, $3, $4, $5, $6, 'active')
        """,
        prescription_id,
        user["clinic_id"],
        body.patient_id,
        body.doctor_id,
        body.appointment_id,
        body.notes,
    )

    # --- Insert prescription items ---
    for item in body.items:
        await execute(
            """
            INSERT INTO prescription_items
                (id, prescription_id, drug_name, dosage, frequency, duration, instructions)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            """,
            str(uuid.uuid4()),
            prescription_id,
            item.get("drug_name"),
            item.get("dosage"),
            item.get("frequency"),
            item.get("duration"),
            item.get("instructions"),
        )

    # --- Audit ---
    ip = request.client.host if request.client else None
    await log_audit(
        clinic_id=user["clinic_id"],
        user_type="staff",
        user_id=user["sub"],
        action="prescription_created",
        resource="prescriptions",
        resource_id=prescription_id,
        details={
            "patient_id": body.patient_id,
            "doctor_id": body.doctor_id,
            "item_count": len(body.items),
            "allergy_warnings": len(allergy_warnings),
        },
        ip_address=ip,
    )

    created = await query_one("SELECT * FROM prescriptions WHERE id = $1", prescription_id)
    response = dict(created)

    if allergy_warnings:
        response["allergy_warnings"] = allergy_warnings

    return response


# ---------------------------------------------------------------------------
# PATCH /api/admin/prescriptions/{prescription_id}
# ---------------------------------------------------------------------------

@router.patch("/{prescription_id}")
async def update_prescription(
    prescription_id: str,
    body: PrescriptionUpdate,
    user: dict = Depends(get_current_staff),
):
    """Update prescription status (active / completed / cancelled)."""
    existing = await query_one(
        "SELECT id FROM prescriptions WHERE id = $1 AND clinic_id = $2",
        prescription_id,
        user["clinic_id"],
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Prescription not found")

    allowed_statuses = {"active", "completed", "cancelled"}
    if body.status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Status must be one of: {', '.join(allowed_statuses)}",
        )

    await execute(
        "UPDATE prescriptions SET status = $1 WHERE id = $2",
        body.status,
        prescription_id,
    )

    return await query_one("SELECT * FROM prescriptions WHERE id = $1", prescription_id)
