import logging
import time
from typing import Any

import torch
from PIL import Image
from transformers import AutoModelForImageTextToText, AutoProcessor

from app.core.config import settings
from app.engine.base import InferenceEngine

logger = logging.getLogger(__name__)


class MedGemmaEngine(InferenceEngine):
    """MedGemma 4B-IT inference engine (ADR-001, SPEC-001 §2)."""

    def __init__(self):
        self._model: Any = None
        self._processor: Any = None

    def _get_torch_dtype(self) -> torch.dtype:
        dtype_map = {
            "bfloat16": torch.bfloat16,
            "float16": torch.float16,
            "float32": torch.float32,
        }
        return dtype_map.get(settings.torch_dtype, torch.bfloat16)

    def load(self) -> None:
        if self._model is not None:
            return

        logger.info("Loading model: %s", settings.model_id)
        self._processor = AutoProcessor.from_pretrained(settings.model_id)
        self._model = AutoModelForImageTextToText.from_pretrained(
            settings.model_id,
            torch_dtype=self._get_torch_dtype(),
            device_map=settings.device,
        )
        logger.info("Model loaded successfully")

    def analyze(self, image: Image.Image, system_prompt: str, user_prompt: str) -> str:
        if not self.is_loaded():
            self.load()

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

        inputs = self._processor.apply_chat_template(
            messages,
            add_generation_prompt=True,
            tokenize=True,
            return_dict=True,
            return_tensors="pt",
        ).to(self._model.device, dtype=self._get_torch_dtype())

        input_len = inputs["input_ids"].shape[-1]

        start = time.perf_counter()
        with torch.inference_mode():
            generation = self._model.generate(
                **inputs,
                max_new_tokens=settings.max_new_tokens,
                do_sample=False,
            )
            generation = generation[0][input_len:]
        elapsed_ms = (time.perf_counter() - start) * 1000
        logger.info("Inference completed in %.0fms", elapsed_ms)

        return self._processor.decode(generation, skip_special_tokens=True)

    def is_loaded(self) -> bool:
        return self._model is not None and self._processor is not None

    def model_id(self) -> str:
        return settings.model_id
