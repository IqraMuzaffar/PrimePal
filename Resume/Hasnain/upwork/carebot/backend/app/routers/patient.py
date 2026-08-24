from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import Response
from app.auth import get_current_patient
from app.database import query, query_one, execute
from app.models.schemas import PatientProfileUpdate, AppointmentCreate, AppointmentCancel
from app.services.audit import log_audit
from app.services.reports import (
    generate_lab_report,
    generate_prescription_report,
    generate_visit_summary,
    generate_patient_summary,
)
import uuid
import json
from datetime import date

router = APIRouter(
    prefix="/api/patient",
    tags=["patient"],
    dependencies=[Depends(get_current_patient)],
)


# ---------------------------------------------------------------------------
# Helper: re-fetch patient from the dependency without repeating Depends
# ---------------------------------------------------------------------------

async def _patient(request: Request, user: dict = Depends(get_current_patient)) -> dict:
    """Return the decoded JWT payload (patient)."""
    return user


# ---------------------------------------------------------------------------
# GET /api/patient/profile
# ---------------------------------------------------------------------------

@router.get("/profile")
async def get_profile(user: dict = Depends(get_current_patient)):
    """Return the current patient's profile."""
    patient = await query_one("SELECT * FROM patients WHERE id = $1", user["sub"])
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


# ---------------------------------------------------------------------------
# PATCH /api/patient/profile
# ---------------------------------------------------------------------------

@router.patch("/profile")
async def update_profile(
    body: PatientProfileUpdate,
    user: dict = Depends(get_current_patient),
):
    """Update editable patient profile fields (phone, email, address)."""
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    # Build dynamic SET clause: phone=$1, email=$2, ...
    set_parts = []
    values = []
    for i, (field, value) in enumerate(updates.items(), start=1):
        set_parts.append(f"{field} = ${i}")
        values.append(value)

    # Patient id goes at the end
    values.append(user["sub"])
    patient_id_placeholder = f"${len(values)}"

    sql = f"UPDATE patients SET {', '.join(set_parts)} WHERE id = {patient_id_placeholder}"
    await execute(sql, *values)

    # Return updated profile
    return await query_one("SELECT * FROM patients WHERE id = $1", user["sub"])


# ---------------------------------------------------------------------------
# GET /api/patient/appointments
# ---------------------------------------------------------------------------

@router.get("/appointments")
async def get_appointments(user: dict = Depends(get_current_patient)):
    """Return the patient's appointments with doctor details, newest first."""
    rows = await query(
        """
        SELECT a.*, d.name AS doctor_name, d.specialization
        FROM appointments a
        JOIN doctors d ON a.doctor_id = d.id
        WHERE a.patient_id = $1
        ORDER BY a.date DESC, a.time_slot DESC
        """,
        user["sub"],
    )
    return rows


# ---------------------------------------------------------------------------
# POST /api/patient/appointments
# ---------------------------------------------------------------------------

@router.post("/appointments", status_code=201)
async def create_appointment(
    request: Request,
    body: AppointmentCreate,
    user: dict = Depends(get_current_patient),
):
    """Book a new appointment."""
    # 1. Doctor exists and is active
    doctor = await query_one(
        "SELECT * FROM doctors WHERE id = $1 AND is_active = TRUE",
        body.doctor_id,
    )
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found or inactive")

    # 2. Date must be in the future
    if body.date <= date.today():
        raise HTTPException(status_code=400, detail="Appointment date must be in the future")

    # 3. Slot availability: no existing scheduled/confirmed appointment for same doctor+date+time
    conflict = await query_one(
        """
        SELECT id FROM appointments
        WHERE doctor_id = $1
          AND date = $2
          AND time_slot = $3
          AND status IN ('scheduled', 'confirmed')
        """,
        body.doctor_id,
        body.date,
        body.time_slot,
    )
    if conflict:
        raise HTTPException(status_code=409, detail="Time slot is not available")

    # Create appointment
    appointment_id = str(uuid.uuid4())
    await execute(
        """
        INSERT INTO appointments (id, clinic_id, patient_id, doctor_id, date, time_slot, reason, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'scheduled')
        """,
        appointment_id,
        user["clinic_id"],
        user["sub"],
        body.doctor_id,
        body.date,
        body.time_slot,
        body.reason,
    )

    # Generate reference number
    ref_number = f"APT-{body.date.year}-{appointment_id[-4:].upper()}"

    # Create notification with details
    notif_body = f"Your appointment with {doctor['name']} on {body.date} at {body.time_slot} is confirmed. Ref: {ref_number}"
    await execute(
        """
        INSERT INTO notifications (id, clinic_id, patient_id, type, subject, body, status, sent_at)
        VALUES ($1, $2, $3, 'appointment_confirmation', $4, $5, 'sent', now())
        """,
        str(uuid.uuid4()),
        user["clinic_id"],
        user["sub"],
        f"Appointment with {doctor['name']}",
        notif_body,
    )

    # Audit log
    ip = request.client.host if request.client else None
    await log_audit(
        clinic_id=user["clinic_id"],
        user_type="patient",
        user_id=user["sub"],
        action="appointment_created",
        resource="appointments",
        resource_id=appointment_id,
        details={"doctor_id": body.doctor_id, "date": str(body.date), "time_slot": str(body.time_slot)},
        ip_address=ip,
    )

    return {
        "id": appointment_id,
        "reference_number": ref_number,
        "doctor_id": body.doctor_id,
        "doctor_name": doctor["name"],
        "date": str(body.date),
        "time_slot": str(body.time_slot),
        "status": "scheduled",
        "message": f"Appointment booked successfully. Reference: {ref_number}",
    }


# ---------------------------------------------------------------------------
# PATCH /api/patient/appointments/{appointment_id}/cancel
# ---------------------------------------------------------------------------

@router.patch("/appointments/{appointment_id}/cancel")
async def cancel_appointment(
    appointment_id: str,
    request: Request,
    body: AppointmentCancel,
    user: dict = Depends(get_current_patient),
):
    """Cancel a scheduled or confirmed appointment."""
    appt = await query_one(
        "SELECT * FROM appointments WHERE id = $1 AND patient_id = $2",
        appointment_id,
        user["sub"],
    )
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    if appt["status"] not in ("scheduled", "confirmed"):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot cancel an appointment with status '{appt['status']}'",
        )

    await execute(
        """
        UPDATE appointments
        SET status = 'cancelled', cancellation_reason = $1
        WHERE id = $2
        """,
        body.reason,
        appointment_id,
    )

    # Audit log
    ip = request.client.host if request.client else None
    await log_audit(
        clinic_id=user["clinic_id"],
        user_type="patient",
        user_id=user["sub"],
        action="appointment_cancelled",
        resource="appointments",
        resource_id=appointment_id,
        details={"reason": body.reason},
        ip_address=ip,
    )

    return await query_one("SELECT * FROM appointments WHERE id = $1", appointment_id)


# ---------------------------------------------------------------------------
# GET /api/patient/medications
# ---------------------------------------------------------------------------

@router.get("/medications")
async def get_medications(user: dict = Depends(get_current_patient)):
    """Return active prescriptions with their items."""
    rows = await query(
        """
        SELECT p.*, d.name AS doctor_name,
               json_agg(json_build_object(
                 'drug_name', pi.drug_name, 'dosage', pi.dosage,
                 'frequency', pi.frequency, 'duration', pi.duration,
                 'instructions', pi.instructions
               )) AS items
        FROM prescriptions p
        JOIN doctors d ON p.doctor_id = d.id
        LEFT JOIN prescription_items pi ON pi.prescription_id = p.id
        WHERE p.patient_id = $1 AND p.status = 'active'
        GROUP BY p.id, d.name
        ORDER BY p.created_at DESC
        """,
        user["sub"],
    )
    # Deserialize items if returned as string
    for row in rows:
        if isinstance(row.get("items"), str):
            row["items"] = json.loads(row["items"])
    return rows


# ---------------------------------------------------------------------------
# GET /api/patient/lab-results
# ---------------------------------------------------------------------------

@router.get("/lab-results")
async def get_lab_results(user: dict = Depends(get_current_patient)):
    """Return all lab orders with associated results."""
    rows = await query(
        """
        SELECT lo.*, d.name AS doctor_name,
               json_agg(json_build_object(
                 'test_name', lr.test_name, 'value', lr.value,
                 'unit', lr.unit, 'reference_range', lr.reference_range,
                 'status', lr.status
               )) FILTER (WHERE lr.id IS NOT NULL) AS results
        FROM lab_orders lo
        JOIN doctors d ON lo.doctor_id = d.id
        LEFT JOIN lab_results lr ON lr.lab_order_id = lo.id
        WHERE lo.patient_id = $1
        GROUP BY lo.id, d.name
        ORDER BY lo.ordered_at DESC
        """,
        user["sub"],
    )
    for row in rows:
        if isinstance(row.get("results"), str):
            row["results"] = json.loads(row["results"])
    return rows


# ---------------------------------------------------------------------------
# GET /api/patient/lab-results/{lab_order_id}/report
# ---------------------------------------------------------------------------

@router.get("/lab-results/{lab_order_id}/report")
async def get_lab_report(lab_order_id: str, user: dict = Depends(get_current_patient)):
    """Download an HTML lab report for the given lab order (patient-scoped)."""
    # Fetch lab order (must belong to this patient)
    lab_order = await query_one(
        """
        SELECT lo.*, d.name AS doctor_name
        FROM lab_orders lo
        JOIN doctors d ON lo.doctor_id = d.id
        WHERE lo.id = $1 AND lo.patient_id = $2
        """,
        lab_order_id,
        user["sub"],
    )
    if not lab_order:
        raise HTTPException(status_code=404, detail="Lab order not found")

    # Fetch results
    results = await query(
        "SELECT * FROM lab_results WHERE lab_order_id = $1 ORDER BY created_at",
        lab_order_id,
    )

    # Fetch patient
    patient = await query_one("SELECT * FROM patients WHERE id = $1", user["sub"])
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Fetch clinic
    clinic = await query_one("SELECT * FROM clinics WHERE id = $1", user["clinic_id"])
    clinic = clinic or {}

    html = generate_lab_report(clinic, patient, lab_order, results)

    return Response(
        content=html,
        media_type="text/html",
        headers={
            "Content-Disposition": f'attachment; filename="lab-report-{lab_order_id[:8]}.html"'
        },
    )


# ---------------------------------------------------------------------------
# GET /api/patient/prescriptions/{prescription_id}/report
# ---------------------------------------------------------------------------

@router.get("/prescriptions/{prescription_id}/report")
async def get_prescription_report(prescription_id: str, user: dict = Depends(get_current_patient)):
    """Download an HTML prescription report for the given prescription (patient-scoped)."""
    prescription = await query_one(
        """
        SELECT p.*, d.name AS doctor_name, d.specialization, d.registration_number
        FROM prescriptions p
        JOIN doctors d ON p.doctor_id = d.id
        WHERE p.id = $1 AND p.patient_id = $2
        """,
        prescription_id,
        user["sub"],
    )
    if not prescription:
        raise HTTPException(status_code=404, detail="Prescription not found")

    items = await query(
        "SELECT * FROM prescription_items WHERE prescription_id = $1 ORDER BY created_at",
        prescription_id,
    )

    patient = await query_one("SELECT * FROM patients WHERE id = $1", user["sub"])
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    clinic = await query_one("SELECT * FROM clinics WHERE id = $1", user["clinic_id"])
    clinic = clinic or {}

    doctor = {
        "name": prescription.get("doctor_name", ""),
        "specialization": prescription.get("specialization", ""),
        "registration_number": prescription.get("registration_number", ""),
    }

    html = generate_prescription_report(clinic, patient, prescription, items, doctor)

    return Response(
        content=html,
        media_type="text/html",
        headers={
            "Content-Disposition": f'attachment; filename="prescription-{prescription_id[:8]}.html"'
        },
    )


# ---------------------------------------------------------------------------
# GET /api/patient/appointments/{appointment_id}/visit-summary
# ---------------------------------------------------------------------------

@router.get("/appointments/{appointment_id}/visit-summary")
async def get_visit_summary(appointment_id: str, user: dict = Depends(get_current_patient)):
    """Download an HTML visit summary for the given appointment (patient-scoped)."""
    appointment = await query_one(
        """
        SELECT a.*, d.name AS doctor_name, d.specialization, d.registration_number
        FROM appointments a
        JOIN doctors d ON a.doctor_id = d.id
        WHERE a.id = $1 AND a.patient_id = $2
        """,
        appointment_id,
        user["sub"],
    )
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    patient = await query_one("SELECT * FROM patients WHERE id = $1", user["sub"])
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    clinic = await query_one("SELECT * FROM clinics WHERE id = $1", user["clinic_id"])
    clinic = clinic or {}

    doctor = {
        "name": appointment.get("doctor_name", ""),
        "specialization": appointment.get("specialization", ""),
        "registration_number": appointment.get("registration_number", ""),
    }

    # visit_notes may be stored as JSON in a notes column or be empty for scheduled visits
    raw_notes = appointment.get("visit_notes") or appointment.get("notes") or {}
    if isinstance(raw_notes, str):
        try:
            raw_notes = json.loads(raw_notes)
        except (ValueError, TypeError):
            raw_notes = {"chief_complaint": raw_notes}

    html = generate_visit_summary(clinic, patient, appointment, raw_notes, doctor)

    return Response(
        content=html,
        media_type="text/html",
        headers={
            "Content-Disposition": f'attachment; filename="visit-summary-{appointment_id[:8]}.html"'
        },
    )


# ---------------------------------------------------------------------------
# GET /api/patient/summary/report
# ---------------------------------------------------------------------------

@router.get("/summary/report")
async def get_patient_summary_report(user: dict = Depends(get_current_patient)):
    """Download a full HTML patient summary (demographics, meds, labs, visits)."""
    patient = await query_one("SELECT * FROM patients WHERE id = $1", user["sub"])
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    clinic = await query_one("SELECT * FROM clinics WHERE id = $1", user["clinic_id"])
    clinic = clinic or {}

    appointments = await query(
        """
        SELECT a.*, d.name AS doctor_name, d.specialization
        FROM appointments a
        JOIN doctors d ON a.doctor_id = d.id
        WHERE a.patient_id = $1
        ORDER BY a.date DESC, a.time_slot DESC
        """,
        user["sub"],
    )

    medications = await query(
        """
        SELECT p.*, d.name AS doctor_name,
               json_agg(json_build_object(
                 'drug_name', pi.drug_name, 'dosage', pi.dosage,
                 'frequency', pi.frequency, 'duration', pi.duration,
                 'instructions', pi.instructions
               )) AS items
        FROM prescriptions p
        JOIN doctors d ON p.doctor_id = d.id
        LEFT JOIN prescription_items pi ON pi.prescription_id = p.id
        WHERE p.patient_id = $1 AND p.status = 'active'
        GROUP BY p.id, d.name
        ORDER BY p.created_at DESC
        """,
        user["sub"],
    )
    for m in medications:
        if isinstance(m.get("items"), str):
            m["items"] = json.loads(m["items"])

    lab_results = await query(
        """
        SELECT lo.*, d.name AS doctor_name,
               json_agg(json_build_object(
                 'test_name', lr.test_name, 'value', lr.value,
                 'unit', lr.unit, 'reference_range', lr.reference_range,
                 'status', lr.status
               )) FILTER (WHERE lr.id IS NOT NULL) AS results
        FROM lab_orders lo
        JOIN doctors d ON lo.doctor_id = d.id
        LEFT JOIN lab_results lr ON lr.lab_order_id = lo.id
        WHERE lo.patient_id = $1
        GROUP BY lo.id, d.name
        ORDER BY lo.ordered_at DESC
        LIMIT 10
        """,
        user["sub"],
    )
    for r in lab_results:
        if isinstance(r.get("results"), str):
            r["results"] = json.loads(r["results"])

    html = generate_patient_summary(clinic, patient, appointments, medications, lab_results)

    patient_name_slug = patient.get("name", "patient").replace(" ", "-").lower()
    return Response(
        content=html,
        media_type="text/html",
        headers={
            "Content-Disposition": f'attachment; filename="patient-summary-{patient_name_slug}.html"'
        },
    )


# ---------------------------------------------------------------------------
# GET /api/patient/chat/history
# ---------------------------------------------------------------------------

@router.get("/chat/history")
async def get_chat_history(user: dict = Depends(get_current_patient)):
    """Return chat sessions with their messages for the current patient."""
    rows = await query(
        """
        SELECT cs.*,
               json_agg(json_build_object(
                 'role', cm.role, 'content', cm.content,
                 'tool_name', cm.tool_name, 'created_at', cm.created_at
               ) ORDER BY cm.created_at) AS messages
        FROM chat_sessions cs
        LEFT JOIN chat_messages cm ON cm.session_id = cs.id
        WHERE cs.patient_id = $1
        GROUP BY cs.id
        ORDER BY cs.started_at DESC
        """,
        user["sub"],
    )
    for row in rows:
        if isinstance(row.get("messages"), str):
            row["messages"] = json.loads(row["messages"])
    return rows
