from fastapi import APIRouter

from app.api.analysis import router as analysis_router
from app.api.datasets import router as datasets_router
from app.api.feedback import router as feedback_router
from app.api.incidents import router as incidents_router
from app.api.system import router as system_router

api_router = APIRouter(prefix="/api")

api_router.include_router(datasets_router)
api_router.include_router(incidents_router)
api_router.include_router(analysis_router)
api_router.include_router(feedback_router)
api_router.include_router(system_router)
