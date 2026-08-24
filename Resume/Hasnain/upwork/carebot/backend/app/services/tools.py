"""16 tool functions for CareBot AI chat.

Each function is an async callable that queries the database and returns
a dict that gets JSON-serialized as the tool result for Claude.
"""
import uuid
import json
from datetime import date, datetime, timezone
from app.database import query, query_one, execute
from app.services.scheduler import get_available_slots
from app.services.triage import suggest_department
from app.services.audit import log_audit


# ---------------------------------------------------------------------------
# 1. triage_symptoms
# ---------------------------------------------------------------------------
async def triage_symptoms(
    patient_id: str,
    symptoms: str,
    duration: str,
    severity: str,
) -> dict:
    """Triage patient symptoms — suggest department and urgency level."""
    try:
        patient = await query_one(
            "SELECT allergies, chronic_conditions FROM patients WHERE id = $1",
            patient_id,
        )
        context_parts = []
        if patient:
            if patient.get("chronic_conditions"):
                context_parts.append(
                    f"Chronic conditions: {', '.join(patient['chronic_conditions'])}"
                )
            if patient.get("allergies"):
                context_parts.append(
                    f"Allergies: {', '.join(patient['allergies'])}"
                )

        department = suggest_department(symptoms)

        severity_lower = severity.lower() if severity else "mild"
        urgency_map = {"severe": "urgent", "moderate": "soon", "mild": "routine"}
        urgency = urgency_map.get(severity_lower, "routine")

        reasoning = (
            f"Symptoms: {symptoms}. Duration: {duration}. Severity: {severity}. "
            f"Recommended department: {department}."
        )
        if context_parts:
            reasoning += " Patient context: " + "; ".join(context_parts) + "."

        return {
            "urgency": urgency,
            "recommended_department": department,
            "reasoning": reasoning,
            "disclaimer": "This is AI triage, not a medical diagnosis. Please consult a doctor.",
        }
    except Exception as exc:
        return {"error": str(exc)}


# ---------------------------------------------------------------------------
# 2. book_appointment
# ---------------------------------------------------------------------------
async def book_appointment(
    patient_id: str,
    clinic_id: str,
    doctor_id: str,
    date_str: str,
    time_slot: str,
    reason: str,
) -> dict:
    """Book a new appointment for the patient."""
    try:
        doctor = await query_one(
            "SELECT id, name, clinic_id FROM doctors WHERE id = $1 AND is_active = true",
            doctor_id,
        )
        if not doctor:
            return {"error": "Doctor not found or inactive."}

        available = await get_available_slots(doctor_id, date_str)
        if time_slot not in available:
            return {
                "error": f"Slot {time_slot} on {date_str} is not available.",
                "available_slots": available,
            }

        appointment_id = str(uuid.uuid4())
        target_date = datetime.strptime(date_str, "%Y-%m-%d").date()

        await execute(
            """INSERT INTO appointments (id, clinic_id, patient_id, doctor_id, date, time_slot, reason, status)
               VALUES ($1, $2, $3, $4, $5, $6::time, $7, 'scheduled')""",
            appointment_id, clinic_id, patient_id, doctor_id,
            target_date, time_slot, reason,
        )

        # Confirmation notification
        notif_id = str(uuid.uuid4())
        await execute(
            """INSERT INTO notifications (id, clinic_id, patient_id, type, subject, body)
               VALUES ($1, $2, $3, 'appointment_confirmation', $4, $5)""",
            notif_id, clinic_id, patient_id,
            "Appointment Confirmed",
            f"Your appointment with Dr. {doctor['name']} on {date_str} at {time_slot} has been booked.",
        )

        return {
            "success": True,
            "appointment_id": appointment_id,
            "doctor_name": doctor["name"],
            "date": date_str,
            "time_slot": time_slot,
            "message": f"Appointment booked with Dr. {doctor['name']} on {date_str} at {time_slot}.",
        }
    except Exception as exc:
        return {"error": str(exc)}


# ---------------------------------------------------------------------------
# 3. reschedule_appointment
# ---------------------------------------------------------------------------
async def reschedule_appointment(
    patient_id: str,
    appointment_id: str,
    new_date: str,
    new_time_slot: str,
) -> dict:
    """Reschedule an existing appointment to a new date/time."""
    try:
        appt = await query_one(
            """SELECT id, clinic_id, doctor_id, reason, status
               FROM appointments WHERE id = $1 AND patient_id = $2""",
            appointment_id, patient_id,
        )
        if not appt:
            return {"error": "Appointment not found or does not belong to you."}
        if appt["status"] in ("cancelled", "completed"):
            return {"error": f"Cannot reschedule a {appt['status']} appointment."}

        # Cancel the old appointment
        await execute(
            "UPDATE appointments SET status = 'cancelled', cancellation_reason = 'Rescheduled' WHERE id = $1",
            appointment_id,
        )

        # Book new one with same doctor
        new_appt_id = str(uuid.uuid4())
        target_date = datetime.strptime(new_date, "%Y-%m-%d").date()

        available = await get_available_slots(appt["doctor_id"], new_date)
        if new_time_slot not in available:
            return {
                "error": f"Slot {new_time_slot} on {new_date} is not available.",
                "available_slots": available,
            }

        await execute(
            """INSERT INTO appointments (id, clinic_id, patient_id, doctor_id, date, time_slot, reason, status)
               VALUES ($1, $2, $3, $4, $5, $6::time, $7, 'scheduled')""",
            new_appt_id, appt["clinic_id"], patient_id, appt["doctor_id"],
            target_date, new_time_slot, appt["reason"],
        )

        return {
            "success": True,
            "new_appointment_id": new_appt_id,
            "message": f"Appointment rescheduled to {new_date} at {new_time_slot}.",
        }
    except Exception as exc:
        return {"error": str(exc)}


# ---------------------------------------------------------------------------
# 4. cancel_appointment
# ---------------------------------------------------------------------------
async def cancel_appointment(
    patient_id: str,
    appointment_id: str,
    reason: str,
) -> dict:
    """Cancel an existing appointment."""
    try:
        appt = await query_one(
            """SELECT id, status FROM appointments
               WHERE id = $1 AND patient_id = $2""",
            appointment_id, patient_id,
        )
        if not appt:
            return {"error": "Appointment not found or does not belong to you."}
        if appt["status"] in ("cancelled", "completed", "no_show"):
            return {"error": f"Cannot cancel a {appt['status']} appointment."}

        await execute(
            "UPDATE appointments SET status = 'cancelled', cancellation_reason = $1, updated_at = now() WHERE id = $2",
            reason, appointment_id,
        )

        return {
            "success": True,
            "message": "Your appointment has been cancelled.",
        }
    except Exception as exc:
        return {"error": str(exc)}


# ---------------------------------------------------------------------------
# 5. get_my_appointments
# ---------------------------------------------------------------------------
async def get_my_appointments(patient_id: str) -> dict:
    """Return upcoming and recent appointments for the patient."""
    try:
        upcoming = await query(
            """SELECT a.id, a.date::text, a.time_slot::text as time_slot, a.status, a.reason,
                      d.name as doctor_name, d.specialization
               FROM appointments a JOIN doctors d ON a.doctor_id = d.id
               WHERE a.patient_id = $1 AND a.date >= CURRENT_DATE AND a.status NOT IN ('cancelled')
               ORDER BY a.date, a.time_slot
               LIMIT 10""",
            patient_id,
        )
        recent = await query(
            """SELECT a.id, a.date::text, a.time_slot::text as time_slot, a.status, a.reason,
                      d.name as doctor_name, d.specialization
               FROM appointments a JOIN doctors d ON a.doctor_id = d.id
               WHERE a.patient_id = $1 AND (a.date < CURRENT_DATE OR a.status IN ('completed','cancelled'))
               ORDER BY a.date DESC, a.time_slot DESC
               LIMIT 5""",
            patient_id,
        )
        return {"upcoming": upcoming, "recent": recent}
    except Exception as exc:
        return {"error": str(exc)}


# ---------------------------------------------------------------------------
# 6. get_my_profile
# ---------------------------------------------------------------------------
async def get_my_profile(patient_id: str) -> dict:
    """Return the patient's profile information."""
    try:
        patient = await query_one(
            """SELECT id, patient_number, name, email, phone, date_of_birth::text,
                      gender, blood_type, address, allergies, chronic_conditions,
                      emergency_contact, insurance, created_at::text
               FROM patients WHERE id = $1""",
            patient_id,
        )
        if not patient:
            return {"error": "Patient not found."}
        return patient
    except Exception as exc:
        return {"error": str(exc)}


# ---------------------------------------------------------------------------
# 7. update_my_contact
# ---------------------------------------------------------------------------
async def update_my_contact(
    patient_id: str,
    phone: str | None = None,
    email: str | None = None,
    address: str | None = None,
) -> dict:
    """Update patient contact information (only provided fields)."""
    try:
        updates = {}
        if phone is not None:
            updates["phone"] = phone
        if email is not None:
            updates["email"] = email
        if address is not None:
            updates["address"] = address

        if not updates:
            return {"error": "No fields provided to update."}

        set_clauses = []
        values = []
        for i, (col, val) in enumerate(updates.items(), start=1):
            set_clauses.append(f"{col} = ${i}")
            values.append(val)
        values.append(patient_id)

        sql = f"UPDATE patients SET {', '.join(set_clauses)} WHERE id = ${len(values)}"
        await execute(sql, *values)

        return {"success": True, "updated_fields": list(updates.keys())}
    except Exception as exc:
        return {"error": str(exc)}


# ---------------------------------------------------------------------------
# 8. get_my_medications
# ---------------------------------------------------------------------------
async def get_my_medications(patient_id: str) -> dict:
    """Return active prescriptions with medication items."""
    try:
        rows = await query(
            """SELECT pi.drug_name, pi.dosage, pi.frequency, pi.duration, pi.instructions,
                      d.name as doctor_name, p.created_at::text as prescribed_on
               FROM prescriptions p
               JOIN prescription_items pi ON pi.prescription_id = p.id
               JOIN doctors d ON p.doctor_id = d.id
               WHERE p.patient_id = $1 AND p.status = 'active'
               ORDER BY p.created_at DESC""",
            patient_id,
        )
        return {"medications": rows}
    except Exception as exc:
        return {"error": str(exc)}


# ---------------------------------------------------------------------------
# 9. get_my_lab_results
# ---------------------------------------------------------------------------
async def get_my_lab_results(patient_id: str, recent_count: int = 5) -> dict:
    """Return recent lab orders with their results."""
    try:
        orders = await query(
            """SELECT lo.id, lo.test_panel, lo.ordered_at::text as date, lo.status,
                      d.name as doctor_name
               FROM lab_orders lo
               JOIN doctors d ON lo.doctor_id = d.id
               WHERE lo.patient_id = $1
               ORDER BY lo.ordered_at DESC
               LIMIT $2""",
            patient_id, recent_count,
        )

        lab_results = []
        for order in orders:
            results = await query(
                """SELECT test_name, value, unit, reference_range as range, status
                   FROM lab_results WHERE lab_order_id = $1""",
                order["id"],
            )
            lab_results.append({
                "test_panel": order["test_panel"],
                "date": order["date"],
                "status": order["status"],
                "doctor_name": order["doctor_name"],
                "results": results,
            })

        return {"lab_results": lab_results}
    except Exception as exc:
        return {"error": str(exc)}


# ---------------------------------------------------------------------------
# 10. explain_lab_results
# ---------------------------------------------------------------------------
async def explain_lab_results(patient_id: str, lab_order_id: str) -> dict:
    """Get a specific lab order and format results for AI explanation."""
    try:
        order = await query_one(
            """SELECT lo.id, lo.test_panel, lo.ordered_at::text as date, lo.status,
                      d.name as doctor_name
               FROM lab_orders lo
               JOIN doctors d ON lo.doctor_id = d.id
               WHERE lo.id = $1 AND lo.patient_id = $2""",
            lab_order_id, patient_id,
        )
        if not order:
            return {"error": "Lab order not found or does not belong to you."}

        results = await query(
            """SELECT test_name, value, unit, reference_range as range, status
               FROM lab_results WHERE lab_order_id = $1""",
            lab_order_id,
        )

        # Build a human-readable summary for the AI to explain
        lines = [f"Lab Panel: {order['test_panel']} (ordered {order['date']})"]
        for r in results:
            flag = " ⚠️" if r["status"] != "normal" else ""
            lines.append(
                f"- {r['test_name']}: {r['value']} {r.get('unit', '')} "
                f"(ref: {r.get('range', 'N/A')}) [{r['status']}]{flag}"
            )

        return {
            "lab_order": order,
            "results": results,
            "summary": "\n".join(lines),
        }
    except Exception as exc:
        return {"error": str(exc)}


# ---------------------------------------------------------------------------
# 11. get_doctors
# ---------------------------------------------------------------------------
async def get_doctors(clinic_id: str, department: str | None = None) -> dict:
    """List doctors at a clinic, optionally filtered by department."""
    try:
        if department:
            rows = await query(
                """SELECT d.id, d.name, d.specialization, dep.name as department,
                          d.consultation_fee as fee, d.available_days
                   FROM doctors d
                   LEFT JOIN departments dep ON d.department_id = dep.id
                   WHERE d.clinic_id = $1 AND d.is_active = true
                     AND dep.name ILIKE $2
                   ORDER BY d.name""",
                clinic_id, f"%{department}%",
            )
        else:
            rows = await query(
                """SELECT d.id, d.name, d.specialization, dep.name as department,
                          d.consultation_fee as fee, d.available_days
                   FROM doctors d
                   LEFT JOIN departments dep ON d.department_id = dep.id
                   WHERE d.clinic_id = $1 AND d.is_active = true
                   ORDER BY d.name""",
                clinic_id,
            )

        # Enrich with next available slot
        doctors = []
        today = date.today().isoformat()
        for row in rows:
            doc = dict(row)
            slots = await get_available_slots(doc["id"], today)
            doc["next_available_slot"] = slots[0] if slots else None
            doctors.append(doc)

        return {"doctors": doctors}
    except Exception as exc:
        return {"error": str(exc)}


# ---------------------------------------------------------------------------
# 12. get_clinic_info
# ---------------------------------------------------------------------------
async def get_clinic_info(clinic_id: str) -> dict:
    """Return clinic details and its departments."""
    try:
        clinic = await query_one(
            "SELECT id, name, address, phone, email, operating_hours FROM clinics WHERE id = $1",
            clinic_id,
        )
        if not clinic:
            return {"error": "Clinic not found."}

        departments = await query(
            "SELECT name, description FROM departments WHERE clinic_id = $1 ORDER BY name",
            clinic_id,
        )
        clinic["departments"] = [d["name"] for d in departments]
        return clinic
    except Exception as exc:
        return {"error": str(exc)}


# ---------------------------------------------------------------------------
# 13. search_health_faq
# ---------------------------------------------------------------------------
async def search_health_faq(clinic_id: str, query_text: str) -> dict:
    """Search health FAQs by keyword (ILIKE on question and answer)."""
    try:
        pattern = f"%{query_text}%"
        rows = await query(
            """SELECT question, answer, source, category
               FROM health_faqs
               WHERE clinic_id = $1 AND (question ILIKE $2 OR answer ILIKE $2)
               ORDER BY created_at DESC
               LIMIT 10""",
            clinic_id, pattern,
        )
        return {"faqs": rows, "count": len(rows)}
    except Exception as exc:
        return {"error": str(exc)}


# ---------------------------------------------------------------------------
# 14. request_prescription_refill
# ---------------------------------------------------------------------------
async def request_prescription_refill(patient_id: str, prescription_id: str) -> dict:
    """Request a refill for an active prescription."""
    try:
        rx = await query_one(
            """SELECT p.id, p.doctor_id, p.status, p.patient_id,
                      d.clinic_id, d.name as doctor_name
               FROM prescriptions p
               JOIN doctors d ON p.doctor_id = d.id
               WHERE p.id = $1 AND p.patient_id = $2""",
            prescription_id, patient_id,
        )
        if not rx:
            return {"error": "Prescription not found or does not belong to you."}
        if rx["status"] != "active":
            return {"error": f"Cannot refill a {rx['status']} prescription."}

        # Notify the doctor
        notif_id = str(uuid.uuid4())
        await execute(
            """INSERT INTO notifications (id, clinic_id, patient_id, type, subject, body)
               VALUES ($1, $2, $3, 'prescription_refill', $4, $5)""",
            notif_id, rx["clinic_id"], patient_id,
            "Prescription Refill Request",
            f"Patient has requested a refill for prescription {prescription_id}. "
            f"Prescribing doctor: Dr. {rx['doctor_name']}.",
        )

        return {
            "success": True,
            "message": "Your refill request has been sent to your doctor. You will be notified once it is approved.",
        }
    except Exception as exc:
        return {"error": str(exc)}


# ---------------------------------------------------------------------------
# 15. request_lab_report_pdf
# ---------------------------------------------------------------------------
async def request_lab_report_pdf(patient_id: str, lab_order_id: str) -> dict:
    """Return a download URL for a lab report PDF."""
    try:
        order = await query_one(
            "SELECT id, status FROM lab_orders WHERE id = $1 AND patient_id = $2",
            lab_order_id, patient_id,
        )
        if not order:
            return {"error": "Lab order not found or does not belong to you."}
        if order["status"] != "completed":
            return {"error": "Lab report is not ready yet. Current status: " + order["status"]}

        return {
            "download_url": f"/api/patient/lab-results/{lab_order_id}/pdf",
            "message": "Your lab report PDF is ready for download.",
        }
    except Exception as exc:
        return {"error": str(exc)}


# ---------------------------------------------------------------------------
# 16. escalate_to_staff
# ---------------------------------------------------------------------------
async def escalate_to_staff(clinic_id: str, patient_id: str, reason: str) -> dict:
    """Escalate a patient concern to clinic staff."""
    try:
        notif_id = str(uuid.uuid4())
        await execute(
            """INSERT INTO notifications (id, clinic_id, patient_id, type, subject, body)
               VALUES ($1, $2, $3, 'staff_escalation', $4, $5)""",
            notif_id, clinic_id, patient_id,
            "Staff Escalation",
            f"Patient requires staff attention. Reason: {reason}",
        )

        await log_audit(
            clinic_id=clinic_id,
            user_type="patient",
            user_id=patient_id,
            action="escalate_to_staff",
            resource="chat",
            details={"reason": reason},
        )

        return {
            "success": True,
            "message": "Your concern has been escalated to our staff. Someone will contact you soon.",
        }
    except Exception as exc:
        return {"error": str(exc)}
