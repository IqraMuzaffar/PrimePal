from fastapi import APIRouter

from app.api.v1.endpoints import auth, classroom, curriculum, tutor, evaluator

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(classroom.router, prefix="/classroom", tags=["classroom"])
api_router.include_router(curriculum.router, prefix="/curriculum", tags=["curriculum"])
api_router.include_router(tutor.router, prefix="/tutor", tags=["tutor"])
api_router.include_router(evaluator.router, prefix="/evaluator", tags=["evaluator"])
