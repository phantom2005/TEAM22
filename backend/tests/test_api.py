import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health(client: AsyncClient):
    resp = await client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert "database" in data
    assert "rag_index" in data


@pytest.mark.asyncio
async def test_analytics_empty(client: AsyncClient):
    resp = await client.get("/api/analytics")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_analyses"] >= 0
    assert data["total_incidents"] >= 0


@pytest.mark.asyncio
async def test_list_datasets_empty(client: AsyncClient):
    resp = await client.get("/api/datasets")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_list_incidents_empty(client: AsyncClient):
    resp = await client.get("/api/incidents")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 0
    assert data["items"] == []


@pytest.mark.asyncio
async def test_analyze_no_incidents(client: AsyncClient):
    """With an empty DB the mock RCA fallback should still return 201."""
    resp = await client.post(
        "/api/analyze",
        json={"incident_description": "Production payment API returning HTTP 502 Bad Gateway errors."},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert "id" in data
    assert "summary" in data
    assert "root_cause" in data
    assert "confidence" in data
    assert isinstance(data["similar_incidents"], list)
    assert isinstance(data["evidence"], list)


@pytest.mark.asyncio
async def test_analyze_short_description_rejected(client: AsyncClient):
    resp = await client.post("/api/analyze", json={"incident_description": "short"})
    assert resp.status_code == 422  # Pydantic min_length validation


@pytest.mark.asyncio
async def test_get_analysis_not_found(client: AsyncClient):
    resp = await client.get("/api/analysis/nonexistent-id")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_feedback_not_found(client: AsyncClient):
    resp = await client.post(
        "/api/feedback",
        json={"analysis_id": "nonexistent", "was_accurate": True, "rating": 5},
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_full_analyze_and_feedback_flow(client: AsyncClient):
    """End-to-end: analyze → get analysis → submit feedback."""
    # 1. Analyze
    analyze_resp = await client.post(
        "/api/analyze",
        json={"incident_description": "Database connection pool exhausted during peak traffic causing 503 errors on all API endpoints."},
    )
    assert analyze_resp.status_code == 201
    analysis_id = analyze_resp.json()["id"]

    # 2. Retrieve analysis
    get_resp = await client.get(f"/api/analysis/{analysis_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["id"] == analysis_id

    # 3. Submit feedback
    fb_resp = await client.post(
        "/api/feedback",
        json={"analysis_id": analysis_id, "was_accurate": True, "rating": 4, "comment": "Spot on."},
    )
    assert fb_resp.status_code == 201
    assert fb_resp.json()["analysis_id"] == analysis_id
