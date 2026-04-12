from pathlib import Path

import pytest

from app.engine.prompts import PromptLoader

PROMPTS_DIR = Path(__file__).resolve().parent.parent.parent / "docs" / "prompts"


@pytest.fixture
def loader():
    return PromptLoader(PROMPTS_DIR)


class TestPromptLoader:
    def test_load_radiology_system(self, loader):
        text = loader.load_system_prompt("radiology")
        assert "radiologist" in text.lower()
        assert len(text) > 50

    def test_load_dermatology_system(self, loader):
        text = loader.load_system_prompt("dermatology")
        assert "dermatologist" in text.lower()

    def test_load_pathology_system(self, loader):
        text = loader.load_system_prompt("pathology")
        assert "pathologist" in text.lower()

    def test_load_ophthalmology_system(self, loader):
        text = loader.load_system_prompt("ophthalmology")
        assert "ophthalmologist" in text.lower()

    def test_load_structured_output(self, loader):
        text = loader.load_structured_output_instruction()
        assert "json" in text.lower()
        assert "findings" in text

    def test_load_nonexistent_prompt_raises(self, loader):
        with pytest.raises(FileNotFoundError):
            loader.load("nonexistent-prompt")

    def test_build_user_prompt_default(self, loader):
        prompt = loader.build_user_prompt("radiology")
        assert "Analyze this radiological image" in prompt
        assert "json" in prompt.lower()  # structured output appended

    def test_build_user_prompt_custom_query(self, loader):
        prompt = loader.build_user_prompt("radiology", "Is there pneumonia?")
        assert "Is there pneumonia?" in prompt
        assert "json" in prompt.lower()

    def test_all_modalities_have_system_and_user(self, loader):
        for modality in ("radiology", "dermatology", "pathology", "ophthalmology"):
            system = loader.load_system_prompt(modality)
            user = loader.load_user_template(modality)
            assert len(system) > 0, f"{modality} system prompt is empty"
            assert len(user) > 0, f"{modality} user template is empty"

    def test_prompts_are_cached(self, loader):
        loader.load_system_prompt("radiology")
        assert "radiology-system" in loader._cache
        # Second load should hit cache
        text = loader.load_system_prompt("radiology")
        assert "radiologist" in text.lower()
