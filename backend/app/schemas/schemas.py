from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, field_validator


# ---------------------------------------------------------------------------
# Shared
# ---------------------------------------------------------------------------
class OKResponse(BaseModel):
    ok: bool = True
    message: str = "success"


# ---------------------------------------------------------------------------
# Dataset schemas
# ---------------------------------------------------------------------------
class DatasetOut(BaseModel):
    id: str
    name: str
    description: str | None
    row_count: int
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Incident schemas
# ---------------------------------------------------------------------------
class IncidentOut(BaseModel):
    id: str
    dataset_id: str
    ticket_id: str | None
    title: str
    description: str
    root_cause: str | None
    resolution: str | None
    category: str | None
    severity: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class IncidentListOut(BaseModel):
    total: int
    items: list[IncidentOut]


# ---------------------------------------------------------------------------
# Analysis schemas
# ---------------------------------------------------------------------------
class SimilarIncident(BaseModel):
    id: str
    ticket_id: str | None
    title: str
    score: float = Field(..., ge=0.0, le=1.0)
    root_cause: str | None
    resolution: str | None


class AnalyzeRequest(BaseModel):
    incident_description: str = Field(..., min_length=10, max_length=5000)

    @field_validator("incident_description")
    @classmethod
    def strip_whitespace(cls, v: str) -> str:
        return v.strip()


class AnalyzeResponse(BaseModel):
    id: str
    summary: str
    root_cause: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    resolution: str
    evidence: list[str]
    similar_incidents: list[SimilarIncident]
    severity: str
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class AnalysisOut(AnalyzeResponse):
    incident_description: str


class AnalysisListOut(BaseModel):
    total: int
    items: list[AnalysisOut]


# ---------------------------------------------------------------------------
# Feedback schemas
# ---------------------------------------------------------------------------
class FeedbackRequest(BaseModel):
    analysis_id: str
    was_accurate: bool = True
    rating: int = Field(default=5, ge=1, le=5)
    comment: str | None = None


class FeedbackOut(BaseModel):
    id: str
    analysis_id: str
    was_accurate: bool
    rating: int
    comment: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Analytics schemas
# ---------------------------------------------------------------------------
class AnalyticsOut(BaseModel):
    total_analyses: int
    total_incidents: int
    total_datasets: int
    total_feedbacks: int
    avg_confidence: float
    avg_rating: float
    accuracy_rate: float          # % of feedbacks marked accurate
    retrieval_precision: float    # static benchmark placeholder
    search_latency_ms: float      # static benchmark placeholder


# ---------------------------------------------------------------------------
# Health schema
# ---------------------------------------------------------------------------
class HealthOut(BaseModel):
    status: str
    environment: str
    database: str
    rag_index: str
    version: str = "1.0.0"
