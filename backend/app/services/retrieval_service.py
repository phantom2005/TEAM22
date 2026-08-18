"""
RAG Retrieval Service
---------------------
Responsibilities:
  1. Build a FAISS index from Incident rows stored in the DB.
  2. Embed an incoming query with the same sentence-transformer model.
  3. Return the top-K most similar incidents with cosine similarity scores.

The index is held in memory as a module-level singleton so it is built once
per process and reused across requests.
"""

from __future__ import annotations

import asyncio
import os
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.logging import get_logger
from app.models import Incident

logger = get_logger(__name__)
settings = get_settings()

# Lazy imports — heavy libraries loaded only when first needed
_faiss = None
_SentenceTransformer = None


def _import_faiss():
    global _faiss
    if _faiss is None:
        import faiss as faiss_lib  # noqa: PLC0415
        _faiss = faiss_lib
    return _faiss


def _import_st():
    global _SentenceTransformer
    if _SentenceTransformer is None:
        from sentence_transformers import SentenceTransformer  # noqa: PLC0415
        _SentenceTransformer = SentenceTransformer
    return _SentenceTransformer


@dataclass
class RetrievalResult:
    incident: Incident
    score: float  # cosine similarity 0-1


@dataclass
class RAGIndex:
    """In-memory FAISS index + mapping back to Incident primary keys."""
    index: object = None          # faiss.IndexFlatIP
    incident_ids: list[str] = field(default_factory=list)
    model: object = None          # SentenceTransformer
    dimension: int = 384


# Module-level singleton
_rag_index: RAGIndex = RAGIndex()
_index_lock = asyncio.Lock()


def _embed(texts: list[str], model) -> np.ndarray:
    """Return L2-normalised embeddings (shape: N x D, float32)."""
    vecs = model.encode(texts, convert_to_numpy=True, show_progress_bar=False)
    norms = np.linalg.norm(vecs, axis=1, keepdims=True)
    norms = np.where(norms == 0, 1, norms)
    return (vecs / norms).astype(np.float32)


async def build_index(db: AsyncSession) -> int:
    """
    (Re)build the FAISS index from all Incident rows in the database.
    Returns the number of vectors indexed.
    """
    async with _index_lock:
        faiss = _import_faiss()
        ST = _import_st()

        result = await db.execute(select(Incident))
        incidents: list[Incident] = result.scalars().all()

        if not incidents:
            logger.warning("No incidents found — RAG index is empty.")
            _rag_index.index = None
            _rag_index.incident_ids = []
            return 0

        texts = [f"{inc.title}. {inc.description}" for inc in incidents]

        if _rag_index.model is None:
            logger.info("Loading embedding model: %s", settings.embedding_model)
            _rag_index.model = ST(settings.embedding_model)

        logger.info("Embedding %d incidents…", len(texts))
        embeddings = _embed(texts, _rag_index.model)

        dim = embeddings.shape[1]
        index = faiss.IndexFlatIP(dim)   # Inner-product on normalised vecs == cosine
        index.add(embeddings)

        _rag_index.index = index
        _rag_index.incident_ids = [inc.id for inc in incidents]
        _rag_index.dimension = dim

        logger.info("FAISS index built with %d vectors (dim=%d).", len(incidents), dim)
        return len(incidents)


async def retrieve(query: str, db: AsyncSession, top_k: int | None = None) -> list[RetrievalResult]:
    """
    Embed *query* and return the top-K most similar incidents.
    Automatically rebuilds the index if it is empty.
    """
    k = top_k or settings.top_k_results

    if _rag_index.index is None or _rag_index.index.ntotal == 0:
        logger.info("Index empty — building now.")
        await build_index(db)

    if _rag_index.index is None or _rag_index.index.ntotal == 0:
        logger.warning("No incidents in DB — returning empty retrieval.")
        return []

    if _rag_index.model is None:
        ST = _import_st()
        _rag_index.model = ST(settings.embedding_model)

    query_vec = _embed([query], _rag_index.model)
    k_actual = min(k, _rag_index.index.ntotal)
    scores, indices = _rag_index.index.search(query_vec, k_actual)

    results: list[RetrievalResult] = []
    for score, idx in zip(scores[0], indices[0]):
        if idx < 0 or score < settings.similarity_threshold:
            continue
        incident_id = _rag_index.incident_ids[idx]
        incident = await db.get(Incident, incident_id)
        if incident:
            results.append(RetrievalResult(incident=incident, score=float(score)))

    logger.debug("Retrieved %d results for query (top score=%.3f).", len(results), scores[0][0] if len(scores[0]) else 0)
    return results


def index_status() -> dict:
    return {
        "total_vectors": _rag_index.index.ntotal if _rag_index.index else 0,
        "dimension": _rag_index.dimension,
        "model": settings.embedding_model,
    }
