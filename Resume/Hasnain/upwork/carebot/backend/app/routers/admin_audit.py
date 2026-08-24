from fastapi import APIRouter, Depends, Query
from app.auth import get_current_staff
from app.database import query, query_one
from typing import Optional

router = APIRouter(
    prefix="/api/admin/audit",
    tags=["admin-audit"],
    dependencies=[Depends(get_current_staff)],
)


# ---------------------------------------------------------------------------
# GET /api/admin/audit
# ---------------------------------------------------------------------------

@router.get("")
async def list_audit_logs(
    action: Optional[str] = Query(None, description="Filter by action name"),
    user_type: Optional[str] = Query(None, description="Filter by user type (patient|staff|doctor|system)"),
    resource: Optional[str] = Query(None, description="Filter by resource name"),
    date_from: Optional[str] = Query(None, description="ISO date string, inclusive lower bound"),
    date_to: Optional[str] = Query(None, description="ISO date string, inclusive upper bound"),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    user: dict = Depends(get_current_staff),
):
    """
    Return paginated audit logs for this clinic ordered by created_at DESC.

    Supports filtering by action, user_type, resource, and a date range.
    Response includes total count for pagination.
    """
    conditions = ["clinic_id = $1"]
    values: list = [user["clinic_id"]]
    idx = 2

    if action:
        conditions.append(f"action = ${idx}")
        values.append(action)
        idx += 1

    if user_type:
        conditions.append(f"user_type = ${idx}")
        values.append(user_type)
        idx += 1

    if resource:
        conditions.append(f"resource = ${idx}")
        values.append(resource)
        idx += 1

    if date_from:
        conditions.append(f"created_at >= ${idx}::timestamptz")
        values.append(date_from)
        idx += 1

    if date_to:
        conditions.append(f"created_at <= ${idx}::timestamptz")
        values.append(date_to)
        idx += 1

    where = " AND ".join(conditions)

    # Total count (for pagination metadata)
    count_row = await query_one(
        f"SELECT COUNT(*) AS total FROM audit_logs WHERE {where}",
        *values,
    )
    total = count_row["total"] if count_row else 0

    # Paged data
    values.append(limit)
    values.append(offset)
    rows = await query(
        f"""
        SELECT id, user_type, user_id, action, resource, resource_id,
               details, ip_address, created_at
        FROM audit_logs
        WHERE {where}
        ORDER BY created_at DESC
        LIMIT ${idx} OFFSET ${idx + 1}
        """,
        *values,
    )

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "data": rows,
    }
