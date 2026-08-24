from fastapi import APIRouter, Depends
from app.auth import get_current_staff
from app.database import query, query_one

router = APIRouter(
    prefix="/api/admin",
    tags=["admin"],
    dependencies=[Depends(get_current_staff)],
)


@router.get("/dashboard/stats")
async def dashboard_stats(user: dict = Depends(get_current_staff)):
    """Return comprehensive clinic stats for the admin dashboard."""
    clinic_id = user["clinic_id"]

    # --- Appointment counts ---
    appts_today = await query_one(
        """
        SELECT COUNT(*) AS count FROM appointments
        WHERE clinic_id = $1 AND date = CURRENT_DATE
        """,
        clinic_id,
    )

    appts_week = await query_one(
        """
        SELECT COUNT(*) AS count FROM appointments
        WHERE clinic_id = $1
          AND date >= date_trunc('week', CURRENT_DATE)
          AND date <  date_trunc('week', CURRENT_DATE) + INTERVAL '7 days'
        """,
        clinic_id,
    )

    appts_month = await query_one(
        """
        SELECT COUNT(*) AS count FROM appointments
        WHERE clinic_id = $1
          AND date_trunc('month', date) = date_trunc('month', CURRENT_DATE)
        """,
        clinic_id,
    )

    # --- Revenue ---
    revenue_today = await query_one(
        """
        SELECT COALESCE(SUM(d.consultation_fee), 0) AS total
        FROM appointments a
        JOIN doctors d ON a.doctor_id = d.id
        WHERE a.clinic_id = $1
          AND a.date = CURRENT_DATE
          AND a.status = 'completed'
        """,
        clinic_id,
    )

    revenue_month = await query_one(
        """
        SELECT COALESCE(SUM(d.consultation_fee), 0) AS total
        FROM appointments a
        JOIN doctors d ON a.doctor_id = d.id
        WHERE a.clinic_id = $1
          AND date_trunc('month', a.date) = date_trunc('month', CURRENT_DATE)
          AND a.status = 'completed'
        """,
        clinic_id,
    )

    # --- No-show & cancellation rates (current month) ---
    month_totals = await query_one(
        """
        SELECT
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE status = 'no_show') AS no_show_count,
            COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled_count
        FROM appointments
        WHERE clinic_id = $1
          AND date_trunc('month', date) = date_trunc('month', CURRENT_DATE)
        """,
        clinic_id,
    )
    total = month_totals["total"] or 1  # avoid division by zero
    no_show_rate = round((month_totals["no_show_count"] / total) * 100, 2)
    cancellation_rate = round((month_totals["cancelled_count"] / total) * 100, 2)

    # --- New patients this month ---
    new_patients = await query_one(
        """
        SELECT COUNT(*) AS count FROM patients
        WHERE clinic_id = $1
          AND date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE)
        """,
        clinic_id,
    )

    # --- Chat sessions today ---
    chat_today = await query_one(
        """
        SELECT COUNT(*) AS count FROM chat_sessions
        WHERE clinic_id = $1
          AND started_at::date = CURRENT_DATE
        """,
        clinic_id,
    )

    # --- Department breakdown (appointments this month) ---
    dept_breakdown = await query(
        """
        SELECT dep.name AS department, COUNT(a.id) AS count
        FROM appointments a
        JOIN doctors d ON a.doctor_id = d.id
        LEFT JOIN departments dep ON d.department_id = dep.id
        WHERE a.clinic_id = $1
          AND date_trunc('month', a.date) = date_trunc('month', CURRENT_DATE)
        GROUP BY dep.name
        ORDER BY count DESC
        """,
        clinic_id,
    )

    # --- Doctor utilisation (today) ---
    # total_possible_slots = (slots_end - slots_start) / slot_duration_min
    doctor_util = await query(
        """
        SELECT
            d.name AS doctor_name,
            COUNT(a.id) AS appointments_today,
            FLOOR(
                EXTRACT(EPOCH FROM (d.slots_end - d.slots_start)) / 60
                / NULLIF(d.slot_duration_min, 0)
            ) AS total_possible_slots
        FROM doctors d
        LEFT JOIN appointments a
               ON a.doctor_id = d.id
              AND a.date = CURRENT_DATE
              AND a.status NOT IN ('cancelled', 'no_show')
        WHERE d.clinic_id = $1 AND d.is_active = true
        GROUP BY d.id, d.name, d.slots_start, d.slots_end, d.slot_duration_min
        ORDER BY d.name
        """,
        clinic_id,
    )

    return {
        "appointments_today": appts_today["count"],
        "appointments_this_week": appts_week["count"],
        "appointments_this_month": appts_month["count"],
        "revenue_today": float(revenue_today["total"]),
        "revenue_this_month": float(revenue_month["total"]),
        "no_show_rate": no_show_rate,
        "cancellation_rate": cancellation_rate,
        "new_patients_this_month": new_patients["count"],
        "chat_sessions_today": chat_today["count"],
        "department_breakdown": dept_breakdown,
        "doctor_utilization": doctor_util,
    }
