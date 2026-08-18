from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.schemas import AnalyticsOut, HealthOut
from app.services.analytics_service import get_analytics
from app.services.retrieval_service import index_status

router = APIRouter(tags=["System"])
settings = get_settings()


@router.get("/analytics", response_model=AnalyticsOut)
async def analytics(db: AsyncSession = Depends(get_db)):
    """Aggregated performance and usage metrics."""
    return await get_analytics(db)


@router.get("/health", response_model=HealthOut)
async def health(db: AsyncSession = Depends(get_db)):
    """Liveness + readiness probe."""
    db_status = "ok"
    try:
        await db.execute(__import__("sqlalchemy").text("SELECT 1"))
    except Exception:
        db_status = "error"

    idx = index_status()
    rag_status = f"ok ({idx['total_vectors']} vectors)" if idx["total_vectors"] > 0 else "empty"

    return HealthOut(
        status="ok",
        environment=settings.app_env,
        database=db_status,
        rag_index=rag_status,
    )
