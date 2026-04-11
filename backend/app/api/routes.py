import logging
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from PIL import Image

from app.core.config import settings
from app.schemas.analysis import AnalysisResponse
from app.services.analysis import MODALITY_PROMPTS, analyze_image

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["analysis"])


@router.get("/modalities")
def list_modalities() -> dict:
    """List supported medical imaging modalities."""
    return {
        "modalities": [
            {
                "id": key,
                "name": key.title(),
                "description": prompts["system"],
            }
            for key, prompts in MODALITY_PROMPTS.items()
        ]
    }


@router.post("/analyze", response_model=AnalysisResponse)
async def analyze(
    image: UploadFile = File(..., description="Medical image to analyze"),
    modality: str = Form(..., description="Imaging modality: radiology, dermatology, pathology, ophthalmology"),
    query: str | None = Form(None, description="Optional custom analysis query"),
) -> AnalysisResponse:
    """Analyze a medical image using MedGemma."""
    # Validate file extension
    ext = Path(image.filename or "").suffix.lower()
    if ext and ext not in settings.allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {ext}. Allowed: {settings.allowed_extensions}",
        )

    # Validate file size
    contents = await image.read()
    size_mb = len(contents) / (1024 * 1024)
    if size_mb > settings.max_upload_size_mb:
        raise HTTPException(
            status_code=400,
            detail=f"File too large: {size_mb:.1f}MB. Max: {settings.max_upload_size_mb}MB",
        )

    # Load and validate image
    try:
        from io import BytesIO

        pil_image = Image.open(BytesIO(contents)).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image file")

    # Run analysis
    try:
        result = analyze_image(pil_image, modality, query)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return result


@router.get("/health")
def health_check() -> dict:
    """Check API health status."""
    return {"status": "healthy", "model": settings.model_id}
