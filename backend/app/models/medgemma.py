import logging
from typing import Any

import torch
from PIL import Image
from transformers import AutoModelForImageTextToText, AutoProcessor

from app.core.config import settings

logger = logging.getLogger(__name__)

_model: Any = None
_processor: Any = None


def get_torch_dtype() -> torch.dtype:
    dtype_map = {
        "bfloat16": torch.bfloat16,
        "float16": torch.float16,
        "float32": torch.float32,
    }
    return dtype_map.get(settings.torch_dtype, torch.bfloat16)


def load_model() -> tuple[Any, Any]:
    global _model, _processor

    if _model is not None and _processor is not None:
        return _model, _processor

    logger.info("Loading MedGemma model: %s", settings.model_id)

    _processor = AutoProcessor.from_pretrained(settings.model_id)
    _model = AutoModelForImageTextToText.from_pretrained(
        settings.model_id,
        torch_dtype=get_torch_dtype(),
        device_map=settings.device,
    )

    logger.info("MedGemma model loaded successfully")
    return _model, _processor


def run_inference(image: Image.Image, system_prompt: str, user_prompt: str) -> str:
    model, processor = load_model()

    messages = [
        {
            "role": "system",
            "content": [{"type": "text", "text": system_prompt}],
        },
        {
            "role": "user",
            "content": [
                {"type": "text", "text": user_prompt},
                {"type": "image", "image": image},
            ],
        },
    ]

    inputs = processor.apply_chat_template(
        messages,
        add_generation_prompt=True,
        tokenize=True,
        return_dict=True,
        return_tensors="pt",
    ).to(model.device, dtype=get_torch_dtype())

    input_len = inputs["input_ids"].shape[-1]

    with torch.inference_mode():
        generation = model.generate(
            **inputs,
            max_new_tokens=settings.max_new_tokens,
            do_sample=False,
        )
        generation = generation[0][input_len:]

    return processor.decode(generation, skip_special_tokens=True)
