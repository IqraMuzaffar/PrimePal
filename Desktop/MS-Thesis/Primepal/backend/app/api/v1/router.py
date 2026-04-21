from fastapi import APIRouter

from app.api.v1.endpoints import auth, chat, classroom, curriculum, evaluator, interactions, missions, tutor

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(classroom.router, prefix="/classroom", tags=["classroom"])
api_router.include_router(curriculum.router, prefix="/curriculum", tags=["curriculum"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
api_router.include_router(tutor.router, prefix="/tutor", tags=["tutor"])
api_router.include_router(evaluator.router, prefix="/evaluator", tags=["evaluator"])
api_router.include_router(missions.router, prefix="/missions", tags=["missions"])
api_router.include_router(interactions.router, prefix="/interactions", tags=["interactions"])
