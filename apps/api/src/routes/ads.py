"""
Ads API routes.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Annotated
import uuid
from datetime import datetime, timezone

from src.core.database import get_db
from src.schemas import (
    AdCreate,
    AdUpdate,
    AdResponse,
    AdListResponse,
    EntityStatus,
)

router = APIRouter(tags=["Ads"])


def get_current_user_id() -> str:
    return "00000000-0000-0000-0000-000000000001"


def calculate_ad_strength(headline1: str, headline2: str | None, headline3: str | None,
                         description1: str, description2: str | None) -> float:
    """Calculate ad strength based on completeness and content quality."""
    score = 0.3  # Base score for required fields
    
    # Bonus for optional fields
    if headline2:
        score += 0.15
    if headline3:
        score += 0.15
    if description2:
        score += 0.15
    
    # Bonus for length (good headlines are 20-30 chars)
    if 20 <= len(headline1) <= 30:
        score += 0.1
    if description1 and 50 <= len(description1) <= 90:
        score += 0.1
    
    # Bonus for including key words
    key_terms = ["buy", "best", "free", "now", "today", "save", "call", "get"]
    combined = f"{headline1} {headline2 or ''} {description1}".lower()
    if any(term in combined for term in key_terms):
        score += 0.05
    
    return min(1.0, score)


@router.get("/ad-groups/{ad_group_id}/ads", response_model=AdListResponse)
async def list_ads(
    ad_group_id: str,
    db: Annotated[Session, Depends(get_db)],
    user_id: str = Depends(get_current_user_id),
):
    """List all ads for an ad group."""
    from src.models.tables import Ad, AdGroup, Campaign, SimAccount
    
    try:
        ag_uuid = uuid.UUID(ad_group_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ad group ID format")
    
    ad_group = db.query(AdGroup).join(Campaign).join(SimAccount).filter(
        AdGroup.id == ag_uuid,
        SimAccount.user_id == user_id,
    ).first()
    
    if not ad_group:
        raise HTTPException(status_code=404, detail="Ad group not found")
    
    ads = db.query(Ad).filter(
        Ad.ad_group_id == ag_uuid
    ).order_by(Ad.created_at.desc()).all()
    
    return AdListResponse(
        ads=[
            AdResponse(
                id=str(ad.id),
                ad_group_id=str(ad.ad_group_id),
                landing_page_id=str(ad.landing_page_id) if ad.landing_page_id else None,
                headline1=ad.headline1,
                headline2=ad.headline2,
                headline3=ad.headline3,
                description1=ad.description1,
                description2=ad.description2,
                status=EntityStatus(ad.status.value),
                ad_strength=ad.ad_strength,
                created_at=ad.created_at,
                updated_at=ad.updated_at,
            )
            for ad in ads
        ],
        count=len(ads),
    )


@router.post(
    "/ad-groups/{ad_group_id}/ads",
    response_model=AdResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_ad(
    ad_group_id: str,
    data: AdCreate,
    db: Annotated[Session, Depends(get_db)],
    user_id: str = Depends(get_current_user_id),
):
    """Create a new ad."""
    from src.models.tables import Ad, AdGroup, Campaign, SimAccount
    from src.models.tables import EntityStatus as DBEntityStatus
    
    try:
        ag_uuid = uuid.UUID(ad_group_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ad group ID format")
    
    ad_group = db.query(AdGroup).join(Campaign).join(SimAccount).filter(
        AdGroup.id == ag_uuid,
        SimAccount.user_id == user_id,
    ).first()
    
    if not ad_group:
        raise HTTPException(status_code=404, detail="Ad group not found")
    
    # Calculate ad strength
    strength = calculate_ad_strength(
        data.headline1, data.headline2, data.headline3,
        data.description1, data.description2
    )
    
    landing_page_id = None
    if data.landing_page_id:
        try:
            landing_page_id = uuid.UUID(data.landing_page_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid landing page ID format")
    
    ad = Ad(
        id=uuid.uuid4(),
        ad_group_id=ag_uuid,
        landing_page_id=landing_page_id,
        headline1=data.headline1,
        headline2=data.headline2,
        headline3=data.headline3,
        description1=data.description1,
        description2=data.description2,
        status=DBEntityStatus.ACTIVE,
        ad_strength=strength,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    
    db.add(ad)
    db.commit()
    db.refresh(ad)
    
    return AdResponse(
        id=str(ad.id),
        ad_group_id=str(ad.ad_group_id),
        landing_page_id=str(ad.landing_page_id) if ad.landing_page_id else None,
        headline1=ad.headline1,
        headline2=ad.headline2,
        headline3=ad.headline3,
        description1=ad.description1,
        description2=ad.description2,
        status=EntityStatus(ad.status.value),
        ad_strength=ad.ad_strength,
        created_at=ad.created_at,
        updated_at=ad.updated_at,
    )


@router.get("/ads/{ad_id}", response_model=AdResponse)
async def get_ad(
    ad_id: str,
    db: Annotated[Session, Depends(get_db)],
    user_id: str = Depends(get_current_user_id),
):
    """Get an ad by ID."""
    from src.models.tables import Ad, AdGroup, Campaign, SimAccount
    
    try:
        ad_uuid = uuid.UUID(ad_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ad ID format")
    
    ad = db.query(Ad).join(AdGroup).join(Campaign).join(SimAccount).filter(
        Ad.id == ad_uuid,
        SimAccount.user_id == user_id,
    ).first()
    
    if not ad:
        raise HTTPException(status_code=404, detail="Ad not found")
    
    return AdResponse(
        id=str(ad.id),
        ad_group_id=str(ad.ad_group_id),
        landing_page_id=str(ad.landing_page_id) if ad.landing_page_id else None,
        headline1=ad.headline1,
        headline2=ad.headline2,
        headline3=ad.headline3,
        description1=ad.description1,
        description2=ad.description2,
        status=EntityStatus(ad.status.value),
        ad_strength=ad.ad_strength,
        created_at=ad.created_at,
        updated_at=ad.updated_at,
    )


@router.patch("/ads/{ad_id}", response_model=AdResponse)
async def update_ad(
    ad_id: str,
    data: AdUpdate,
    db: Annotated[Session, Depends(get_db)],
    user_id: str = Depends(get_current_user_id),
):
    """Update an ad."""
    from src.models.tables import Ad, AdGroup, Campaign, SimAccount
    from src.models.tables import EntityStatus as DBEntityStatus
    
    try:
        ad_uuid = uuid.UUID(ad_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ad ID format")
    
    ad = db.query(Ad).join(AdGroup).join(Campaign).join(SimAccount).filter(
        Ad.id == ad_uuid,
        SimAccount.user_id == user_id,
    ).first()
    
    if not ad:
        raise HTTPException(status_code=404, detail="Ad not found")
    
    if data.landing_page_id is not None:
        try:
            ad.landing_page_id = uuid.UUID(data.landing_page_id) if data.landing_page_id else None
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid landing page ID format")
    if data.headline1 is not None:
        ad.headline1 = data.headline1
    if data.headline2 is not None:
        ad.headline2 = data.headline2
    if data.headline3 is not None:
        ad.headline3 = data.headline3
    if data.description1 is not None:
        ad.description1 = data.description1
    if data.description2 is not None:
        ad.description2 = data.description2
    if data.status is not None:
        ad.status = DBEntityStatus(data.status.value)
    
    # Recalculate ad strength
    ad.ad_strength = calculate_ad_strength(
        ad.headline1, ad.headline2, ad.headline3,
        ad.description1, ad.description2
    )
    
    ad.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(ad)
    
    return AdResponse(
        id=str(ad.id),
        ad_group_id=str(ad.ad_group_id),
        landing_page_id=str(ad.landing_page_id) if ad.landing_page_id else None,
        headline1=ad.headline1,
        headline2=ad.headline2,
        headline3=ad.headline3,
        description1=ad.description1,
        description2=ad.description2,
        status=EntityStatus(ad.status.value),
        ad_strength=ad.ad_strength,
        created_at=ad.created_at,
        updated_at=ad.updated_at,
    )


@router.delete("/ads/{ad_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_ad(
    ad_id: str,
    db: Annotated[Session, Depends(get_db)],
    user_id: str = Depends(get_current_user_id),
):
    """Delete an ad."""
    from src.models.tables import Ad, AdGroup, Campaign, SimAccount
    
    try:
        ad_uuid = uuid.UUID(ad_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ad ID format")
    
    ad = db.query(Ad).join(AdGroup).join(Campaign).join(SimAccount).filter(
        Ad.id == ad_uuid,
        SimAccount.user_id == user_id,
    ).first()
    
    if not ad:
        raise HTTPException(status_code=404, detail="Ad not found")
    
    db.delete(ad)
    db.commit()
