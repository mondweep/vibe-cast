import json
import logging
import re

from PIL import Image

from app.models.medgemma import run_inference
from app.schemas.analysis import AnalysisResponse, Finding

logger = logging.getLogger(__name__)

MODALITY_PROMPTS = {
    "radiology": {
        "system": (
            "You are an expert radiologist analyzing medical images. "
            "Provide structured findings with severity levels. "
            "Always note normal findings as well as abnormalities."
        ),
        "default_query": (
            "Analyze this radiological image. Describe all findings including "
            "normal anatomy and any abnormalities. For each finding, indicate "
            "the severity (normal, mild, moderate, severe) and anatomical location."
        ),
    },
    "dermatology": {
        "system": (
            "You are an expert dermatologist analyzing skin images. "
            "Describe the morphology, distribution, and characteristics of "
            "any lesions or conditions visible."
        ),
        "default_query": (
            "Analyze this dermatological image. Describe any skin lesions, "
            "their morphology, color, borders, symmetry, and distribution. "
            "Provide differential diagnoses ranked by likelihood."
        ),
    },
    "pathology": {
        "system": (
            "You are an expert pathologist analyzing histopathology slides. "
            "Describe tissue architecture, cellular morphology, and any "
            "pathological changes observed."
        ),
        "default_query": (
            "Analyze this histopathology image. Describe the tissue type, "
            "cellular architecture, staining pattern, and any pathological "
            "findings. Note any features suggestive of malignancy or other "
            "significant conditions."
        ),
    },
    "ophthalmology": {
        "system": (
            "You are an expert ophthalmologist analyzing ocular images. "
            "Evaluate the retinal structures, optic disc, vasculature, "
            "and any pathological changes."
        ),
        "default_query": (
            "Analyze this fundus/ocular image. Describe the optic disc, "
            "retinal vasculature, macula, and any abnormalities such as "
            "hemorrhages, exudates, or signs of diabetic retinopathy."
        ),
    },
}

STRUCTURED_OUTPUT_INSTRUCTION = """

Respond in the following JSON format:
{
  "summary": "Brief overall summary of findings",
  "findings": [
    {
      "description": "Description of the finding",
      "severity": "normal|mild|moderate|severe",
      "location": "Anatomical location if applicable"
    }
  ]
}
"""


def parse_model_output(raw_output: str, modality: str) -> AnalysisResponse:
    """Parse the raw model output into a structured response."""
    # Try to extract JSON from the output
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
            return AnalysisResponse(
                modality=modality,
                summary=parsed.get("summary", raw_output[:200]),
                findings=findings,
                raw_output=raw_output,
            )
        except (json.JSONDecodeError, KeyError):
            pass

    # Fallback: treat the entire output as a single finding
    return AnalysisResponse(
        modality=modality,
        summary=raw_output[:300],
        findings=[
            Finding(
                description=raw_output,
                severity="normal",
                location=None,
            )
        ],
        raw_output=raw_output,
    )


def analyze_image(
    image: Image.Image,
    modality: str,
    query: str | None = None,
) -> AnalysisResponse:
    """Analyze a medical image using MedGemma."""
    modality = modality.lower()
    prompts = MODALITY_PROMPTS.get(modality)
    if prompts is None:
        raise ValueError(
            f"Unsupported modality: {modality}. "
            f"Supported: {list(MODALITY_PROMPTS.keys())}"
        )

    system_prompt = prompts["system"]
    user_prompt = (query or prompts["default_query"]) + STRUCTURED_OUTPUT_INSTRUCTION

    logger.info("Running %s analysis", modality)
    raw_output = run_inference(image, system_prompt, user_prompt)
    logger.info("Analysis complete, output length: %d", len(raw_output))

    return parse_model_output(raw_output, modality)
