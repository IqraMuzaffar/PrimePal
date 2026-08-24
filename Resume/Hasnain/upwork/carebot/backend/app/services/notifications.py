"""CareBot notification service — 8 templates, auto-triggered on appointments and labs."""
import re
import uuid
from datetime import datetime, timezone
from app.database import execute

TEMPLATES = {
    "appointment_confirmation": {
        "subject": "Appointment Confirmed",
        "body": "Your appointment with {doctor} on {date} at {time} is confirmed.",
    },
    "appointment_reminder_24h": {
        "subject": "Appointment Tomorrow",
        "body": "Reminder: You have an appointment with {doctor} tomorrow at {time}.",
    },
    "appointment_reminder_2h": {
        "subject": "Appointment in 2 Hours",
        "body": "Your appointment with {doctor} is in 2 hours at {time}.",
    },
    "appointment_cancelled": {
        "subject": "Appointment Cancelled",
        "body": "Your appointment on {date} has been cancelled.",
    },
    "lab_results_ready": {
        "subject": "Lab Results Ready",
        "body": "Your lab results for {test_panel} are ready. View them in your patient portal.",
    },
    "critical_lab_alert": {
        "subject": "URGENT: Critical Lab Value",
        "body": "Critical lab value detected for patient {patient_name}. Please review immediately.",
    },
    "follow_up_reminder": {
        "subject": "Follow-Up Reminder",
        "body": "Dr. {doctor} recommended a follow-up visit. Please book an appointment.",
    },
    "prescription_refill": {
        "subject": "Prescription Refill Request",
        "body": "Patient {patient_name} has requested a refill for {drug_name}.",
    },
}


def _extract_placeholders(template: str) -> list[str]:
    """Extract {placeholder} names from a template string."""
    return re.findall(r'\{(\w+)\}', template)


async def create_notification(
    clinic_id: str,
    patient_id: str,
    notification_type: str,
    channel: str = "in_app",
    template_vars: dict | None = None,
    scheduled_for: datetime | None = None,
) -> str:
    """Create a notification using a template. Returns notification ID."""
    template = TEMPLATES.get(notification_type)
    if not template:
        raise ValueError(f"Unknown notification type: {notification_type}")

    vars_ = template_vars or {}
    subject = template["subject"]
    # Fill known placeholders, default missing ones to empty string
    body = template["body"].format_map(
        {**{k: "" for k in _extract_placeholders(template["body"])}, **vars_}
    )

    notification_id = str(uuid.uuid4())
    status = "pending" if scheduled_for else "sent"
    sent_at = None if scheduled_for else datetime.now(timezone.utc).isoformat()

    await execute(
        """INSERT INTO notifications (id, clinic_id, patient_id, type, channel, subject, body, status, scheduled_for, sent_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)""",
        notification_id, clinic_id, patient_id, notification_type, channel,
        subject, body, status, scheduled_for, sent_at,
    )
    return notification_id


# ---------------------------------------------------------------------------
# Convenience functions for common notifications
# ---------------------------------------------------------------------------

async def notify_appointment_confirmed(
    clinic_id: str, patient_id: str, doctor: str, date: str, time: str
) -> str:
    return await create_notification(
        clinic_id, patient_id, "appointment_confirmation",
        template_vars={"doctor": doctor, "date": date, "time": time},
    )


async def notify_appointment_reminder_24h(
    clinic_id: str, patient_id: str, doctor: str, time: str, scheduled_for: datetime
) -> str:
    return await create_notification(
        clinic_id, patient_id, "appointment_reminder_24h",
        template_vars={"doctor": doctor, "time": time},
        scheduled_for=scheduled_for,
    )


async def notify_appointment_reminder_2h(
    clinic_id: str, patient_id: str, doctor: str, time: str, scheduled_for: datetime
) -> str:
    return await create_notification(
        clinic_id, patient_id, "appointment_reminder_2h",
        template_vars={"doctor": doctor, "time": time},
        scheduled_for=scheduled_for,
    )


async def notify_appointment_cancelled(
    clinic_id: str, patient_id: str, date: str
) -> str:
    return await create_notification(
        clinic_id, patient_id, "appointment_cancelled",
        template_vars={"date": date},
    )


async def notify_lab_results_ready(
    clinic_id: str, patient_id: str, test_panel: str
) -> str:
    return await create_notification(
        clinic_id, patient_id, "lab_results_ready",
        template_vars={"test_panel": test_panel},
    )


async def notify_critical_lab(
    clinic_id: str, patient_id: str, patient_name: str
) -> str:
    return await create_notification(
        clinic_id, patient_id, "critical_lab_alert",
        template_vars={"patient_name": patient_name},
    )


async def notify_follow_up(
    clinic_id: str, patient_id: str, doctor: str, scheduled_for: datetime
) -> str:
    return await create_notification(
        clinic_id, patient_id, "follow_up_reminder",
        template_vars={"doctor": doctor},
        scheduled_for=scheduled_for,
    )


async def notify_prescription_refill(
    clinic_id: str, patient_id: str, patient_name: str, drug_name: str
) -> str:
    return await create_notification(
        clinic_id, patient_id, "prescription_refill",
        template_vars={"patient_name": patient_name, "drug_name": drug_name},
    )
