"""
Landing Pages API routes.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Annotated
import uuid
from datetime import datetime, timezone

from src.core.database import get_db
from src.schemas import (
    LandingPageCreate,
    LandingPageUpdate,
    LandingPageResponse,
    LandingPageListResponse,
)

router = APIRouter(prefix="/accounts", tags=["Landing Pages"])


def get_current_user_id() -> str:
    return "00000000-0000-0000-0000-000000000001"


@router.get("/{account_id}/landing-pages", response_model=LandingPageListResponse)
async def list_landing_pages(
    account_id: str,
    db: Annotated[Session, Depends(get_db)],
    user_id: str = Depends(get_current_user_id),
):
    """List all landing pages for an account."""
    from src.models.tables import LandingPage, SimAccount
    
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
    
    pages = db.query(LandingPage).filter(
        LandingPage.sim_account_id == account_uuid
    ).order_by(LandingPage.created_at.desc()).all()
    
    return LandingPageListResponse(
        landing_pages=[
            LandingPageResponse(
                id=str(lp.id),
                sim_account_id=str(lp.sim_account_id),
                url=lp.url,
                name=lp.name,
                relevance_score=lp.relevance_score,
                load_time_ms=lp.load_time_ms,
                mobile_score=lp.mobile_score,
                created_at=lp.created_at,
                updated_at=lp.updated_at,
            )
            for lp in pages
        ],
        count=len(pages),
    )


@router.post(
    "/{account_id}/landing-pages",
    response_model=LandingPageResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_landing_page(
    account_id: str,
    data: LandingPageCreate,
    db: Annotated[Session, Depends(get_db)],
    user_id: str = Depends(get_current_user_id),
):
    """Create a new landing page."""
    from src.models.tables import LandingPage, SimAccount
    
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
    
    landing_page = LandingPage(
        id=uuid.uuid4(),
        sim_account_id=account_uuid,
        url=data.url,
        name=data.name,
        relevance_score=data.relevance_score,
        load_time_ms=data.load_time_ms,
        mobile_score=data.mobile_score,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    
    db.add(landing_page)
    db.commit()
    db.refresh(landing_page)
    
    return LandingPageResponse(
        id=str(landing_page.id),
        sim_account_id=str(landing_page.sim_account_id),
        url=landing_page.url,
        name=landing_page.name,
        relevance_score=landing_page.relevance_score,
        load_time_ms=landing_page.load_time_ms,
        mobile_score=landing_page.mobile_score,
        created_at=landing_page.created_at,
        updated_at=landing_page.updated_at,
    )


@router.get("/{account_id}/landing-pages/{page_id}", response_model=LandingPageResponse)
async def get_landing_page(
    account_id: str,
    page_id: str,
    db: Annotated[Session, Depends(get_db)],
    user_id: str = Depends(get_current_user_id),
):
    """Get a landing page by ID."""
    from src.models.tables import LandingPage, SimAccount
    
    try:
        account_uuid = uuid.UUID(account_id)
        page_uuid = uuid.UUID(page_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ID format")
    
    landing_page = db.query(LandingPage).join(SimAccount).filter(
        LandingPage.id == page_uuid,
        SimAccount.id == account_uuid,
        SimAccount.user_id == user_id,
    ).first()
    
    if not landing_page:
        raise HTTPException(status_code=404, detail="Landing page not found")
    
    return LandingPageResponse(
        id=str(landing_page.id),
        sim_account_id=str(landing_page.sim_account_id),
        url=landing_page.url,
        name=landing_page.name,
        relevance_score=landing_page.relevance_score,
        load_time_ms=landing_page.load_time_ms,
        mobile_score=landing_page.mobile_score,
        created_at=landing_page.created_at,
        updated_at=landing_page.updated_at,
    )


@router.patch("/{account_id}/landing-pages/{page_id}", response_model=LandingPageResponse)
async def update_landing_page(
    account_id: str,
    page_id: str,
    data: LandingPageUpdate,
    db: Annotated[Session, Depends(get_db)],
    user_id: str = Depends(get_current_user_id),
):
    """Update a landing page."""
    from src.models.tables import LandingPage, SimAccount
    
    try:
        account_uuid = uuid.UUID(account_id)
        page_uuid = uuid.UUID(page_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ID format")
    
    landing_page = db.query(LandingPage).join(SimAccount).filter(
        LandingPage.id == page_uuid,
        SimAccount.id == account_uuid,
        SimAccount.user_id == user_id,
    ).first()
    
    if not landing_page:
        raise HTTPException(status_code=404, detail="Landing page not found")
    
    if data.url is not None:
        landing_page.url = data.url
    if data.name is not None:
        landing_page.name = data.name
    if data.relevance_score is not None:
        landing_page.relevance_score = data.relevance_score
    if data.load_time_ms is not None:
        landing_page.load_time_ms = data.load_time_ms
    if data.mobile_score is not None:
        landing_page.mobile_score = data.mobile_score
    
    landing_page.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(landing_page)
    
    return LandingPageResponse(
        id=str(landing_page.id),
        sim_account_id=str(landing_page.sim_account_id),
        url=landing_page.url,
        name=landing_page.name,
        relevance_score=landing_page.relevance_score,
        load_time_ms=landing_page.load_time_ms,
        mobile_score=landing_page.mobile_score,
        created_at=landing_page.created_at,
        updated_at=landing_page.updated_at,
    )


@router.delete("/{account_id}/landing-pages/{page_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_landing_page(
    account_id: str,
    page_id: str,
    db: Annotated[Session, Depends(get_db)],
    user_id: str = Depends(get_current_user_id),
):
    """Delete a landing page."""
    from src.models.tables import LandingPage, SimAccount
    
    try:
        account_uuid = uuid.UUID(account_id)
        page_uuid = uuid.UUID(page_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ID format")
    
    landing_page = db.query(LandingPage).join(SimAccount).filter(
        LandingPage.id == page_uuid,
        SimAccount.id == account_uuid,
        SimAccount.user_id == user_id,
    ).first()
    
    if not landing_page:
        raise HTTPException(status_code=404, detail="Landing page not found")
    
    db.delete(landing_page)
    db.commit()
