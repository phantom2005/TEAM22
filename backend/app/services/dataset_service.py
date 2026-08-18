"""
Dataset Ingestion Service
-------------------------
Accepts an uploaded file (CSV or JSON), maps columns to Incident fields,
persists everything to the DB, then triggers a FAISS index rebuild.

Expected CSV columns (case-insensitive, extras ignored):
  ticket_id, title, description, root_cause, resolution, category, severity
"""

from __future__ import annotations

import io
import uuid
from pathlib import Path

import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.logging import get_logger
from app.models import Dataset, Incident
from app.services import retrieval_service

logger = get_logger(__name__)
settings = get_settings()

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# Flexible column aliases — first match wins
_COL_MAP = {
    "ticket_id":   ["ticket_id", "id", "incident_id", "issue_id"],
    "title":       ["title", "summary", "subject", "name"],
    "description": ["description", "desc", "body", "details", "text"],
    "root_cause":  ["root_cause", "rootcause", "cause", "root cause"],
    "resolution":  ["resolution", "fix", "solution", "resolved_by"],
    "category":    ["category", "type", "incident_type"],
    "severity":    ["severity", "priority", "level"],
}


def _normalise_columns(df: pd.DataFrame) -> pd.DataFrame:
    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]
    rename = {}
    for target, aliases in _COL_MAP.items():
        for alias in aliases:
            if alias in df.columns and target not in df.columns:
                rename[alias] = target
                break
    return df.rename(columns=rename)


def _load_dataframe(content: bytes, filename: str) -> pd.DataFrame:
    if filename.endswith(".csv"):
        return pd.read_csv(io.BytesIO(content))
    if filename.endswith(".json"):
        return pd.read_json(io.BytesIO(content))
    raise ValueError(f"Unsupported file type: {filename}. Use .csv or .json")


async def ingest_dataset(
    db: AsyncSession,
    file_content: bytes,
    filename: str,
    name: str,
    description: str | None = None,
) -> Dataset:
    dataset_id = str(uuid.uuid4())
    save_path = UPLOAD_DIR / f"{dataset_id}_{filename}"
    save_path.write_bytes(file_content)

    dataset = Dataset(
        id=dataset_id,
        name=name,
        description=description,
        file_path=str(save_path),
        status="processing",
    )
    db.add(dataset)
    await db.flush()  # get the ID without committing

    try:
        df = _load_dataframe(file_content, filename)
        df = _normalise_columns(df)

        if "description" not in df.columns:
            raise ValueError("Dataset must contain a 'description' column.")

        # If no title column, generate one from description
        if "title" not in df.columns:
            df["title"] = df["description"].str.slice(0, 80) + "..."

        df = df.where(pd.notna(df), None)  # replace NaN with None

        incidents: list[Incident] = []
        for _, row in df.iterrows():
            inc = Incident(
                dataset_id=dataset_id,
                ticket_id=str(row.get("ticket_id") or ""),
                title=str(row["title"]),
                description=str(row["description"]),
                root_cause=row.get("root_cause"),
                resolution=row.get("resolution"),
                category=row.get("category"),
                severity=row.get("severity"),
            )
            incidents.append(inc)

        db.add_all(incidents)
        dataset.row_count = len(incidents)
        dataset.status = "ready"
        await db.flush()

        # Rebuild FAISS index with new data
        await retrieval_service.build_index(db)
        logger.info("Ingested dataset '%s' with %d incidents.", name, len(incidents))

    except Exception as exc:
        dataset.status = "failed"
        logger.error("Dataset ingestion failed: %s", exc)
        raise

    return dataset
