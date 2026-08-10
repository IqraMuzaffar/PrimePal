import json
from app.db.pool import query, query_one, execute

async def get_or_create_patient(phone: str, name: str | None = None) -> dict:
    patient = await query_one("SELECT * FROM patients WHERE phone = $1", phone)
    if patient:
        return patient
    return await query_one(
        "INSERT INTO patients (phone, name) VALUES ($1, $2) RETURNING *", phone, name
    )

async def create_session(patient_id, channel: str) -> dict:
    return await query_one(
        "INSERT INTO triage_sessions (patient_id, channel) VALUES ($1, $2) RETURNING *",
        patient_id, channel
    )

async def update_session_triage(session_id, severity: str, department: str, ai_summary: str):
    await execute(
        """UPDATE triage_sessions
           SET severity = $2, department = $3, ai_summary = $4, status = 'awaiting_review'
           WHERE id = $1""",
        session_id, severity, department, ai_summary
    )

async def update_session_emergency(session_id):
    await execute(
        "UPDATE triage_sessions SET status = 'emergency', severity = 'red' WHERE id = $1",
        session_id
    )

async def review_session(session_id, action: str, reviewed_by: str,
                         department: str | None = None, notes: str | None = None):
    if action == "confirm":
        status = "confirmed"
    elif action == "reject":
        status = "rejected"
    elif action == "reassign":
        status = "confirmed"
    else:
        raise ValueError(f"Invalid action: {action}")
    await execute(
        """UPDATE triage_sessions
           SET status = $2, reviewed_by = $3, reviewed_at = NOW(),
               department = COALESCE($4, department), receptionist_notes = $5
           WHERE id = $1""",
        session_id, status, reviewed_by, department, notes
    )

async def save_message(session_id, role: str, content: str) -> dict:
    return await query_one(
        "INSERT INTO messages (session_id, role, content) VALUES ($1, $2, $3) RETURNING *",
        session_id, role, content
    )

async def get_session_messages(session_id) -> list[dict]:
    return await query(
        "SELECT * FROM messages WHERE session_id = $1 ORDER BY timestamp ASC", session_id
    )

async def get_queue(status: str = "awaiting_review") -> list[dict]:
    return await query(
        """SELECT ts.*, p.phone as patient_phone, p.name as patient_name
           FROM triage_sessions ts
           JOIN patients p ON ts.patient_id = p.id
           WHERE ts.status = $1
           ORDER BY
               CASE ts.severity WHEN 'red' THEN 1 WHEN 'yellow' THEN 2 WHEN 'green' THEN 3 END,
               ts.created_at ASC""",
        status
    )

async def get_emergency_queue() -> list[dict]:
    return await query(
        """SELECT ts.*, p.phone as patient_phone, p.name as patient_name
           FROM triage_sessions ts
           JOIN patients p ON ts.patient_id = p.id
           WHERE ts.status = 'emergency'
           ORDER BY ts.created_at ASC"""
    )

async def log_audit(session_id, action: str, tool_used: str | None,
                    input_data: dict | None, output_data: dict | None):
    await execute(
        """INSERT INTO audit_log (session_id, action, tool_used, input, output)
           VALUES ($1, $2, $3, $4::jsonb, $5::jsonb)""",
        session_id, action, tool_used,
        json.dumps(input_data) if input_data else None,
        json.dumps(output_data) if output_data else None
    )

async def count_session_messages(session_id) -> int:
    row = await query_one(
        "SELECT COUNT(*) as cnt FROM messages WHERE session_id = $1 AND role = 'patient'",
        session_id
    )
    return row["cnt"] if row else 0

async def get_departments() -> list[dict]:
    return await query("SELECT * FROM departments ORDER BY name")
