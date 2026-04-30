from fastapi import APIRouter

from app.api.v1.endpoints import achievements, admin, announcements, auth, chat, classroom, curriculum, evaluations, evaluator, interactions, missions, rewards, speaking, spelling_bee, story_time, topics

api_router = APIRouter()

api_router.include_router(achievements.router, prefix="/achievements", tags=["achievements"])
api_router.include_router(admin.router)
api_router.include_router(announcements.router, prefix="/announcements", tags=["announcements"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(classroom.router, prefix="/classroom", tags=["classroom"])
api_router.include_router(curriculum.router, prefix="/curriculum", tags=["curriculum"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
api_router.include_router(topics.router, prefix="/topics", tags=["topics"])
api_router.include_router(evaluations.router, prefix="/evaluations", tags=["evaluations"])
api_router.include_router(evaluator.router, prefix="/evaluator", tags=["evaluator"])
api_router.include_router(missions.router, prefix="/missions", tags=["missions"])
api_router.include_router(rewards.router, prefix="/rewards", tags=["rewards"])
api_router.include_router(interactions.router, prefix="/interactions", tags=["interactions"])
api_router.include_router(spelling_bee.router, prefix="/spelling-bee", tags=["spelling-bee"])
api_router.include_router(story_time.router, prefix="/story-time", tags=["story-time"])
api_router.include_router(speaking.router, prefix="/speaking", tags=["speaking"])
