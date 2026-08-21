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
from app.schemas import AnalysisListOut, AnalysisOut, AnalyzeRequest, AnalyzeResponse, SimilarIncident
from app.services import retrieval_service
from app.services.rca_service import generate_rca

logger = get_logger(__name__)
router = APIRouter(tags=["Analysis"])

_P1_KEYWORDS = {"outage", "down", "critical", "data loss", "breach", "production down", "p1"}
_P2_KEYWORDS = {"degraded", "slow", "timeout", "latency", "error", "502", "503", "504", "500", "p2"}


def _compute_severity(description: str, confidence: float) -> str:
    text = description.lower()
    if any(k in text for k in _P1_KEYWORDS) or confidence >= 0.85:
        return "P1"
    if any(k in text for k in _P2_KEYWORDS) or confidence >= 0.60:
        return "P2"
    return "P3"


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

    severity = _compute_severity(payload.incident_description, rca.confidence)

    # --- Step 4: Persist ---
    analysis = Analysis(
        incident_description=payload.incident_description,
        summary=rca.summary,
        root_cause=rca.root_cause,
        resolution=rca.resolution,
        confidence=rca.confidence,
        evidence=rca.evidence,
        similar_incidents=[s.model_dump() for s in similar],
        severity=severity,
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
        severity=severity,
        status="completed",
        created_at=analysis.created_at,
    )


@router.get("/analyses", response_model=AnalysisListOut)
async def list_analyses(
    skip: int = 0, limit: int = 20, db: AsyncSession = Depends(get_db)
):
    """List past analyses, newest first."""
    result = await db.execute(
        select(Analysis).order_by(Analysis.created_at.desc()).offset(skip).limit(limit)
    )
    items = result.scalars().all()
    count = await db.execute(select(Analysis))
    total = len(count.scalars().all())
    return AnalysisListOut(
        total=total,
        items=[
            AnalysisOut(
                id=a.id,
                incident_description=a.incident_description,
                summary=a.summary or "",
                root_cause=a.root_cause or "",
                resolution=a.resolution or "",
                confidence=a.confidence,
                evidence=a.evidence or [],
                similar_incidents=[SimilarIncident(**s) for s in (a.similar_incidents or [])],
                severity=a.severity or "P3",
                status=a.status,
                created_at=a.created_at,
            )
            for a in items
        ],
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
        severity=analysis.severity or "P3",
        status=analysis.status,
        created_at=analysis.created_at,
    )
