import json
import logging
import re
import time

from PIL import Image

from app.engine.base import InferenceEngine
from app.engine.prompts import PromptLoader
from app.schemas.analysis import AnalyzeResponse, Finding, Modality, ResponseMetadata

logger = logging.getLogger(__name__)

MODALITY_CONDITIONS: dict[Modality, list[str]] = {
    Modality.radiology: ["pneumonia", "cardiomegaly", "pleural effusion", "fractures"],
    Modality.dermatology: ["melanoma", "basal cell carcinoma", "psoriasis", "eczema"],
    Modality.pathology: ["tissue architecture", "malignancy indicators", "inflammation"],
    Modality.ophthalmology: ["diabetic retinopathy", "glaucoma", "macular degeneration"],
}


def parse_model_output(raw_output: str) -> tuple[str, list[Finding], bool]:
    """Parse raw model output into structured findings.

    Returns (summary, findings, parse_success).
    """
    json_match = re.search(r"\{[\s\S]*\}", raw_output)
    if json_match:
        try:
            parsed = json.loads(json_match.group())
            findings = [
                Finding(
                    description=f.get("description", ""),
                    severity=f.get("severity", "normal"),
                    location=f.get("location"),
                )
                for f in parsed.get("findings", [])
            ]
            if findings:
                return parsed.get("summary", raw_output[:300]), findings, True
        except (json.JSONDecodeError, KeyError, TypeError):
            pass

    # Fallback: raw output as single finding (US-006: never drop output)
    return (
        raw_output[:300],
        [Finding(description=raw_output, severity="normal", location=None)],
        False,
    )


def analyze_image(
    engine: InferenceEngine,
    prompt_loader: PromptLoader,
    image: Image.Image,
    modality: Modality,
    query: str | None = None,
) -> AnalyzeResponse:
    """Analyze a medical image using the inference engine and prompt registry."""
    system_prompt = prompt_loader.load_system_prompt(modality.value)
    user_prompt = prompt_loader.build_user_prompt(modality.value, query)

    logger.info("Running %s analysis with %s", modality.value, engine.model_id())

    start = time.perf_counter()
    raw_output = engine.analyze(image, system_prompt, user_prompt)
    inference_time_ms = int((time.perf_counter() - start) * 1000)

    summary, findings, parse_success = parse_model_output(raw_output)

    return AnalyzeResponse(
        modality=modality,
        summary=summary,
        findings=findings,
        raw_output=raw_output,
        metadata=ResponseMetadata(
            model_id=engine.model_id(),
            inference_time_ms=inference_time_ms,
            image_resolution=f"{image.width}x{image.height}",
            parse_success=parse_success,
        ),
    )
