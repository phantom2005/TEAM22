from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models import Dataset
from app.schemas import DatasetOut
from app.services.dataset_service import ingest_dataset

router = APIRouter(prefix="/datasets", tags=["Datasets"])

_MAX_UPLOAD_BYTES = 50 * 1024 * 1024  # 50 MB


@router.post("", response_model=DatasetOut, status_code=201)
async def upload_dataset(
    file: UploadFile = File(...),
    name: str = Form(...),
    description: str = Form(default=""),
    db: AsyncSession = Depends(get_db),
):
    """Upload a CSV or JSON file containing historical incident tickets."""
    if file.filename and not (file.filename.endswith(".csv") or file.filename.endswith(".json")):
        raise HTTPException(status_code=400, detail="Only .csv and .json files are supported.")

    content = await file.read()
    if len(content) > _MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File exceeds 50 MB limit.")

    dataset = await ingest_dataset(
        db=db,
        file_content=content,
        filename=file.filename or "upload.csv",
        name=name,
        description=description or None,
    )
    return dataset


@router.get("", response_model=list[DatasetOut])
async def list_datasets(db: AsyncSession = Depends(get_db)):
    """Return all uploaded datasets."""
    result = await db.execute(select(Dataset).order_by(Dataset.created_at.desc()))
    return result.scalars().all()
