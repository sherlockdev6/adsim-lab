"""
Keywords API routes.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Annotated
import uuid
from datetime import datetime, timezone

from src.core.database import get_db
from src.schemas import (
    KeywordCreate,
    KeywordUpdate,
    KeywordResponse,
    KeywordListResponse,
    EntityStatus,
    MatchType,
    IntentLevel,
)

router = APIRouter(tags=["Keywords"])


def get_current_user_id() -> str:
    return "00000000-0000-0000-0000-000000000001"


@router.get("/ad-groups/{ad_group_id}/keywords", response_model=KeywordListResponse)
async def list_keywords(
    ad_group_id: str,
    db: Annotated[Session, Depends(get_db)],
    user_id: str = Depends(get_current_user_id),
):
    """List all keywords for an ad group."""
    from src.models.tables import Keyword, AdGroup, Campaign, SimAccount
    
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
    
    keywords = db.query(Keyword).filter(
        Keyword.ad_group_id == ag_uuid
    ).order_by(Keyword.created_at.desc()).all()
    
    return KeywordListResponse(
        keywords=[
            KeywordResponse(
                id=str(kw.id),
                ad_group_id=str(kw.ad_group_id),
                text=kw.text,
                match_type=MatchType(kw.match_type.value),
                intent=IntentLevel(kw.intent.value) if kw.intent else None,
                bid_override=kw.bid_override,
                status=EntityStatus(kw.status.value),
                is_negative=kw.is_negative,
                quality_score=kw.quality_score,
                created_at=kw.created_at,
                updated_at=kw.updated_at,
            )
            for kw in keywords
        ],
        count=len(keywords),
    )


@router.post(
    "/ad-groups/{ad_group_id}/keywords",
    response_model=KeywordResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_keyword(
    ad_group_id: str,
    data: KeywordCreate,
    db: Annotated[Session, Depends(get_db)],
    user_id: str = Depends(get_current_user_id),
):
    """Create a new keyword."""
    from src.models.tables import Keyword, AdGroup, Campaign, SimAccount
    from src.models.tables import EntityStatus as DBEntityStatus
    from src.models.tables import MatchType as DBMatchType
    from src.models.tables import IntentLevel as DBIntentLevel
    
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
    
    keyword = Keyword(
        id=uuid.uuid4(),
        ad_group_id=ag_uuid,
        text=data.text,
        match_type=DBMatchType(data.match_type.value),
        intent=DBIntentLevel(data.intent.value) if data.intent else None,
        bid_override=data.bid_override,
        status=DBEntityStatus.ACTIVE,
        is_negative=data.is_negative,
        quality_score=0.5,  # Initial QS
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    
    db.add(keyword)
    db.commit()
    db.refresh(keyword)
    
    return KeywordResponse(
        id=str(keyword.id),
        ad_group_id=str(keyword.ad_group_id),
        text=keyword.text,
        match_type=MatchType(keyword.match_type.value),
        intent=IntentLevel(keyword.intent.value) if keyword.intent else None,
        bid_override=keyword.bid_override,
        status=EntityStatus(keyword.status.value),
        is_negative=keyword.is_negative,
        quality_score=keyword.quality_score,
        created_at=keyword.created_at,
        updated_at=keyword.updated_at,
    )


@router.get("/keywords/{keyword_id}", response_model=KeywordResponse)
async def get_keyword(
    keyword_id: str,
    db: Annotated[Session, Depends(get_db)],
    user_id: str = Depends(get_current_user_id),
):
    """Get a keyword by ID."""
    from src.models.tables import Keyword, AdGroup, Campaign, SimAccount
    
    try:
        kw_uuid = uuid.UUID(keyword_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid keyword ID format")
    
    keyword = db.query(Keyword).join(AdGroup).join(Campaign).join(SimAccount).filter(
        Keyword.id == kw_uuid,
        SimAccount.user_id == user_id,
    ).first()
    
    if not keyword:
        raise HTTPException(status_code=404, detail="Keyword not found")
    
    return KeywordResponse(
        id=str(keyword.id),
        ad_group_id=str(keyword.ad_group_id),
        text=keyword.text,
        match_type=MatchType(keyword.match_type.value),
        intent=IntentLevel(keyword.intent.value) if keyword.intent else None,
        bid_override=keyword.bid_override,
        status=EntityStatus(keyword.status.value),
        is_negative=keyword.is_negative,
        quality_score=keyword.quality_score,
        created_at=keyword.created_at,
        updated_at=keyword.updated_at,
    )


@router.patch("/keywords/{keyword_id}", response_model=KeywordResponse)
async def update_keyword(
    keyword_id: str,
    data: KeywordUpdate,
    db: Annotated[Session, Depends(get_db)],
    user_id: str = Depends(get_current_user_id),
):
    """Update a keyword."""
    from src.models.tables import Keyword, AdGroup, Campaign, SimAccount
    from src.models.tables import EntityStatus as DBEntityStatus
    from src.models.tables import MatchType as DBMatchType
    from src.models.tables import IntentLevel as DBIntentLevel
    
    try:
        kw_uuid = uuid.UUID(keyword_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid keyword ID format")
    
    keyword = db.query(Keyword).join(AdGroup).join(Campaign).join(SimAccount).filter(
        Keyword.id == kw_uuid,
        SimAccount.user_id == user_id,
    ).first()
    
    if not keyword:
        raise HTTPException(status_code=404, detail="Keyword not found")
    
    if data.match_type is not None:
        keyword.match_type = DBMatchType(data.match_type.value)
    if data.intent is not None:
        keyword.intent = DBIntentLevel(data.intent.value)
    if data.bid_override is not None:
        keyword.bid_override = data.bid_override
    if data.status is not None:
        keyword.status = DBEntityStatus(data.status.value)
    
    keyword.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(keyword)
    
    return KeywordResponse(
        id=str(keyword.id),
        ad_group_id=str(keyword.ad_group_id),
        text=keyword.text,
        match_type=MatchType(keyword.match_type.value),
        intent=IntentLevel(keyword.intent.value) if keyword.intent else None,
        bid_override=keyword.bid_override,
        status=EntityStatus(keyword.status.value),
        is_negative=keyword.is_negative,
        quality_score=keyword.quality_score,
        created_at=keyword.created_at,
        updated_at=keyword.updated_at,
    )


@router.delete("/keywords/{keyword_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_keyword(
    keyword_id: str,
    db: Annotated[Session, Depends(get_db)],
    user_id: str = Depends(get_current_user_id),
):
    """Delete a keyword."""
    from src.models.tables import Keyword, AdGroup, Campaign, SimAccount
    
    try:
        kw_uuid = uuid.UUID(keyword_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid keyword ID format")
    
    keyword = db.query(Keyword).join(AdGroup).join(Campaign).join(SimAccount).filter(
        Keyword.id == kw_uuid,
        SimAccount.user_id == user_id,
    ).first()
    
    if not keyword:
        raise HTTPException(status_code=404, detail="Keyword not found")
    
    db.delete(keyword)
    db.commit()
