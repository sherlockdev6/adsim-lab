"""
Runs API routes - simulation execution.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Annotated
import uuid
import random
from datetime import datetime, timezone

from src.core.database import get_db
from src.schemas import (
    RunCreate,
    RunResponse,
    RunListResponse,
    RunResultsResponse,
    DailyResultResponse,
    RunStatus,
)

router = APIRouter(tags=["Runs"])


def get_current_user_id() -> str:
    """Get current user ID. MVP: returns mock user."""
    return "00000000-0000-0000-0000-000000000001"


@router.get("/accounts/{account_id}/runs", response_model=RunListResponse)
async def list_runs(
    account_id: str,
    db: Annotated[Session, Depends(get_db)],
    user_id: str = Depends(get_current_user_id),
):
    """
    List all runs for a simulation account.
    """
    from src.models.tables import Run, SimAccount
    
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
    
    runs = db.query(Run).filter(
        Run.sim_account_id == account_uuid
    ).order_by(Run.created_at.desc()).all()
    
    return RunListResponse(
        runs=[
            RunResponse(
                id=str(r.id),
                sim_account_id=str(r.sim_account_id),
                scenario_id=str(r.scenario_id),
                rng_seed=r.rng_seed,
                duration_days=r.duration_days,
                current_day=r.current_day,
                status=RunStatus(r.status.value),
                started_at=r.started_at,
                completed_at=r.completed_at,
                created_at=r.created_at,
            )
            for r in runs
        ],
        count=len(runs),
    )


@router.post(
    "/accounts/{account_id}/runs",
    response_model=RunResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_run(
    account_id: str,
    data: RunCreate,
    db: Annotated[Session, Depends(get_db)],
    user_id: str = Depends(get_current_user_id),
):
    """
    Create a new simulation run.
    """
    from src.models.tables import Run, SimAccount, Scenario
    from src.models.tables import RunStatus as DBRunStatus
    
    try:
        account_uuid = uuid.UUID(account_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid account ID format")
    
    # Verify account ownership
    account = db.query(SimAccount).filter(
        SimAccount.id == account_uuid,
        SimAccount.user_id == user_id,
    ).first()
    
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    # Find scenario by slug
    scenario = db.query(Scenario).filter(
        Scenario.slug == data.scenario_slug
    ).first()
    
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    
    # Generate seed if not provided
    seed = data.seed if data.seed is not None else random.randint(0, 2147483647)
    
    run = Run(
        id=uuid.uuid4(),
        sim_account_id=account_uuid,
        scenario_id=scenario.id,
        rng_seed=seed,
        duration_days=data.duration_days,
        current_day=0,
        status=DBRunStatus.PENDING,
        created_at=datetime.now(timezone.utc),
    )
    
    db.add(run)
    db.commit()
    db.refresh(run)
    
    return RunResponse(
        id=str(run.id),
        sim_account_id=str(run.sim_account_id),
        scenario_id=str(run.scenario_id),
        rng_seed=run.rng_seed,
        duration_days=run.duration_days,
        current_day=run.current_day,
        status=RunStatus(run.status.value),
        started_at=run.started_at,
        completed_at=run.completed_at,
        created_at=run.created_at,
    )


@router.get("/runs/{run_id}", response_model=RunResponse)
async def get_run(
    run_id: str,
    db: Annotated[Session, Depends(get_db)],
    user_id: str = Depends(get_current_user_id),
):
    """
    Get a run by ID.
    """
    from src.models.tables import Run, SimAccount
    
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
    
    return RunResponse(
        id=str(run.id),
        sim_account_id=str(run.sim_account_id),
        scenario_id=str(run.scenario_id),
        rng_seed=run.rng_seed,
        duration_days=run.duration_days,
        current_day=run.current_day,
        status=RunStatus(run.status.value),
        started_at=run.started_at,
        completed_at=run.completed_at,
        created_at=run.created_at,
    )


@router.post("/runs/{run_id}/simulate-day")
async def simulate_day(
    run_id: str,
    db: Annotated[Session, Depends(get_db)],
    user_id: str = Depends(get_current_user_id),
):
    """
    Simulate the next day for a run.
    
    In production, this would dispatch a Celery task.
    For MVP, we return a placeholder response.
    """
    from src.models.tables import Run, SimAccount
    from src.models.tables import RunStatus as DBRunStatus
    
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
    
    if run.status.value == "completed":
        raise HTTPException(status_code=400, detail="Run already completed")
    
    if run.current_day >= run.duration_days:
        run.status = DBRunStatus.COMPLETED
        run.completed_at = datetime.now(timezone.utc)
        db.commit()
        return {"status": "completed", "message": "Run finished"}
    
    # For MVP: dispatch Celery task
    from src.tasks.simulation import run_simulation_day
    
    task = run_simulation_day.delay(str(run.id), run.current_day + 1)
    
    return {
        "status": "queued",
        "task_id": task.id,
        "next_day": run.current_day + 1,
        "message": f"Simulating day {run.current_day + 1}",
    }


@router.get("/runs/{run_id}/results", response_model=RunResultsResponse)
async def get_run_results(
    run_id: str,
    db: Annotated[Session, Depends(get_db)],
    user_id: str = Depends(get_current_user_id),
):
    """
    Get all results for a run.
    """
    from src.models.tables import Run, SimAccount, DailyResult
    
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
    
    results = db.query(DailyResult).filter(
        DailyResult.run_id == run_uuid
    ).order_by(DailyResult.day_number).all()
    
    daily_responses = []
    totals = {
        "impressions": 0, "clicks": 0, "conversions": 0,
        "cost": 0, "revenue": 0,
    }
    
    for r in results:
        ctr = r.clicks / r.impressions if r.impressions > 0 else 0
        cvr = r.conversions / r.clicks if r.clicks > 0 else 0
        cpc = r.cost / r.clicks if r.clicks > 0 else 0
        cpa = r.cost / r.conversions if r.conversions > 0 else 0
        roas = r.revenue / r.cost if r.cost > 0 else 0
        
        daily_responses.append(DailyResultResponse(
            day_number=r.day_number,
            impressions=r.impressions,
            clicks=r.clicks,
            conversions=r.conversions,
            cost=r.cost,
            revenue=r.revenue,
            avg_position=r.avg_position,
            avg_quality_score=r.avg_quality_score,
            impression_share=r.impression_share,
            lost_is_budget=r.lost_is_budget,
            lost_is_rank=r.lost_is_rank,
            ctr=ctr,
            cvr=cvr,
            cpc=cpc,
            cpa=cpa,
            roas=roas,
        ))
        
        totals["impressions"] += r.impressions
        totals["clicks"] += r.clicks
        totals["conversions"] += r.conversions
        totals["cost"] += r.cost
        totals["revenue"] += r.revenue
    
    # Calculate totals
    totals_response = None
    if results:
        totals_response = DailyResultResponse(
            day_number=0,
            impressions=totals["impressions"],
            clicks=totals["clicks"],
            conversions=totals["conversions"],
            cost=totals["cost"],
            revenue=totals["revenue"],
            avg_position=sum(r.avg_position for r in results) / len(results),
            avg_quality_score=sum(r.avg_quality_score for r in results) / len(results),
            impression_share=sum(r.impression_share for r in results) / len(results),
            lost_is_budget=sum(r.lost_is_budget for r in results) / len(results),
            lost_is_rank=sum(r.lost_is_rank for r in results) / len(results),
            ctr=totals["clicks"] / totals["impressions"] if totals["impressions"] > 0 else 0,
            cvr=totals["conversions"] / totals["clicks"] if totals["clicks"] > 0 else 0,
            cpc=totals["cost"] / totals["clicks"] if totals["clicks"] > 0 else 0,
            cpa=totals["cost"] / totals["conversions"] if totals["conversions"] > 0 else 0,
            roas=totals["revenue"] / totals["cost"] if totals["cost"] > 0 else 0,
        )
    
    return RunResultsResponse(
        run_id=str(run.id),
        status=RunStatus(run.status.value),
        current_day=run.current_day,
        duration_days=run.duration_days,
        daily_results=daily_responses,
        totals=totals_response,
    )
