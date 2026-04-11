from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "MedImage - Medical Image Analysis"
    model_id: str = "google/medgemma-4b-it"
    max_new_tokens: int = 1024
    device: str = "auto"
    torch_dtype: str = "bfloat16"
    max_upload_size_mb: int = 20
    allowed_extensions: list[str] = [".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".dcm"]

    model_config = {"env_prefix": "MEDIMAGE_"}


settings = Settings()
