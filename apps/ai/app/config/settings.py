from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    port: int = 8000
    environment: str = "development"
    log_level: str = "INFO"
    internal_api_key: str = "dev-internal-secret-key"

    # AI Provider Selection: 'gemini' or 'groq'
    ai_provider: Optional[str] = None

    # Google Gemini Configuration (Google AI Studio Free Tier)
    gemini_api_key: Optional[str] = None
    gemini_model: str = "gemini-3.5-flash"
    gemini_temperature: float = 0.1

    gemini_max_tokens: int = 4096
    gemini_timeout: float = 30.0  # Request timeout in seconds
    gemini_max_retries: int = 2   # Bounded retry attempts for transient errors
    gemini_retry_delay: float = 1.0  # Initial exponential backoff delay in seconds
    gemini_thinking_budget: Optional[int] = 0  # 0 disables dynamic thinking latency for Gemini Flash

    # Groq LLM Configuration
    groq_api_key: Optional[str] = None
    groq_model: str = "llama-3.3-70b-versatile"
    groq_temperature: float = 0.1
    groq_max_tokens: int = 4096
    groq_timeout: float = 30.0  # Request timeout in seconds
    groq_max_retries: int = 2   # Bounded retry attempts


    @property
    def resolved_ai_provider(self) -> str:
        """Determines the active AI provider, honoring AI_PROVIDER or auto-detecting configured keys."""
        if self.ai_provider:
            prov = self.ai_provider.lower().strip()
            if prov in ("gemini", "groq"):
                return prov
        gemini_ready = bool(self.gemini_api_key and not self.gemini_api_key.startswith("your_"))
        groq_ready = bool(self.groq_api_key and not self.groq_api_key.startswith("your_"))
        if gemini_ready and not groq_ready:
            return "gemini"
        if groq_ready and not gemini_ready:
            return "groq"
        return "gemini"

    # CORS
    cors_origin: str = "http://localhost:3001"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
