"""
AI Incident RCA Backend
-----------------------
Entry point: uvicorn app.main:app --reload
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import api_router
from app.core.config import get_settings
from app.core.database import Base, engine
from app.core.logging import get_logger, setup_logging

setup_logging()
logger = get_logger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ──────────────────────────────────────────────────────────────
    logger.info("Starting AI Incident RCA Backend [%s]", settings.app_env)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables created / verified.")
    yield
    # ── Shutdown ─────────────────────────────────────────────────────────────
    await engine.dispose()
    logger.info("Database connections closed.")


app = FastAPI(
    title="AI Incident RCA API",
    description=(
        "Root Cause Analysis engine powered by RAG retrieval and LLM generation. "
        "Upload historical incident datasets, then POST a new incident description "
        "to receive an AI-generated RCA with similar historical matches."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Global exception handlers ────────────────────────────────────────────────
@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    logger.warning("ValueError on %s: %s", request.url.path, exc)
    return JSONResponse(status_code=400, content={"detail": str(exc)})


@app.exception_handler(Exception)
async def generic_error_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception on %s: %s", request.url.path, exc, exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "Internal server error."})


# ── Routes ───────────────────────────────────────────────────────────────────
app.include_router(api_router)


@app.get("/", include_in_schema=False)
async def root():
    return {"message": "AI Incident RCA API", "docs": "/docs"}
