import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config.settings import settings
from .api.v1.endpoints import router as v1_router

# Configure root logging format
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("OpsPilotAIService")

app = FastAPI(
    title="OpsPilot AI Service",
    description="Autonomous incident investigation engine powered by LangGraph, specialized agents, and Groq.",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Configuration
origins = [
    settings.cors_origin,
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled exception on {request.url.path}: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "statusCode": 500,
            "code": "INTERNAL_SERVER_ERROR",
            "message": "An unexpected error occurred in the AI investigation engine.",
        },
    )


@app.get("/health", tags=["Health"])
def health_check():
    """Health inspection endpoint for service monitoring and container orchestration."""
    return {
        "status": "healthy",
        "service": "opspilot-ai",
        "version": "2.0.0",
        "groq_configured": bool(settings.groq_api_key and not settings.groq_api_key.startswith("your_")),
    }


# Mount API V1 routes
app.include_router(v1_router, prefix="/api/v1")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.port, reload=True)
