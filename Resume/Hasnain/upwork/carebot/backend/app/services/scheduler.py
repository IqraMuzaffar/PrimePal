from datetime import datetime, timedelta
from app.database import query_one, query


async def get_available_slots(doctor_id: str, date_str: str) -> list[str]:
    """Generate available time slots for a doctor on a given date."""
    # 1. Get doctor info
    doctor = await query_one(
        "SELECT available_days, slot_duration_min, slots_start, slots_end FROM doctors WHERE id = $1 AND is_active = true",
        doctor_id,
    )
    if not doctor:
        return []

    # 2. Check if doctor works on this day
    target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    day_name = target_date.strftime("%A")  # e.g., "Monday"
    if doctor["available_days"] and day_name not in doctor["available_days"]:
        return []

    # 3. Generate all possible slots
    start = doctor["slots_start"]  # time object
    end = doctor["slots_end"]
    duration = doctor["slot_duration_min"] or 30

    all_slots = []
    current = datetime.combine(target_date, start)
    end_dt = datetime.combine(target_date, end)
    while current + timedelta(minutes=duration) <= end_dt:
        all_slots.append(current.strftime("%H:%M"))
        current += timedelta(minutes=duration)

    # 4. Get booked slots for this doctor on this date
    booked = await query(
        """SELECT time_slot::text as time_slot FROM appointments
           WHERE doctor_id = $1 AND date = $2 AND status NOT IN ('cancelled')""",
        doctor_id,
        target_date,
    )
    booked_times = {r["time_slot"][:5] for r in booked}  # "HH:MM"

    # 5. Subtract booked from all
    return [s for s in all_slots if s not in booked_times]
