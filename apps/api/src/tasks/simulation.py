"""
Celery tasks for simulation execution.

These tasks are executed asynchronously by the worker.
"""
import logging
from datetime import datetime, timezone
from celery import shared_task
from sqlalchemy.orm import Session
import json

from src.worker import celery_app
from src.core.database import SessionLocal


logger = logging.getLogger(__name__)


def get_db_session() -> Session:
    """Get a database session for use in tasks."""
    return SessionLocal()


@celery_app.task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    autoretry_for=(Exception,),
    acks_late=True,
)
def run_simulation_day(self, run_id: str, day_number: int):
    """
    Simulate a single day for a run.
    
    This is the main simulation task. It:
    1. Loads the run and account state from DB
    2. Runs the simulation engine for one day
    3. Stores results back to DB
    4. Updates run status
    
    Args:
        run_id: UUID of the run
        day_number: Day number to simulate (1-indexed)
    
    Returns:
        Dict with status and metrics
    """
    import uuid
    from src.models.tables import (
        Run, SimAccount, Campaign, AdGroup, Keyword, Ad, LandingPage,
        Scenario, DailyResult, RunStatus as DBRunStatus,
    )
    
    logger.info(f"Starting simulation for run {run_id}, day {day_number}")
    
    db = get_db_session()
    
    try:
        run_uuid = uuid.UUID(run_id)
        
        # Load run
        run = db.query(Run).filter(Run.id == run_uuid).first()
        if not run:
            logger.error(f"Run {run_id} not found")
            return {"status": "error", "message": "Run not found"}
        
        # Idempotency check: skip if already simulated
        existing_result = db.query(DailyResult).filter(
            DailyResult.run_id == run_uuid,
            DailyResult.day_number == day_number,
        ).first()
        
        if existing_result:
            logger.info(f"Day {day_number} already simulated for run {run_id}")
            return {"status": "skipped", "message": "Day already simulated"}
        
        # Update run status to running
        if run.status != DBRunStatus.RUNNING:
            run.status = DBRunStatus.RUNNING
            run.started_at = run.started_at or datetime.now(timezone.utc)
            db.commit()
        
        # Load scenario config
        scenario = db.query(Scenario).filter(Scenario.id == run.scenario_id).first()
        scenario_config = {
            "demand_config": scenario.demand_config if scenario else {},
            "ctr_cvr_config": scenario.ctr_cvr_config if scenario else {},
            "fraud_rate": scenario.fraud_rate if scenario else 0.0,
            "tracking_loss_rate": scenario.tracking_loss_rate if scenario else 0.0,
            "seasonality": scenario.seasonality if scenario else {},
            "event_shocks": scenario.event_shocks if scenario else [],
        }
        
        # Load account structure
        account = db.query(SimAccount).filter(SimAccount.id == run.sim_account_id).first()
        
        # Import simulation engine
        from adsim.engine import simulate_day as engine_simulate_day
        from adsim.rng import create_day_rng
        from adsim.state import (
            SimState, Advertiser, Campaign as SimCampaign,
            AdGroup as SimAdGroup, Keyword as SimKeyword, Ad as SimAd,
            LandingPage as SimLandingPage, CampaignStatus, EntityStatus,
            MatchType as SimMatchType, IntentLevel,
        )
        
        # Build simulation state from DB
        campaigns = db.query(Campaign).filter(Campaign.sim_account_id == run.sim_account_id).all()
        landing_pages_db = db.query(LandingPage).filter(LandingPage.sim_account_id == run.sim_account_id).all()
        
        sim_campaigns = []
        for camp in campaigns:
            ad_groups_db = db.query(AdGroup).filter(AdGroup.campaign_id == camp.id).all()
            sim_ad_groups = []
            
            for ag in ad_groups_db:
                keywords_db = db.query(Keyword).filter(Keyword.ad_group_id == ag.id).all()
                ads_db = db.query(Ad).filter(Ad.ad_group_id == ag.id).all()
                
                sim_keywords = [
                    SimKeyword(
                        id=str(kw.id),
                        ad_group_id=str(kw.ad_group_id),
                        text=kw.text,
                        match_type=SimMatchType(kw.match_type.value),
                        intent=IntentLevel(kw.intent.value) if kw.intent else None,
                        bid_override=kw.bid_override,
                        status=EntityStatus(kw.status.value),
                        is_negative=kw.is_negative,
                        quality_score=kw.quality_score or 0.5,
                    )
                    for kw in keywords_db
                ]
                
                sim_ads = [
                    SimAd(
                        id=str(ad.id),
                        ad_group_id=str(ad.ad_group_id),
                        landing_page_id=str(ad.landing_page_id) if ad.landing_page_id else None,
                        headline1=ad.headline1,
                        headline2=ad.headline2 or "",
                        headline3=ad.headline3 or "",
                        description1=ad.description1 or "",
                        description2=ad.description2 or "",
                        status=EntityStatus(ad.status.value),
                        ad_strength=ad.ad_strength,
                    )
                    for ad in ads_db
                ]
                
                sim_ad_groups.append(SimAdGroup(
                    id=str(ag.id),
                    campaign_id=str(ag.campaign_id),
                    name=ag.name,
                    status=EntityStatus(ag.status.value),
                    default_bid=ag.default_bid,
                    keywords=sim_keywords,
                    ads=sim_ads,
                ))
            
            sim_campaigns.append(SimCampaign(
                id=str(camp.id),
                name=camp.name,
                status=CampaignStatus(camp.status.value),
                budget=camp.budget,
                bid_strategy=camp.bid_strategy.value,
                target_cpa=camp.target_cpa,
                ad_groups=sim_ad_groups,
            ))
        
        sim_landing_pages = [
            SimLandingPage(
                id=str(lp.id),
                url=lp.url,
                name=lp.name,
                relevance_score=lp.relevance_score,
                load_time_ms=lp.load_time_ms,
                mobile_score=lp.mobile_score,
            )
            for lp in landing_pages_db
        ]
        
        # Create user advertiser
        user_adv = Advertiser(
            id=str(account.id),
            name=account.name,
            is_user=True,
            daily_budget=account.daily_budget,
            campaigns=sim_campaigns,
            landing_pages=sim_landing_pages,
        )
        
        # Create competitor advertisers (simplified)
        competitor_mix = scenario_config.get("competitor_mix", scenario.competitor_mix if scenario else {})
        competitors = []
        for archetype, share in competitor_mix.items():
            bid_mult = 1.2 if archetype == "aggressive" else 0.7 if archetype == "defensive" else 1.0
            competitors.append(Advertiser(
                id=f"comp_{archetype}",
                name=f"Competitor ({archetype})",
                is_user=False,
                daily_budget=account.daily_budget * share * 3,
                archetype=archetype,
                bid_multiplier=bid_mult,
                base_quality_score=0.6 if archetype == "aggressive" else 0.5,
                campaigns=[
                    SimCampaign(
                        id=f"comp_{archetype}_camp",
                        name=f"{archetype} Campaign",
                        status=CampaignStatus.ACTIVE,
                        budget=account.daily_budget * share,
                        ad_groups=[
                            SimAdGroup(
                                id=f"comp_{archetype}_ag",
                                campaign_id=f"comp_{archetype}_camp",
                                name=f"{archetype} AG",
                                default_bid=2.0 * bid_mult,
                                keywords=[
                                    SimKeyword(
                                        id=f"comp_{archetype}_kw",
                                        ad_group_id=f"comp_{archetype}_ag",
                                        text="property dubai",
                                        match_type=SimMatchType.BROAD,
                                    ),
                                ],
                                ads=[
                                    SimAd(
                                        id=f"comp_{archetype}_ad",
                                        ad_group_id=f"comp_{archetype}_ag",
                                        landing_page_id=None,
                                        headline1="Competitor Ad",
                                        description1="Best deals",
                                    ),
                                ],
                            ),
                        ],
                    ),
                ],
            ))
        
        # Build state
        state = SimState(
            advertisers=[user_adv] + competitors,
            scenario_slug=scenario.slug if scenario else "",
            scenario_config=scenario_config,
            current_day=day_number - 1,
        )
        
        # Create RNG for this day
        day_rng = create_day_rng(run.rng_seed, day_number)
        
        # Run simulation
        new_state, metrics, causal_logs = engine_simulate_day(
            state=state,
            actions=[],
            day=day_number,
            rng=day_rng,
        )
        
        # Store results
        daily_result = DailyResult(
            id=uuid.uuid4(),
            run_id=run_uuid,
            day_number=day_number,
            impressions=metrics.impressions,
            clicks=metrics.clicks,
            conversions=metrics.conversions,
            cost=metrics.cost,
            revenue=metrics.revenue,
            avg_position=metrics.avg_position,
            avg_quality_score=metrics.avg_quality_score,
            impression_share=metrics.impression_share,
            lost_is_budget=metrics.lost_is_budget,
            lost_is_rank=metrics.lost_is_rank,
            fraud_clicks=metrics.fraud_clicks,
            tracking_lost_conversions=metrics.tracking_lost_conversions,
            causal_log=metrics.causal_log.drivers if metrics.causal_log else {},
            created_at=datetime.now(timezone.utc),
        )
        
        db.add(daily_result)
        
        # Update run progress
        run.current_day = day_number
        if day_number >= run.duration_days:
            run.status = DBRunStatus.COMPLETED
            run.completed_at = datetime.now(timezone.utc)
        
        db.commit()
        
        logger.info(f"Completed day {day_number} for run {run_id}: {metrics.impressions} impr, {metrics.clicks} clicks, ${metrics.cost:.2f} cost")
        
        return {
            "status": "success",
            "day": day_number,
            "impressions": metrics.impressions,
            "clicks": metrics.clicks,
            "conversions": metrics.conversions,
            "cost": metrics.cost,
        }
        
    except Exception as e:
        logger.exception(f"Error simulating day {day_number} for run {run_id}: {e}")
        db.rollback()
        raise
    finally:
        db.close()


@celery_app.task(bind=True)
def run_simulation_days(self, run_id: str, start_day: int, end_day: int):
    """
    Simulate multiple days for a run.
    
    Chains individual day simulations sequentially.
    
    Args:
        run_id: UUID of the run
        start_day: Starting day (inclusive)
        end_day: Ending day (inclusive)
    
    Returns:
        List of results for each day
    """
    results = []
    
    for day in range(start_day, end_day + 1):
        result = run_simulation_day.delay(run_id, day)
        results.append({
            "day": day,
            "task_id": result.id,
        })
    
    return {
        "status": "queued",
        "days_queued": len(results),
        "tasks": results,
    }
