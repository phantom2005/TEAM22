"""
Analysis Routes
---------------
POST /api/analyze  — the main endpoint.

Request  → API layer
         → retrieval_service.retrieve()   (FAISS similarity search)
         → rca_service.generate_rca()     (LLM structured output)
         → persist Analysis to DB
         → return AnalyzeResponse
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.logging import get_logger
from app.models import Analysis
from app.schemas import AnalysisOut, AnalyzeRequest, AnalyzeResponse, SimilarIncident
from app.services import retrieval_service
from app.services.rca_service import generate_rca

logger = get_logger(__name__)
router = APIRouter(tags=["Analysis"])


@router.post("/analyze", response_model=AnalyzeResponse, status_code=201)
async def analyze_incident(payload: AnalyzeRequest, db: AsyncSession = Depends(get_db)):
    """
    Core RCA endpoint.

    1. Retrieve top-K similar historical incidents via FAISS.
    2. Generate structured RCA via LLM (or mock fallback).
    3. Persist and return the result.
    """
    logger.info("Analyze request received (len=%d chars).", len(payload.incident_description))

    # --- Step 1: RAG Retrieval ---
    retrieved = await retrieval_service.retrieve(payload.incident_description, db)

    # --- Step 2: RCA Generation ---
    rca = await generate_rca(payload.incident_description, retrieved)

    # --- Step 3: Build similar_incidents list ---
    similar = [
        SimilarIncident(
            id=r.incident.id,
            ticket_id=r.incident.ticket_id,
            title=r.incident.title,
            score=round(r.score, 4),
            root_cause=r.incident.root_cause,
            resolution=r.incident.resolution,
        )
        for r in retrieved
    ]

    # --- Step 4: Persist ---
    analysis = Analysis(
        incident_description=payload.incident_description,
        summary=rca.summary,
        root_cause=rca.root_cause,
        resolution=rca.resolution,
        confidence=rca.confidence,
        evidence=rca.evidence,
        similar_incidents=[s.model_dump() for s in similar],
        status="completed",
    )
    db.add(analysis)
    await db.flush()

    logger.info("Analysis completed: id=%s confidence=%.2f", analysis.id, rca.confidence)

    return AnalyzeResponse(
        id=analysis.id,
        summary=rca.summary,
        root_cause=rca.root_cause,
        resolution=rca.resolution,
        confidence=rca.confidence,
        evidence=rca.evidence,
        similar_incidents=similar,
        status="completed",
        created_at=analysis.created_at,
    )


@router.get("/analysis/{analysis_id}", response_model=AnalysisOut)
async def get_analysis(analysis_id: str, db: AsyncSession = Depends(get_db)):
    """Retrieve a previously computed analysis by ID."""
    analysis = await db.get(Analysis, analysis_id)
    if not analysis:
        raise HTTPException(status_code=404, detail=f"Analysis '{analysis_id}' not found.")

    similar = [SimilarIncident(**s) for s in (analysis.similar_incidents or [])]

    return AnalysisOut(
        id=analysis.id,
        incident_description=analysis.incident_description,
        summary=analysis.summary or "",
        root_cause=analysis.root_cause or "",
        resolution=analysis.resolution or "",
        confidence=analysis.confidence,
        evidence=analysis.evidence or [],
        similar_incidents=similar,
        status=analysis.status,
        created_at=analysis.created_at,
    )
