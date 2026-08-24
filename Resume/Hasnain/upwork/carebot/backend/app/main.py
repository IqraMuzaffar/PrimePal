from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import get_pool, close_pool
from app.routers.health import router as health_router
from app.routers.public import router as public_router
from app.routers.patient_auth import router as patient_auth_router
from app.routers.patient import router as patient_router
from app.routers.staff_auth import router as staff_auth_router
from app.routers.admin_dashboard import router as admin_dashboard_router
from app.routers.admin_appointments import router as admin_appointments_router
from app.routers.admin_patients import router as admin_patients_router
from app.routers.admin_labs import router as admin_labs_router
from app.routers.admin_prescriptions import router as admin_prescriptions_router
from app.routers.admin_doctors import router as admin_doctors_router
from app.routers.admin_faqs import router as admin_faqs_router
from app.routers.admin_audit import router as admin_audit_router
from app.routers.chat import router as chat_router
from app.routers.patient_notifications import router as patient_notifications_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize DB pool
    await get_pool()
    yield
    # Shutdown: close DB pool
    await close_pool()

app = FastAPI(
    title="CareBot API",
    description="AI-powered clinic management system",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(public_router)
app.include_router(patient_auth_router)
app.include_router(patient_router)
app.include_router(staff_auth_router)
app.include_router(admin_dashboard_router)
app.include_router(admin_appointments_router)
app.include_router(admin_patients_router)
app.include_router(admin_labs_router)
app.include_router(admin_prescriptions_router)
app.include_router(admin_doctors_router)
app.include_router(admin_faqs_router)
app.include_router(admin_audit_router)
app.include_router(chat_router)
app.include_router(patient_notifications_router)
