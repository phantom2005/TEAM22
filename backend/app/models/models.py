import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _uuid() -> str:
    return str(uuid.uuid4())


# ---------------------------------------------------------------------------
# Dataset
# ---------------------------------------------------------------------------
class Dataset(Base):
    __tablename__ = "datasets"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    file_path: Mapped[str] = mapped_column(String, nullable=False)
    row_count: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String, default="processing")  # processing | ready | failed
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    incidents: Mapped[list["Incident"]] = relationship(back_populates="dataset", cascade="all, delete-orphan")


# ---------------------------------------------------------------------------
# Incident (historical ticket from dataset)
# ---------------------------------------------------------------------------
class Incident(Base):
    __tablename__ = "incidents"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    dataset_id: Mapped[str] = mapped_column(ForeignKey("datasets.id"), nullable=False)
    ticket_id: Mapped[str | None] = mapped_column(String)          # original ticket ID from CSV
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    root_cause: Mapped[str | None] = mapped_column(Text)
    resolution: Mapped[str | None] = mapped_column(Text)
    category: Mapped[str | None] = mapped_column(String)
    severity: Mapped[str | None] = mapped_column(String)
    embedding_id: Mapped[int | None] = mapped_column(Integer)       # FAISS index position
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    dataset: Mapped["Dataset"] = relationship(back_populates="incidents")


# ---------------------------------------------------------------------------
# Analysis (result of POST /api/analyze)
# ---------------------------------------------------------------------------
class Analysis(Base):
    __tablename__ = "analyses"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    incident_description: Mapped[str] = mapped_column(Text, nullable=False)
    summary: Mapped[str | None] = mapped_column(Text)
    root_cause: Mapped[str | None] = mapped_column(Text)
    resolution: Mapped[str | None] = mapped_column(Text)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    evidence: Mapped[list] = mapped_column(JSON, default=list)          # list of evidence strings
    similar_incidents: Mapped[list] = mapped_column(JSON, default=list) # list of {id, title, score}
    severity: Mapped[str | None] = mapped_column(String)                 # P1 | P2 | P3
    status: Mapped[str] = mapped_column(String, default="pending")      # pending | completed | failed
    error_message: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    feedback: Mapped[list["Feedback"]] = relationship(back_populates="analysis", cascade="all, delete-orphan")


# ---------------------------------------------------------------------------
# Feedback
# ---------------------------------------------------------------------------
class Feedback(Base):
    __tablename__ = "feedbacks"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    analysis_id: Mapped[str] = mapped_column(ForeignKey("analyses.id"), nullable=False)
    was_accurate: Mapped[bool] = mapped_column(default=True)
    rating: Mapped[int] = mapped_column(Integer, default=5)            # 1-5
    comment: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    analysis: Mapped["Analysis"] = relationship(back_populates="feedback")
