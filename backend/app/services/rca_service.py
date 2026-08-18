"""
RCA Generation Service
----------------------
Flow:
  1. Receive incident description + retrieved similar incidents.
  2. Build a structured prompt with the evidence context.
  3. Call Groq Chat Completions (JSON mode).
  4. Parse and return a typed RCAResult.

If GROQ_API_KEY is empty the service falls back to a deterministic
mock so the app stays runnable without an API key during development.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field

from app.core.config import get_settings
from app.core.logging import get_logger
from app.services.retrieval_service import RetrievalResult

logger = get_logger(__name__)
settings = get_settings()


@dataclass
class RCAResult:
    summary: str
    root_cause: str
    resolution: str
    confidence: float
    evidence: list[str] = field(default_factory=list)


_SYSTEM_PROMPT = """\
You are an expert Site Reliability Engineer performing Root Cause Analysis.
Given an incident description and similar historical incidents, produce a concise RCA.

Respond ONLY with valid JSON matching this exact schema:
{
  "summary": "<one-sentence executive summary>",
  "root_cause": "<detailed root cause explanation>",
  "resolution": "<step-by-step resolution>",
  "confidence": <float 0.0-1.0>,
  "evidence": ["<evidence point 1>", "<evidence point 2>", ...]
}
"""


def _build_user_prompt(description: str, retrieved: list[RetrievalResult]) -> str:
    lines = [f"## New Incident\n{description}\n"]
    if retrieved:
        lines.append("## Similar Historical Incidents")
        for i, r in enumerate(retrieved, 1):
            inc = r.incident
            lines.append(
                f"\n### [{i}] {inc.title} (similarity: {r.score:.2f})\n"
                f"Description: {inc.description}\n"
                f"Root Cause: {inc.root_cause or 'N/A'}\n"
                f"Resolution: {inc.resolution or 'N/A'}"
            )
    else:
        lines.append("No similar historical incidents found.")
    return "\n".join(lines)


def _mock_rca(description: str, retrieved: list[RetrievalResult]) -> RCAResult:
    """Deterministic fallback used when no Groq API key is configured."""
    top = retrieved[0] if retrieved else None
    return RCAResult(
        summary=f"Automated analysis of: {description[:80]}…",
        root_cause=top.incident.root_cause or "Root cause could not be determined without LLM." if top else "No similar incidents found.",
        resolution=top.incident.resolution or "Manual investigation required." if top else "Manual investigation required.",
        confidence=round(top.score, 2) if top else 0.0,
        evidence=[f"Similar incident: {r.incident.title} (score={r.score:.2f})" for r in retrieved],
    )


async def generate_rca(description: str, retrieved: list[RetrievalResult]) -> RCAResult:
    """
    Generate an RCA using the LLM.
    Falls back to mock if GROQ_API_KEY is not set.
    """
    if not settings.groq_api_key:
        logger.warning("GROQ_API_KEY not set — using mock RCA.")
        return _mock_rca(description, retrieved)

    try:
        from groq import AsyncGroq  

        client = AsyncGroq(api_key=settings.groq_api_key)  


        response = await client.chat.completions.create(
            model=settings.groq_model,
            max_tokens=settings.groq_max_tokens,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": _build_user_prompt(description, retrieved)},
            ],
        )

        raw = response.choices[0].message.content or "{}"
        data = json.loads(raw)

        return RCAResult(
            summary=data.get("summary", ""),
            root_cause=data.get("root_cause", ""),
            resolution=data.get("resolution", ""),
            confidence=float(data.get("confidence", 0.0)),
            evidence=data.get("evidence", []),
        )

    except Exception as exc:
        logger.error("LLM call failed: %s — falling back to mock.", exc)
        return _mock_rca(description, retrieved)
