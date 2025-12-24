"""
Sim Accounts API routes.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Annotated
import uuid
from datetime import datetime, timezone

from src.core.database import get_db
from src.schemas import (
    SimAccountCreate,
    SimAccountUpdate,
    SimAccountResponse,
    SimAccountListResponse,
)

router = APIRouter(prefix="/accounts", tags=["Sim Accounts"])


# Mock user ID for MVP (in production, get from JWT)
def get_current_user_id() -> str:
    """Get current user ID. MVP: returns mock user."""
    return "00000000-0000-0000-0000-000000000001"


@router.get("", response_model=SimAccountListResponse)
async def list_accounts(
    db: Annotated[Session, Depends(get_db)],
    user_id: str = Depends(get_current_user_id),
):
    """
    List all simulation accounts for the current user.
    """
    from src.models.tables import SimAccount
    
    accounts = db.query(SimAccount).filter(
        SimAccount.user_id == user_id
    ).order_by(SimAccount.created_at.desc()).all()
    
    return SimAccountListResponse(
        accounts=[
            SimAccountResponse(
                id=str(acc.id),
                name=acc.name,
                daily_budget=acc.daily_budget,
                currency=acc.currency,
                created_at=acc.created_at,
                updated_at=acc.updated_at,
            )
            for acc in accounts
        ],
        count=len(accounts),
    )


@router.post("", response_model=SimAccountResponse, status_code=status.HTTP_201_CREATED)
async def create_account(
    data: SimAccountCreate,
    db: Annotated[Session, Depends(get_db)],
    user_id: str = Depends(get_current_user_id),
):
    """
    Create a new simulation account.
    """
    from src.models.tables import SimAccount, User
    
    # Ensure user exists (create if not for MVP)
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        user = User(
            id=uuid.UUID(user_id),
            email="mock@example.com",
            name="Mock User",
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        db.add(user)
        db.commit()
    
    account = SimAccount(
        id=uuid.uuid4(),
        user_id=user_id,
        name=data.name,
        daily_budget=data.daily_budget,
        currency=data.currency,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    
    db.add(account)
    db.commit()
    db.refresh(account)
    
    return SimAccountResponse(
        id=str(account.id),
        name=account.name,
        daily_budget=account.daily_budget,
        currency=account.currency,
        created_at=account.created_at,
        updated_at=account.updated_at,
    )


@router.get("/{account_id}", response_model=SimAccountResponse)
async def get_account(
    account_id: str,
    db: Annotated[Session, Depends(get_db)],
    user_id: str = Depends(get_current_user_id),
):
    """
    Get a simulation account by ID.
    """
    from src.models.tables import SimAccount
    
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
    
    return SimAccountResponse(
        id=str(account.id),
        name=account.name,
        daily_budget=account.daily_budget,
        currency=account.currency,
        created_at=account.created_at,
        updated_at=account.updated_at,
    )


@router.patch("/{account_id}", response_model=SimAccountResponse)
async def update_account(
    account_id: str,
    data: SimAccountUpdate,
    db: Annotated[Session, Depends(get_db)],
    user_id: str = Depends(get_current_user_id),
):
    """
    Update a simulation account.
    """
    from src.models.tables import SimAccount
    
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
    
    if data.name is not None:
        account.name = data.name
    if data.daily_budget is not None:
        account.daily_budget = data.daily_budget
    
    account.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(account)
    
    return SimAccountResponse(
        id=str(account.id),
        name=account.name,
        daily_budget=account.daily_budget,
        currency=account.currency,
        created_at=account.created_at,
        updated_at=account.updated_at,
    )


@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(
    account_id: str,
    db: Annotated[Session, Depends(get_db)],
    user_id: str = Depends(get_current_user_id),
):
    """
    Delete a simulation account.
    """
    from src.models.tables import SimAccount
    
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
    
    db.delete(account)
    db.commit()
