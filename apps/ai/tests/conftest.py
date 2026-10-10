import pytest
from app.config.settings import settings
import app.api.v1.endpoints as endpoints
from app.services.investigation_service import InvestigationService


@pytest.fixture(autouse=True)
def prevent_unmocked_live_api_calls(monkeypatch):
    """Ensures test suites (such as test_generalization, test_graph, test_api)

    do not accidentally make unmocked live external API calls over the internet
    when GEMINI_API_KEY is present in the local developer .env file.
    Tests specifically testing Gemini/Groq providers with mocks instantiate their
    own LLMService or pass mock clients directly.
    """
    monkeypatch.setattr(settings, "gemini_api_key", None)
    monkeypatch.setattr(settings, "groq_api_key", None)
    endpoints._investigation_service = InvestigationService()
