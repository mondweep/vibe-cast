from abc import ABC, abstractmethod

from PIL import Image


class InferenceEngine(ABC):
    """Abstract inference engine interface (SPEC-001 §2).

    Any inference backend (MedGemma, ONNX, AI Core proxy) must implement
    this interface. The API server depends only on this abstraction.
    """

    @abstractmethod
    def load(self) -> None:
        """Load the model into memory. May be called lazily on first inference."""

    @abstractmethod
    def analyze(self, image: Image.Image, system_prompt: str, user_prompt: str) -> str:
        """Run inference on a medical image.

        Args:
            image: RGB PIL Image.
            system_prompt: Modality-specific system prompt from registry.
            user_prompt: User query + structured output instruction.

        Returns:
            Raw model output string.
        """

    @abstractmethod
    def is_loaded(self) -> bool:
        """Whether the model is loaded and ready for inference."""

    @abstractmethod
    def model_id(self) -> str:
        """Return the model identifier string."""
