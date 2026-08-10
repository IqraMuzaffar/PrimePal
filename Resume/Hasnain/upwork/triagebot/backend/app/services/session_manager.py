import json
import redis.asyncio as aioredis
from app.config import settings

redis_client: aioredis.Redis | None = None
SESSION_TTL = 3600

async def init_redis():
    global redis_client
    redis_client = aioredis.from_url(settings.redis_url, decode_responses=True)

async def close_redis():
    global redis_client
    if redis_client:
        await redis_client.close()

def _key(session_id: str) -> str:
    return f"triage:session:{session_id}"

async def get_session_state(session_id: str) -> dict | None:
    data = await redis_client.get(_key(session_id))
    return json.loads(data) if data else None

async def set_session_state(session_id: str, state: dict):
    await redis_client.set(_key(session_id), json.dumps(state), ex=SESSION_TTL)

async def delete_session_state(session_id: str):
    await redis_client.delete(_key(session_id))

async def get_or_create_session_state(session_id: str) -> dict:
    state = await get_session_state(session_id)
    if state is None:
        state = {
            "session_id": session_id,
            "turn_count": 0,
            "symptoms": None,
            "severity": None,
            "department": None,
            "status": "in_progress",
            "conversation_history": [],
        }
        await set_session_state(session_id, state)
    return state

async def increment_turn(session_id: str) -> int:
    state = await get_or_create_session_state(session_id)
    state["turn_count"] += 1
    await set_session_state(session_id, state)
    return state["turn_count"]

async def add_to_history(session_id: str, role: str, content: str):
    state = await get_or_create_session_state(session_id)
    state["conversation_history"].append({"role": role, "content": content})
    state["conversation_history"] = state["conversation_history"][-20:]
    await set_session_state(session_id, state)
