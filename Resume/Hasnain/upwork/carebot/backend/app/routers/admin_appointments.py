from fastapi import APIRouter, Depends, Query, HTTPException, Request
from app.auth import get_current_staff
from app.database import query, query_one, execute
from app.models.schemas import AppointmentUpdate
from app.services.audit import log_audit
import uuid
import json

router = APIRouter(
    prefix="/api/admin",
    tags=["admin"],
    dependencies=[Depends(get_current_staff)],
)


# ---------------------------------------------------------------------------
# GET /api/admin/appointments
# ---------------------------------------------------------------------------

@router.get("/appointments")
async def list_appointments(
    user: dict = Depends(get_current_staff),
    doctor_id: str | None = Query(None),
    date: str | None = Query(None),
    status: str | None = Query(None),
):
    """List appointments for the clinic, with optional filters on doctor, date, and status."""
    clinic_id = user["clinic_id"]

    conditions = ["a.clinic_id = $1"]
    values: list = [clinic_id]
    idx = 2

    if doctor_id:
        conditions.append(f"a.doctor_id = ${idx}")
        values.append(doctor_id)
        idx += 1

    if date:
        conditions.append(f"a.date = ${idx}")
        values.append(date)
        idx += 1

    if status:
        conditions.append(f"a.status = ${idx}")
        values.append(status)
        idx += 1

    where = " AND ".join(conditions)
    sql = f"""
        SELECT
            a.*,
            p.name AS patient_name,
            p.patient_number,
            p.phone AS patient_phone,
            d.name AS doctor_name,
            d.specialization
        FROM appointments a
        JOIN patients p ON a.patient_id = p.id
        JOIN doctors  d ON a.doctor_id  = d.id
        WHERE {where}
        ORDER BY a.date DESC, a.time_slot DESC
    """
    return await query(sql, *values)


# ---------------------------------------------------------------------------
# PATCH /api/admin/appointments/{appointment_id}
# ---------------------------------------------------------------------------

@router.patch("/appointments/{appointment_id}")
async def update_appointment(
    appointment_id: str,
    body: AppointmentUpdate,
    request: Request,
    user: dict = Depends(get_current_staff),
):
    """Update appointment status and/or add visit notes."""
    clinic_id = user["clinic_id"]

    appt = await query_one(
        "SELECT * FROM appointments WHERE id = $1 AND clinic_id = $2",
        appointment_id,
        clinic_id,
    )
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    updates = body.model_dump(exclude_none=True)

    # --- Update appointment status ---
    if updates.get("status"):
        await execute(
            "UPDATE appointments SET status = $1, updated_at = now() WHERE id = $2",
            updates["status"],
            appointment_id,
        )

    # --- Insert / upsert visit notes ---
    visit_notes: dict | None = updates.get("visit_notes")
    if visit_notes:
        existing_note = await query_one(
            "SELECT id FROM visit_notes WHERE appointment_id = $1",
            appointment_id,
        )
        if existing_note:
            await execute(
                """
                UPDATE visit_notes
                SET chief_complaint       = COALESCE($1, chief_complaint),
                    examination_findings  = COALESCE($2, examination_findings),
                    diagnosis             = COALESCE($3, diagnosis),
                    treatment_plan        = COALESCE($4, treatment_plan),
                    follow_up_instructions = COALESCE($5, follow_up_instructions),
                    follow_up_days        = COALESCE($6, follow_up_days)
                WHERE appointment_id = $7
                """,
                visit_notes.get("chief_complaint"),
                visit_notes.get("examination_findings"),
                visit_notes.get("diagnosis"),
                visit_notes.get("treatment_plan"),
                visit_notes.get("follow_up_instructions"),
                visit_notes.get("follow_up_days"),
                appointment_id,
            )
        else:
            await execute(
                """
                INSERT INTO visit_notes
                    (id, appointment_id, doctor_id, chief_complaint, examination_findings,
                     diagnosis, treatment_plan, follow_up_instructions, follow_up_days)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                """,
                str(uuid.uuid4()),
                appointment_id,
                str(appt["doctor_id"]),
                visit_notes.get("chief_complaint"),
                visit_notes.get("examination_findings"),
                visit_notes.get("diagnosis"),
                visit_notes.get("treatment_plan"),
                visit_notes.get("follow_up_instructions"),
                visit_notes.get("follow_up_days"),
            )

        # Create follow-up reminder notification if applicable
        follow_up_days = visit_notes.get("follow_up_days")
        if updates.get("status") == "completed" and follow_up_days:
            from datetime import date, timedelta
            follow_up_date = date.today() + timedelta(days=follow_up_days)
            await execute(
                """
                INSERT INTO notifications
                    (id, clinic_id, patient_id, type, subject, body, scheduled_for)
                VALUES ($1, $2, $3, 'follow_up_reminder', $4, $5, $6)
                """,
                str(uuid.uuid4()),
                clinic_id,
                str(appt["patient_id"]),
                "Follow-up Reminder",
                f"Your follow-up is due in {follow_up_days} days. Please schedule an appointment.",
                follow_up_date,
            )

    # --- Audit log ---
    ip = request.client.host if request.client else None
    await log_audit(
        clinic_id=clinic_id,
        user_type="staff",
        user_id=user["sub"],
        action="appointment_updated",
        resource="appointments",
        resource_id=appointment_id,
        details={k: v for k, v in updates.items() if k != "visit_notes"},
        ip_address=ip,
    )

    return await query_one(
        """
        SELECT a.*, p.name AS patient_name, d.name AS doctor_name
        FROM appointments a
        JOIN patients p ON a.patient_id = p.id
        JOIN doctors  d ON a.doctor_id  = d.id
        WHERE a.id = $1
        """,
        appointment_id,
    )
