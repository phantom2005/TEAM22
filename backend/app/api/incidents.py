from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models import Incident
from app.schemas import IncidentListOut, IncidentOut

router = APIRouter(prefix="/incidents", tags=["Incidents"])


@router.get("", response_model=IncidentListOut)
async def list_incidents(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    dataset_id: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    """Paginated list of historical incidents, optionally filtered by dataset."""
    query = select(Incident).order_by(Incident.created_at.desc())
    count_query = select(func.count()).select_from(Incident)

    if dataset_id:
        query = query.where(Incident.dataset_id == dataset_id)
        count_query = count_query.where(Incident.dataset_id == dataset_id)

    total = (await db.execute(count_query)).scalar_one()
    items = (await db.execute(query.offset(skip).limit(limit))).scalars().all()

    return IncidentListOut(total=total, items=list(items))


@router.get("/{incident_id}", response_model=IncidentOut)
async def get_incident(incident_id: str, db: AsyncSession = Depends(get_db)):
    """Fetch a single historical incident by ID."""
    incident = await db.get(Incident, incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail=f"Incident '{incident_id}' not found.")
    return incident
