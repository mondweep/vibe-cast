import logging
from pathlib import Path

logger = logging.getLogger(__name__)

PROMPTS_DIR = Path(__file__).resolve().parent.parent.parent.parent / "docs" / "prompts"


class PromptLoader:
    """Loads versioned prompts from the BHIL prompt registry."""

    def __init__(self, prompts_dir: Path = PROMPTS_DIR):
        self._dir = prompts_dir
        self._cache: dict[str, str] = {}

    def _resolve_latest_version(self, prompt_id: str) -> Path | None:
        prompt_dir = self._dir / prompt_id
        if not prompt_dir.is_dir():
            return None
        versions = sorted(
            [d for d in prompt_dir.iterdir() if d.is_dir()],
            key=lambda d: d.name,
            reverse=True,
        )
        return versions[0] if versions else None

    def _find_content_file(self, version_dir: Path) -> Path | None:
        for name in ("system-prompt.md", "user-template.md", "instruction.md"):
            candidate = version_dir / name
            if candidate.exists():
                return candidate
        return None

    def load(self, prompt_id: str) -> str:
        if prompt_id in self._cache:
            return self._cache[prompt_id]

        version_dir = self._resolve_latest_version(prompt_id)
        if version_dir is None:
            raise FileNotFoundError(f"Prompt not found: {prompt_id}")

        content_file = self._find_content_file(version_dir)
        if content_file is None:
            raise FileNotFoundError(
                f"No content file in {version_dir}. "
                f"Expected system-prompt.md, user-template.md, or instruction.md"
            )

        text = content_file.read_text().strip()
        self._cache[prompt_id] = text
        logger.info("Loaded prompt %s from %s", prompt_id, content_file)
        return text

    def load_system_prompt(self, modality: str) -> str:
        return self.load(f"{modality}-system")

    def load_user_template(self, modality: str) -> str:
        return self.load(f"{modality}-user")

    def load_structured_output_instruction(self) -> str:
        return self.load("structured-output")

    def build_user_prompt(self, modality: str, user_query: str | None = None) -> str:
        template = self.load_user_template(modality)
        # Replace {{user_query:default=...}} placeholder
        if user_query:
            import re
            template = re.sub(
                r"\{\{user_query(?::default=[^}]*)?\}\}",
                user_query,
                template,
            )
        else:
            import re
            template = re.sub(
                r"\{\{user_query:default=([^}]*)\}\}",
                r"\1",
                template,
            )

        structured = self.load_structured_output_instruction()
        return f"{template}\n\n{structured}"
