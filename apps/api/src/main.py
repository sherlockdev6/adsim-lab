"""
AdSim Lab - FastAPI Application Entry Point
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.core.config import settings
from src.routes import health, auth, scenarios, accounts, campaigns, runs
from src.routes import ad_groups, keywords, ads, landing_pages
from src.routes import coaching, search_terms, causal_analysis


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup/shutdown events."""
    # Startup
    print("AdSim Lab API starting up...")
    yield
    # Shutdown
    print("AdSim Lab API shutting down...")


app = FastAPI(
    title="AdSim Lab API",
    description="Advertising Simulation Platform for UAE Market Scenarios",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, tags=["Health"])
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(scenarios.router, prefix="/scenarios", tags=["Scenarios"])
app.include_router(accounts.router)
app.include_router(campaigns.router)
app.include_router(runs.router)
app.include_router(ad_groups.router)
app.include_router(keywords.router)
app.include_router(ads.router)
app.include_router(landing_pages.router)
app.include_router(coaching.router)
app.include_router(search_terms.router)
app.include_router(causal_analysis.router)
