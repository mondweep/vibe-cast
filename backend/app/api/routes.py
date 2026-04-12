import logging
import time
from io import BytesIO
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from PIL import Image

from app.core.config import settings
from app.engine.base import InferenceEngine
from app.engine.medgemma import MedGemmaEngine
from app.engine.prompts import PromptLoader
from app.schemas.analysis import (
    AnalyzeResponse,
    ErrorResponse,
    HealthResponse,
    Modality,
    ModalitiesResponse,
    ModalityInfo,
)
from app.services.analysis import MODALITY_CONDITIONS, analyze_image

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["analysis"])

# Pluggable engine — swap this for a different InferenceEngine implementation
_engine: InferenceEngine = MedGemmaEngine()
_prompt_loader = PromptLoader()
_start_time = time.time()


@router.get("/modalities", response_model=ModalitiesResponse)
def list_modalities() -> ModalitiesResponse:
    """List supported medical imaging modalities."""
    return ModalitiesResponse(
        modalities=[
            ModalityInfo(
                id=modality,
                name=modality.value.title(),
                description=_prompt_loader.load_system_prompt(modality.value)[:120],
                supported_conditions=conditions,
            )
            for modality, conditions in MODALITY_CONDITIONS.items()
        ]
    )


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(
    image: UploadFile = File(..., description="Medical image to analyze"),
    modality: Modality = Form(..., description="Imaging modality"),
    query: str | None = Form(None, description="Optional custom analysis query", max_length=500),
) -> AnalyzeResponse:
    """Analyze a medical image using MedGemma."""
    # Check engine readiness
    if not _engine.is_loaded():
        try:
            _engine.load()
        except Exception:
            return JSONResponse(
                status_code=503,
                headers={"Retry-After": "30"},
                content=ErrorResponse(
                    error="model_not_ready",
                    detail="Model is loading. Please retry after 30 seconds.",
                ).model_dump(),
            )

    # Validate file extension
    ext = Path(image.filename or "").suffix.lower()
    if ext and ext not in settings.allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=ErrorResponse(
                error="invalid_format",
                detail=f"Unsupported file type: {ext}. Allowed: {settings.allowed_extensions}",
                field="image",
            ).model_dump(),
        )

    # Validate file size
    contents = await image.read()
    size_mb = len(contents) / (1024 * 1024)
    if size_mb > settings.max_upload_size_mb:
        raise HTTPException(
            status_code=400,
            detail=ErrorResponse(
                error="file_too_large",
                detail=f"File too large: {size_mb:.1f}MB. Max: {settings.max_upload_size_mb}MB",
                field="image",
            ).model_dump(),
        )

    # Load and validate image
    try:
        pil_image = Image.open(BytesIO(contents)).convert("RGB")
    except Exception:
        raise HTTPException(
            status_code=400,
            detail=ErrorResponse(
                error="invalid_image",
                detail="Could not decode image file. Ensure it is a valid image.",
                field="image",
            ).model_dump(),
        )

    return analyze_image(_engine, _prompt_loader, pil_image, modality, query)


@router.get("/health", response_model=HealthResponse)
def health_check() -> HealthResponse:
    """API health check."""
    model_loaded = _engine.is_loaded()
    if model_loaded:
        status = "healthy"
    else:
        status = "loading"

    return HealthResponse(
        status=status,
        model_id=_engine.model_id(),
        model_loaded=model_loaded,
        uptime_seconds=round(time.time() - _start_time, 1),
    )
