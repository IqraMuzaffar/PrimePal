from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from app.routes.auth import get_current_user
from app.db.queries import get_queue, get_emergency_queue, review_session, get_session_messages, get_departments
from app.db.pool import query, query_one
from app.models.schemas import DashboardAction
from app.services.twilio_client import send_whatsapp

router = APIRouter(tags=["dashboard"])

@router.get("/dashboard/queue")
async def get_triage_queue(user: str = Depends(get_current_user)):
    awaiting = await get_queue("awaiting_review")
    emergency = await get_emergency_queue()
    return {"emergency": emergency, "queue": awaiting}

@router.get("/dashboard/session/{session_id}")
async def get_session_detail(session_id: UUID, user: str = Depends(get_current_user)):
    session = await query_one(
        """SELECT ts.*, p.phone as patient_phone, p.name as patient_name
           FROM triage_sessions ts JOIN patients p ON ts.patient_id = p.id WHERE ts.id = $1""",
        session_id,
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    messages = await get_session_messages(session_id)
    return {"session": session, "messages": messages}

@router.post("/dashboard/session/{session_id}/action")
async def take_action(session_id: UUID, body: DashboardAction, user: str = Depends(get_current_user)):
    session = await query_one(
        """SELECT ts.*, p.phone as patient_phone
           FROM triage_sessions ts JOIN patients p ON ts.patient_id = p.id WHERE ts.id = $1""",
        session_id,
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    await review_session(session_id, body.action, body.reviewed_by, department=body.department, notes=body.reason)
    phone = session.get("patient_phone")
    if phone and session.get("channel") == "whatsapp":
        if body.action == "confirm":
            dept = body.department or session.get("department", "General Practice")
            msg = f"Your appointment has been confirmed with {dept}. Please visit the clinic at your earliest convenience."
        elif body.action == "reject":
            msg = f"We recommend you visit our clinic in person. Reason: {body.reason or 'Further evaluation needed.'}"
        elif body.action == "reassign":
            msg = f"Your appointment has been confirmed with {body.department}. Please visit the clinic at your earliest convenience."
        else:
            msg = "Thank you. Our team will follow up with you shortly."
        try:
            await send_whatsapp(phone, msg)
        except Exception:
            pass
    return {"status": "ok", "action": body.action}

@router.get("/dashboard/departments")
async def list_departments(user: str = Depends(get_current_user)):
    return await get_departments()

@router.get("/dashboard/history")
async def get_history(status: str = "confirmed", limit: int = 50, user: str = Depends(get_current_user)):
    return await query(
        """SELECT ts.*, p.phone as patient_phone, p.name as patient_name
           FROM triage_sessions ts JOIN patients p ON ts.patient_id = p.id
           WHERE ts.status = $1 ORDER BY ts.reviewed_at DESC LIMIT $2""",
        status, limit,
    )
