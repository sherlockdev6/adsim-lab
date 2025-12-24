"""
Ad Groups API routes.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Annotated
import uuid
from datetime import datetime, timezone

from src.core.database import get_db
from src.schemas import (
    AdGroupCreate,
    AdGroupUpdate,
    AdGroupResponse,
    AdGroupListResponse,
    EntityStatus,
)

router = APIRouter(tags=["Ad Groups"])


def get_current_user_id() -> str:
    return "00000000-0000-0000-0000-000000000001"


@router.get("/campaigns/{campaign_id}/ad-groups", response_model=AdGroupListResponse)
async def list_ad_groups(
    campaign_id: str,
    db: Annotated[Session, Depends(get_db)],
    user_id: str = Depends(get_current_user_id),
):
    """List all ad groups for a campaign."""
    from src.models.tables import AdGroup, Campaign, SimAccount
    
    try:
        campaign_uuid = uuid.UUID(campaign_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid campaign ID format")
    
    campaign = db.query(Campaign).join(SimAccount).filter(
        Campaign.id == campaign_uuid,
        SimAccount.user_id == user_id,
    ).first()
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    ad_groups = db.query(AdGroup).filter(
        AdGroup.campaign_id == campaign_uuid
    ).order_by(AdGroup.created_at.desc()).all()
    
    return AdGroupListResponse(
        ad_groups=[
            AdGroupResponse(
                id=str(ag.id),
                campaign_id=str(ag.campaign_id),
                name=ag.name,
                status=EntityStatus(ag.status.value),
                default_bid=ag.default_bid,
                created_at=ag.created_at,
                updated_at=ag.updated_at,
            )
            for ag in ad_groups
        ],
        count=len(ad_groups),
    )


@router.post(
    "/campaigns/{campaign_id}/ad-groups",
    response_model=AdGroupResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_ad_group(
    campaign_id: str,
    data: AdGroupCreate,
    db: Annotated[Session, Depends(get_db)],
    user_id: str = Depends(get_current_user_id),
):
    """Create a new ad group."""
    from src.models.tables import AdGroup, Campaign, SimAccount
    from src.models.tables import EntityStatus as DBEntityStatus
    
    try:
        campaign_uuid = uuid.UUID(campaign_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid campaign ID format")
    
    campaign = db.query(Campaign).join(SimAccount).filter(
        Campaign.id == campaign_uuid,
        SimAccount.user_id == user_id,
    ).first()
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    ad_group = AdGroup(
        id=uuid.uuid4(),
        campaign_id=campaign_uuid,
        name=data.name,
        status=DBEntityStatus(data.status.value),
        default_bid=data.default_bid,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    
    db.add(ad_group)
    db.commit()
    db.refresh(ad_group)
    
    return AdGroupResponse(
        id=str(ad_group.id),
        campaign_id=str(ad_group.campaign_id),
        name=ad_group.name,
        status=EntityStatus(ad_group.status.value),
        default_bid=ad_group.default_bid,
        created_at=ad_group.created_at,
        updated_at=ad_group.updated_at,
    )


@router.get("/ad-groups/{ad_group_id}", response_model=AdGroupResponse)
async def get_ad_group(
    ad_group_id: str,
    db: Annotated[Session, Depends(get_db)],
    user_id: str = Depends(get_current_user_id),
):
    """Get an ad group by ID."""
    from src.models.tables import AdGroup, Campaign, SimAccount
    
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
    
    return AdGroupResponse(
        id=str(ad_group.id),
        campaign_id=str(ad_group.campaign_id),
        name=ad_group.name,
        status=EntityStatus(ad_group.status.value),
        default_bid=ad_group.default_bid,
        created_at=ad_group.created_at,
        updated_at=ad_group.updated_at,
    )


@router.patch("/ad-groups/{ad_group_id}", response_model=AdGroupResponse)
async def update_ad_group(
    ad_group_id: str,
    data: AdGroupUpdate,
    db: Annotated[Session, Depends(get_db)],
    user_id: str = Depends(get_current_user_id),
):
    """Update an ad group."""
    from src.models.tables import AdGroup, Campaign, SimAccount
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
    
    if data.name is not None:
        ad_group.name = data.name
    if data.default_bid is not None:
        ad_group.default_bid = data.default_bid
    if data.status is not None:
        ad_group.status = DBEntityStatus(data.status.value)
    
    ad_group.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(ad_group)
    
    return AdGroupResponse(
        id=str(ad_group.id),
        campaign_id=str(ad_group.campaign_id),
        name=ad_group.name,
        status=EntityStatus(ad_group.status.value),
        default_bid=ad_group.default_bid,
        created_at=ad_group.created_at,
        updated_at=ad_group.updated_at,
    )


@router.delete("/ad-groups/{ad_group_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_ad_group(
    ad_group_id: str,
    db: Annotated[Session, Depends(get_db)],
    user_id: str = Depends(get_current_user_id),
):
    """Delete an ad group."""
    from src.models.tables import AdGroup, Campaign, SimAccount
    
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
    
    db.delete(ad_group)
    db.commit()
