from fastapi import APIRouter, Request, HTTPException
from app.services.twilio_client import validate_request, send_whatsapp
from app.services.triage_engine import process_message
from app.db.queries import get_or_create_patient, create_session
from app.services.session_manager import redis_client

router = APIRouter(tags=["webhook"])

async def _get_active_session(phone: str) -> str | None:
    return await redis_client.get(f"triage:phone:{phone}")

async def _set_active_session(phone: str, session_id: str):
    await redis_client.set(f"triage:phone:{phone}", str(session_id), ex=3600)

@router.post("/webhook/whatsapp")
async def whatsapp_webhook(request: Request):
    form = await request.form()
    form_dict = dict(form)
    signature = request.headers.get("X-Twilio-Signature", "")
    url = str(request.url)
    if not validate_request(url, form_dict, signature):
        raise HTTPException(status_code=403, detail="Invalid Twilio signature")
    patient_phone = form_dict.get("From", "").replace("whatsapp:", "")
    patient_message = form_dict.get("Body", "").strip()
    if not patient_message:
        return {"status": "empty message"}
    patient = await get_or_create_patient(patient_phone)
    session_id = await _get_active_session(patient_phone)
    if session_id is None:
        session = await create_session(patient["id"], "whatsapp")
        session_id = str(session["id"])
        await _set_active_session(patient_phone, session_id)
    ai_response = await process_message(session_id, patient_message)
    await send_whatsapp(patient_phone, ai_response)
    return {"status": "ok"}
