"""
FastAPI main application.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.shared.infrastructure.config import get_settings

settings = get_settings()

app = FastAPI(
    title="JW Meeting System API",
    description="Sistema de gestión de programas de reuniones semanales",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "JW Meeting System API",
        "version": "1.0.0",
        "environment": settings.environment,
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


# Import and include routers
from src.api.routes import assignments, memory, program

app.include_router(
    assignments.router,
    prefix="/api/v1/assignments",
    tags=["assignments"]
)

app.include_router(
    program.router,
    prefix="/api/v1/programs",
    tags=["programs"]
)

app.include_router(
    memory.router,
    prefix="/api/v1/memory",
    tags=["memory"]
)
