from fastapi import APIRouter, Depends
from app.auth import get_current_patient
from app.database import query, execute

router = APIRouter(
    prefix="/api/patient/notifications",
    tags=["patient-notifications"],
    dependencies=[Depends(get_current_patient)],
)


@router.get("")
async def get_notifications(user: dict = Depends(get_current_patient)):
    rows = await query(
        """SELECT id, type, channel, subject, body, status, sent_at, created_at
           FROM notifications
           WHERE patient_id = $1
           ORDER BY created_at DESC
           LIMIT 50""",
        user["sub"],
    )
    unread = sum(1 for r in rows if r["status"] == "sent")
    return {"notifications": rows, "unread_count": unread}


@router.patch("/{notification_id}/read")
async def mark_notification_read(
    notification_id: str, user: dict = Depends(get_current_patient)
):
    await execute(
        """UPDATE notifications SET status = 'read'
           WHERE id = $1 AND patient_id = $2 AND status = 'sent'""",
        notification_id, user["sub"],
    )
    return {"ok": True}


@router.patch("/read-all")
async def mark_all_read(user: dict = Depends(get_current_patient)):
    await execute(
        """UPDATE notifications SET status = 'read'
           WHERE patient_id = $1 AND status = 'sent'""",
        user["sub"],
    )
    return {"ok": True}
