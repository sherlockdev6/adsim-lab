"""
Scenarios endpoints.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Any
import json
from pathlib import Path

router = APIRouter()


class ScenarioSummary(BaseModel):
    """Scenario summary for list view."""
    slug: str
    name: str
    market: str
    description: str


class ScenarioDetail(BaseModel):
    """Full scenario details."""
    slug: str
    name: str
    market: str
    description: str
    demand_config: dict[str, Any]
    ctr_cvr_config: dict[str, Any]
    cpc_anchors: dict[str, Any]
    tracking_loss_rate: float
    fraud_rate: float
    seasonality: dict[str, Any]
    event_shocks: list[dict[str, Any]]
    competitor_mix: dict[str, float]


class ScenariosListResponse(BaseModel):
    """Response for scenarios list."""
    scenarios: list[ScenarioSummary]
    count: int


def load_scenarios() -> list[dict]:
    """Load scenarios from seed JSON files."""
    seed_dir = Path(__file__).parent.parent.parent / "seed"
    scenarios = []
    
    for json_file in seed_dir.glob("*.json"):
        try:
            with open(json_file, "r") as f:
                scenario = json.load(f)
                scenarios.append(scenario)
        except (json.JSONDecodeError, IOError):
            continue
    
    return scenarios


def get_scenario_by_slug(slug: str) -> dict | None:
    """Get a specific scenario by slug."""
    scenarios = load_scenarios()
    for scenario in scenarios:
        if scenario.get("slug") == slug:
            return scenario
    return None


@router.get("", response_model=ScenariosListResponse)
async def list_scenarios() -> ScenariosListResponse:
    """
    List all available scenarios.
    
    Returns summary information for each scenario.
    """
    scenarios = load_scenarios()
    
    summaries = [
        ScenarioSummary(
            slug=s.get("slug", ""),
            name=s.get("name", ""),
            market=s.get("market", ""),
            description=s.get("description", ""),
        )
        for s in scenarios
    ]
    
    return ScenariosListResponse(
        scenarios=summaries,
        count=len(summaries),
    )


@router.get("/{slug}", response_model=ScenarioDetail)
async def get_scenario(slug: str) -> ScenarioDetail:
    """
    Get detailed scenario information by slug.
    """
    scenario = get_scenario_by_slug(slug)
    
    if not scenario:
        raise HTTPException(
            status_code=404,
            detail=f"Scenario '{slug}' not found",
        )
    
    return ScenarioDetail(
        slug=scenario.get("slug", ""),
        name=scenario.get("name", ""),
        market=scenario.get("market", ""),
        description=scenario.get("description", ""),
        demand_config=scenario.get("demand_config", {}),
        ctr_cvr_config=scenario.get("ctr_cvr_config", {}),
        cpc_anchors=scenario.get("cpc_anchors", {}),
        tracking_loss_rate=scenario.get("tracking_loss_rate", 0.0),
        fraud_rate=scenario.get("fraud_rate", 0.0),
        seasonality=scenario.get("seasonality", {}),
        event_shocks=scenario.get("event_shocks", []),
        competitor_mix=scenario.get("competitor_mix", {}),
    )
