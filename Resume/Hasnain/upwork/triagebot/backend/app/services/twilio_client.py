import asyncio
from twilio.rest import Client
from twilio.request_validator import RequestValidator
from app.config import settings

twilio_client: Client | None = None
request_validator: RequestValidator | None = None

def init_twilio():
    global twilio_client, request_validator
    if settings.twilio_account_sid and settings.twilio_auth_token:
        twilio_client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
        request_validator = RequestValidator(settings.twilio_auth_token)

async def send_whatsapp(to_phone: str, body: str) -> str:
    if twilio_client is None:
        raise RuntimeError("Twilio not initialized")
    phone = f"whatsapp:{to_phone}" if not to_phone.startswith("whatsapp:") else to_phone
    message = await asyncio.to_thread(
        twilio_client.messages.create,
        body=body, from_=settings.twilio_whatsapp_number, to=phone,
    )
    return message.sid

def validate_request(url: str, params: dict, signature: str) -> bool:
    if settings.app_env == "development":
        return True
    if request_validator is None:
        return False
    return request_validator.validate(url, params, signature)
