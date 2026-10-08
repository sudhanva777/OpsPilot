import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Header, status

from ...config.settings import settings
from ...models.schemas import (
    StartInvestigationRequest,
    InvestigationResponse,
    EvidenceItem,
    HypothesisItem,
    RecommendationItem,
    AgentRunItem,
)
from ...services.investigation_service import InvestigationService

logger = logging.getLogger("InvestigationAPI")

router = APIRouter(prefix="/investigations", tags=["Investigations"])

# Singleton investigation service instance
_investigation_service = InvestigationService()


def get_investigation_service() -> InvestigationService:
    return _investigation_service


def verify_internal_auth(x_internal_key: Optional[str] = Header(None)) -> None:
    """Verifies that inter-service requests from NestJS provide the configured key if set."""
    if settings.internal_api_key and settings.environment == "production":
        if x_internal_key != settings.internal_api_key:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid internal service authorization key",
            )


@router.post(
    "",
    response_model=InvestigationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Start an AI Investigation",
)
async def start_investigation(
    payload: StartInvestigationRequest,
    service: InvestigationService = Depends(get_investigation_service),
    _: None = Depends(verify_internal_auth),
) -> InvestigationResponse:
    """Initiates an asynchronous LangGraph investigation for the specified incident."""
    try:
        result = await service.execute_investigation(
            incident_id=payload.incidentId,
            incident=payload.incident,
            investigation_id=payload.investigationId,
        )
        return result
    except Exception as e:
        logger.error(f"Error initiating investigation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to complete AI investigation workflow.",
        )


@router.get(
    "/{id}",
    response_model=InvestigationResponse,
    summary="Get Investigation Details",
)
def get_investigation(
    id: str,
    service: InvestigationService = Depends(get_investigation_service),
    _: None = Depends(verify_internal_auth),
) -> InvestigationResponse:
    inv = service.get_investigation(id)
    if not inv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Investigation '{id}' not found.",
        )
    return inv


@router.get(
    "/{id}/evidence",
    response_model=List[EvidenceItem],
    summary="Get Investigation Evidence",
)
def get_investigation_evidence(
    id: str,
    service: InvestigationService = Depends(get_investigation_service),
    _: None = Depends(verify_internal_auth),
) -> List[EvidenceItem]:
    inv = service.get_investigation(id)
    if not inv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Investigation '{id}' not found.",
        )
    return service.get_evidence(id)


@router.get(
    "/{id}/hypotheses",
    response_model=List[HypothesisItem],
    summary="Get Investigation Hypotheses",
)
def get_investigation_hypotheses(
    id: str,
    service: InvestigationService = Depends(get_investigation_service),
    _: None = Depends(verify_internal_auth),
) -> List[HypothesisItem]:
    inv = service.get_investigation(id)
    if not inv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Investigation '{id}' not found.",
        )
    return service.get_hypotheses(id)


@router.get(
    "/{id}/recommendation",
    response_model=Optional[RecommendationItem],
    summary="Get Investigation Recommendation",
)
def get_investigation_recommendation(
    id: str,
    service: InvestigationService = Depends(get_investigation_service),
    _: None = Depends(verify_internal_auth),
) -> Optional[RecommendationItem]:
    inv = service.get_investigation(id)
    if not inv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Investigation '{id}' not found.",
        )
    return service.get_recommendation(id)


@router.get(
    "/{id}/runs",
    response_model=List[AgentRunItem],
    summary="Get Agent Execution Runs",
)
def get_investigation_runs(
    id: str,
    service: InvestigationService = Depends(get_investigation_service),
    _: None = Depends(verify_internal_auth),
) -> List[AgentRunItem]:
    inv = service.get_investigation(id)
    if not inv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Investigation '{id}' not found.",
        )
    return service.get_runs(id)
