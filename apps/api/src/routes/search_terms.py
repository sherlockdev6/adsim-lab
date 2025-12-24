"""
Search Terms Report API routes.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Annotated
import uuid

from src.core.database import get_db

router = APIRouter(prefix="/runs", tags=["Search Terms"])


def get_current_user_id() -> str:
    return "00000000-0000-0000-0000-000000000001"


@router.get("/{run_id}/search-terms")
async def get_search_terms_report(
    run_id: str,
    limit: int = 100,
    match_type: str = None,
    db: Annotated[Session, Depends(get_db)] = None,
    user_id: str = Depends(get_current_user_id),
):
    """
    Get search terms report for a run.
    
    Args:
        run_id: UUID of the run
        limit: Maximum number of terms to return
        match_type: Filter by match type (exact, phrase, broad)
    
    Returns:
        List of search terms with performance metrics
    """
    from src.models.tables import Run, SearchTermsReport, SimAccount
    
    try:
        run_uuid = uuid.UUID(run_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid run ID format")
    
    run = db.query(Run).join(SimAccount).filter(
        Run.id == run_uuid,
        SimAccount.user_id == user_id,
    ).first()
    
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    
    # Query search terms
    query = db.query(SearchTermsReport).filter(
        SearchTermsReport.run_id == run_uuid
    )
    
    if match_type:
        query = query.filter(SearchTermsReport.match_type == match_type)
    
    terms = query.order_by(SearchTermsReport.impressions.desc()).limit(limit).all()
    
    # If no terms in DB, generate placeholder data (MVP)
    if not terms:
        return generate_mock_search_terms(run_uuid, limit)
    
    return {
        "run_id": run_id,
        "count": len(terms),
        "search_terms": [
            {
                "id": str(t.id),
                "query_text": t.query_text,
                "matched_keyword_id": str(t.matched_keyword_id) if t.matched_keyword_id else None,
                "match_type": t.match_type,
                "impressions": t.impressions,
                "clicks": t.clicks,
                "conversions": t.conversions,
                "cost": t.cost,
                "ctr": t.clicks / t.impressions if t.impressions > 0 else 0,
                "cvr": t.conversions / t.clicks if t.clicks > 0 else 0,
            }
            for t in terms
        ],
    }


def generate_mock_search_terms(run_uuid: uuid.UUID, limit: int = 100):
    """Generate mock search terms for MVP demonstration."""
    import random
    
    # Seed with run UUID for determinism
    seed = int(str(run_uuid).replace("-", "")[:8], 16)
    rng = random.Random(seed)
    
    query_templates = [
        "buy {property_type} {location}",
        "{property_type} for sale {location}",
        "{location} {property_type} price",
        "luxury {property_type} {location}",
        "cheap {property_type} {location}",
        "{property_type} investment {location}",
        "rent {property_type} {location}",
        "new {property_type} {location}",
        "{property_type} {location} 2024",
        "best {property_type} {location}",
    ]
    
    property_types = ["villa", "apartment", "townhouse", "penthouse", "studio", "property"]
    locations = ["dubai", "dubai marina", "downtown dubai", "palm jumeirah", "abu dhabi", "sharjah", "uae"]
    
    terms = []
    for i in range(min(limit, 50)):
        template = rng.choice(query_templates)
        query = template.format(
            property_type=rng.choice(property_types),
            location=rng.choice(locations),
        )
        
        impr = int(50 + rng.random() * 500)
        ctr = 0.02 + rng.random() * 0.08
        clicks = int(impr * ctr)
        cvr = 0.03 + rng.random() * 0.12
        convs = int(clicks * cvr)
        cpc = 3 + rng.random() * 12
        cost = clicks * cpc
        
        terms.append({
            "id": f"mock_{i}",
            "query_text": query,
            "matched_keyword_id": None,
            "match_type": rng.choice(["exact", "phrase", "broad", "broad", "broad"]),
            "impressions": impr,
            "clicks": clicks,
            "conversions": convs,
            "cost": round(cost, 2),
            "ctr": round(ctr, 4),
            "cvr": round(cvr if clicks > 0 else 0, 4),
        })
    
    # Sort by impressions
    terms.sort(key=lambda x: x["impressions"], reverse=True)
    
    return {
        "run_id": str(run_uuid),
        "count": len(terms),
        "is_mock": True,
        "search_terms": terms,
    }
