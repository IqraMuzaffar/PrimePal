from fastapi import APIRouter, Depends, HTTPException, Request, Query
from fastapi.responses import Response
from app.auth import get_current_staff
from app.database import query, query_one, execute
from app.models.schemas import LabOrderCreate, LabOrderUpdate
from app.services.audit import log_audit
from app.services.reports import generate_lab_report
import uuid
import json
from typing import Optional

router = APIRouter(
    prefix="/api/admin/labs",
    tags=["admin-labs"],
    dependencies=[Depends(get_current_staff)],
)


# ---------------------------------------------------------------------------
# GET /api/admin/labs
# ---------------------------------------------------------------------------

@router.get("")
async def list_lab_orders(
    status: Optional[str] = Query(None),
    patient_id: Optional[str] = Query(None),
    user: dict = Depends(get_current_staff),
):
    """Return lab orders with aggregated results, patient name, doctor name."""
    conditions = ["lo.clinic_id = $1"]
    values: list = [user["clinic_id"]]
    idx = 2

    if status:
        conditions.append(f"lo.status = ${idx}")
        values.append(status)
        idx += 1

    if patient_id:
        conditions.append(f"lo.patient_id = ${idx}")
        values.append(patient_id)
        idx += 1

    where = " AND ".join(conditions)

    rows = await query(
        f"""
        SELECT lo.*,
               p.name  AS patient_name,
               d.name  AS doctor_name,
               json_agg(
                 json_build_object(
                   'id',              lr.id,
                   'test_name',       lr.test_name,
                   'value',           lr.value,
                   'unit',            lr.unit,
                   'reference_range', lr.reference_range,
                   'status',          lr.status
                 )
               ) FILTER (WHERE lr.id IS NOT NULL) AS results
        FROM lab_orders lo
        JOIN patients p ON lo.patient_id = p.id
        JOIN doctors  d ON lo.doctor_id  = d.id
        LEFT JOIN lab_results lr ON lr.lab_order_id = lo.id
        WHERE {where}
        GROUP BY lo.id, p.name, d.name
        ORDER BY lo.ordered_at DESC
        """,
        *values,
    )

    import json
    for row in rows:
        if isinstance(row.get("results"), str):
            row["results"] = json.loads(row["results"])

    return rows


# ---------------------------------------------------------------------------
# POST /api/admin/labs
# ---------------------------------------------------------------------------

@router.post("", status_code=201)
async def create_lab_order(
    request: Request,
    body: LabOrderCreate,
    user: dict = Depends(get_current_staff),
):
    """Create a new lab order with status='ordered'."""
    lab_order_id = str(uuid.uuid4())

    await execute(
        """
        INSERT INTO lab_orders
            (id, clinic_id, patient_id, doctor_id, test_panel, priority, appointment_id, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'ordered')
        """,
        lab_order_id,
        user["clinic_id"],
        body.patient_id,
        body.doctor_id,
        body.test_panel,
        body.priority,
        body.appointment_id,
    )

    ip = request.client.host if request.client else None
    await log_audit(
        clinic_id=user["clinic_id"],
        user_type="staff",
        user_id=user["sub"],
        action="lab_order_created",
        resource="lab_orders",
        resource_id=lab_order_id,
        details={
            "patient_id": body.patient_id,
            "doctor_id": body.doctor_id,
            "test_panel": body.test_panel,
            "priority": body.priority,
        },
        ip_address=ip,
    )

    return await query_one("SELECT * FROM lab_orders WHERE id = $1", lab_order_id)


# ---------------------------------------------------------------------------
# PATCH /api/admin/labs/{lab_order_id}
# ---------------------------------------------------------------------------

@router.patch("/{lab_order_id}")
async def update_lab_order(
    lab_order_id: str,
    request: Request,
    body: LabOrderUpdate,
    user: dict = Depends(get_current_staff),
):
    """Update a lab order status and/or insert result entries."""
    import json
    from datetime import datetime, timezone

    order = await query_one(
        "SELECT * FROM lab_orders WHERE id = $1 AND clinic_id = $2",
        lab_order_id,
        user["clinic_id"],
    )
    if not order:
        raise HTTPException(status_code=404, detail="Lab order not found")

    # Insert result rows if provided
    has_critical = False
    if body.results:
        for entry in body.results:
            await execute(
                """
                INSERT INTO lab_results
                    (id, clinic_id, lab_order_id, test_name, value, unit, reference_range, status)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                """,
                str(uuid.uuid4()),
                user["clinic_id"],
                lab_order_id,
                entry.test_name,
                entry.value,
                entry.unit,
                entry.reference_range,
                entry.status,
            )
            if entry.status == "critical":
                has_critical = True

    # Update status on the order
    if body.status:
        if body.status == "completed":
            await execute(
                """
                UPDATE lab_orders
                SET status = 'completed', completed_at = $1
                WHERE id = $2
                """,
                datetime.now(timezone.utc),
                lab_order_id,
            )

            # Notify patient: results ready
            await execute(
                """
                INSERT INTO notifications
                    (id, clinic_id, patient_id, type, subject, body)
                VALUES ($1, $2, $3, 'lab_results_ready',
                        'Lab Results Ready', 'Your lab results are now available.')
                """,
                str(uuid.uuid4()),
                user["clinic_id"],
                order["patient_id"],
            )

            # Critical alert if any result flagged critical
            if has_critical:
                await execute(
                    """
                    INSERT INTO notifications
                        (id, clinic_id, patient_id, type, subject, body)
                    VALUES ($1, $2, $3, 'critical_lab_alert',
                            'Critical Lab Result', 'One or more of your lab results require immediate attention.')
                    """,
                    str(uuid.uuid4()),
                    user["clinic_id"],
                    order["patient_id"],
                )
        else:
            await execute(
                "UPDATE lab_orders SET status = $1 WHERE id = $2",
                body.status,
                lab_order_id,
            )

    ip = request.client.host if request.client else None
    await log_audit(
        clinic_id=user["clinic_id"],
        user_type="staff",
        user_id=user["sub"],
        action="lab_order_updated",
        resource="lab_orders",
        resource_id=lab_order_id,
        details={"new_status": body.status, "results_count": len(body.results) if body.results else 0},
        ip_address=ip,
    )

    return await query_one("SELECT * FROM lab_orders WHERE id = $1", lab_order_id)


# ---------------------------------------------------------------------------
# GET /api/admin/labs/{lab_order_id}/report
# ---------------------------------------------------------------------------

@router.get("/{lab_order_id}/report")
async def get_lab_report_admin(lab_order_id: str, user: dict = Depends(get_current_staff)):
    """Download an HTML lab report for the given lab order (admin/staff-scoped)."""
    # Fetch lab order (must belong to this clinic)
    lab_order = await query_one(
        """
        SELECT lo.*, d.name AS doctor_name
        FROM lab_orders lo
        JOIN doctors d ON lo.doctor_id = d.id
        WHERE lo.id = $1 AND lo.clinic_id = $2
        """,
        lab_order_id,
        user["clinic_id"],
    )
    if not lab_order:
        raise HTTPException(status_code=404, detail="Lab order not found")

    # Fetch results
    results = await query(
        "SELECT * FROM lab_results WHERE lab_order_id = $1 ORDER BY created_at",
        lab_order_id,
    )

    # Fetch patient
    patient = await query_one(
        "SELECT * FROM patients WHERE id = $1",
        lab_order["patient_id"],
    )
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
