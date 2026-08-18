from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models import Analysis, Feedback
from app.schemas import FeedbackOut, FeedbackRequest

router = APIRouter(prefix="/feedback", tags=["Feedback"])


@router.post("", response_model=FeedbackOut, status_code=201)
async def submit_feedback(payload: FeedbackRequest, db: AsyncSession = Depends(get_db)):
    """Submit accuracy feedback for a completed analysis."""
    analysis = await db.get(Analysis, payload.analysis_id)
    if not analysis:
        raise HTTPException(status_code=404, detail=f"Analysis '{payload.analysis_id}' not found.")

    feedback = Feedback(
        analysis_id=payload.analysis_id,
        was_accurate=payload.was_accurate,
        rating=payload.rating,
        comment=payload.comment,
    )
    db.add(feedback)
    await db.flush()
    return feedback
