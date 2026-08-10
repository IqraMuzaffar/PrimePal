import json
import uuid
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.triage_engine import process_message
from app.db.queries import get_or_create_patient, create_session

router = APIRouter()

@router.websocket("/ws/chat")
async def chat_websocket(websocket: WebSocket):
    await websocket.accept()
    session_id = None
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            if session_id is None:
                phone = msg.get("phone", f"web-{uuid.uuid4().hex[:8]}")
                name = msg.get("name", None)
                patient = await get_or_create_patient(phone, name)
                session = await create_session(patient["id"], "web")
                session_id = str(session["id"])
            patient_message = msg.get("message", "")
            if not patient_message:
                continue
            ai_response = await process_message(session_id, patient_message)
            await websocket.send_text(json.dumps({
                "type": "message", "content": ai_response, "session_id": session_id,
            }))
    except WebSocketDisconnect:
        pass
