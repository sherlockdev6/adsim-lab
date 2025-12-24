"""
Campaigns API routes.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Annotated
import uuid
from datetime import datetime, timezone

from src.core.database import get_db
from src.schemas import (
    CampaignCreate,
    CampaignUpdate,
    CampaignResponse,
    CampaignListResponse,
    CampaignStatus,
    BidStrategy,
)

router = APIRouter(tags=["Campaigns"])


def get_current_user_id() -> str:
    """Get current user ID. MVP: returns mock user."""
    return "00000000-0000-0000-0000-000000000001"


@router.get("/accounts/{account_id}/campaigns", response_model=CampaignListResponse)
async def list_campaigns(
    account_id: str,
    db: Annotated[Session, Depends(get_db)],
    user_id: str = Depends(get_current_user_id),
):
    """
    List all campaigns for a simulation account.
    """
    from src.models.tables import Campaign, SimAccount
    
    # Verify account ownership
    try:
        account_uuid = uuid.UUID(account_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid account ID format")
    
    account = db.query(SimAccount).filter(
        SimAccount.id == account_uuid,
        SimAccount.user_id == user_id,
    ).first()
    
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    campaigns = db.query(Campaign).filter(
        Campaign.sim_account_id == account_uuid
    ).order_by(Campaign.created_at.desc()).all()
    
    return CampaignListResponse(
        campaigns=[
            CampaignResponse(
                id=str(c.id),
                sim_account_id=str(c.sim_account_id),
                name=c.name,
                status=CampaignStatus(c.status.value),
                budget=c.budget,
                bid_strategy=BidStrategy(c.bid_strategy.value),
                target_cpa=c.target_cpa,
                created_at=c.created_at,
                updated_at=c.updated_at,
            )
            for c in campaigns
        ],
        count=len(campaigns),
    )


@router.post(
    "/accounts/{account_id}/campaigns",
    response_model=CampaignResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_campaign(
    account_id: str,
    data: CampaignCreate,
    db: Annotated[Session, Depends(get_db)],
    user_id: str = Depends(get_current_user_id),
):
    """
    Create a new campaign.
    """
    from src.models.tables import Campaign, SimAccount
    from src.models.tables import CampaignStatus as DBCampaignStatus
    from src.models.tables import BidStrategy as DBBidStrategy
    
    try:
        account_uuid = uuid.UUID(account_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid account ID format")
    
    account = db.query(SimAccount).filter(
        SimAccount.id == account_uuid,
        SimAccount.user_id == user_id,
    ).first()
    
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    campaign = Campaign(
        id=uuid.uuid4(),
        sim_account_id=account_uuid,
        name=data.name,
        status=DBCampaignStatus(data.status.value),
        budget=data.budget,
        bid_strategy=DBBidStrategy(data.bid_strategy.value),
        target_cpa=data.target_cpa,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    
    return CampaignResponse(
        id=str(campaign.id),
        sim_account_id=str(campaign.sim_account_id),
        name=campaign.name,
        status=CampaignStatus(campaign.status.value),
        budget=campaign.budget,
        bid_strategy=BidStrategy(campaign.bid_strategy.value),
        target_cpa=campaign.target_cpa,
        created_at=campaign.created_at,
        updated_at=campaign.updated_at,
    )


@router.get("/campaigns/{campaign_id}", response_model=CampaignResponse)
async def get_campaign(
    campaign_id: str,
    db: Annotated[Session, Depends(get_db)],
    user_id: str = Depends(get_current_user_id),
):
    """
    Get a campaign by ID.
    """
    from src.models.tables import Campaign, SimAccount
    
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
    
    return CampaignResponse(
        id=str(campaign.id),
        sim_account_id=str(campaign.sim_account_id),
        name=campaign.name,
        status=CampaignStatus(campaign.status.value),
        budget=campaign.budget,
        bid_strategy=BidStrategy(campaign.bid_strategy.value),
        target_cpa=campaign.target_cpa,
        created_at=campaign.created_at,
        updated_at=campaign.updated_at,
    )


@router.patch("/campaigns/{campaign_id}", response_model=CampaignResponse)
async def update_campaign(
    campaign_id: str,
    data: CampaignUpdate,
    db: Annotated[Session, Depends(get_db)],
    user_id: str = Depends(get_current_user_id),
):
    """
    Update a campaign.
    """
    from src.models.tables import Campaign, SimAccount
    from src.models.tables import CampaignStatus as DBCampaignStatus
    from src.models.tables import BidStrategy as DBBidStrategy
    
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
    
    if data.name is not None:
        campaign.name = data.name
    if data.budget is not None:
        campaign.budget = data.budget
    if data.bid_strategy is not None:
        campaign.bid_strategy = DBBidStrategy(data.bid_strategy.value)
    if data.target_cpa is not None:
        campaign.target_cpa = data.target_cpa
    if data.status is not None:
        campaign.status = DBCampaignStatus(data.status.value)
    
    campaign.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(campaign)
    
    return CampaignResponse(
        id=str(campaign.id),
        sim_account_id=str(campaign.sim_account_id),
        name=campaign.name,
        status=CampaignStatus(campaign.status.value),
        budget=campaign.budget,
        bid_strategy=BidStrategy(campaign.bid_strategy.value),
        target_cpa=campaign.target_cpa,
        created_at=campaign.created_at,
        updated_at=campaign.updated_at,
    )


@router.delete("/campaigns/{campaign_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_campaign(
    campaign_id: str,
    db: Annotated[Session, Depends(get_db)],
    user_id: str = Depends(get_current_user_id),
):
    """
    Delete a campaign.
    """
    from src.models.tables import Campaign, SimAccount
    
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
    
    db.delete(campaign)
    db.commit()
