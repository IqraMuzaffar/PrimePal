from app.database import execute
import uuid


async def log_audit(
    clinic_id: str,
    user_type: str,  # patient|doctor|staff|system
    user_id: str,
    action: str,
    resource: str | None = None,
    resource_id: str | None = None,
    details: dict | None = None,
    ip_address: str | None = None,
):
    """Insert an audit log entry."""
    import json
    await execute(
        """INSERT INTO audit_logs (id, clinic_id, user_type, user_id, action, resource, resource_id, details, ip_address)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)""",
        str(uuid.uuid4()), clinic_id, user_type, user_id, action,
        resource, resource_id,
        json.dumps(details) if details else None,
        ip_address
    )
