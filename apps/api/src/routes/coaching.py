"""
Coaching API routes - generate recommendations based on causal logs and metrics.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Annotated
import uuid

from src.core.database import get_db

router = APIRouter(prefix="/coaching", tags=["Coaching"])


def get_current_user_id() -> str:
    return "00000000-0000-0000-0000-000000000001"


@router.get("/runs/{run_id}")
async def get_coaching_insights(
    run_id: str,
    level: str = "beginner",
    db: Annotated[Session, Depends(get_db)] = None,
    user_id: str = Depends(get_current_user_id),
):
    """
    Get coaching insights for a run based on causal logs and metrics.
    
    Args:
        run_id: UUID of the run
        level: 'beginner' or 'advanced' for detail level
    
    Returns:
        List of coaching insights with priority, explanation, and actions
    """
    from src.models.tables import Run, DailyResult, SimAccount
    
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
    
    # Get daily results
    results = db.query(DailyResult).filter(
        DailyResult.run_id == run_uuid
    ).order_by(DailyResult.day_number).all()
    
    if not results:
        return {
            "insights": [{
                "type": "info",
                "title": "No Data Yet",
                "message": "Run a simulation day to receive coaching insights.",
            }],
            "level": level,
        }
    
    # Aggregate metrics
    total_impressions = sum(r.impressions for r in results)
    total_clicks = sum(r.clicks for r in results)
    total_conversions = sum(r.conversions for r in results)
    total_cost = sum(r.cost for r in results)
    total_revenue = sum(r.revenue for r in results)
    
    avg_ctr = total_clicks / total_impressions if total_impressions > 0 else 0
    avg_cvr = total_conversions / total_clicks if total_clicks > 0 else 0
    avg_cpc = total_cost / total_clicks if total_clicks > 0 else 0
    avg_cpa = total_cost / total_conversions if total_conversions > 0 else 0
    roas = total_revenue / total_cost if total_cost > 0 else 0
    
    avg_is = sum(r.impression_share for r in results) / len(results)
    avg_lost_budget = sum(r.lost_is_budget for r in results) / len(results)
    avg_lost_rank = sum(r.lost_is_rank for r in results) / len(results)
    avg_qs = sum(r.avg_quality_score for r in results) / len(results)
    
    # Aggregate causal logs
    causal_drivers = {}
    for r in results:
        if r.causal_log:
            for driver, weight in r.causal_log.items():
                causal_drivers[driver] = causal_drivers.get(driver, 0) + weight
    
    # Normalize weights
    total_weight = sum(causal_drivers.values()) or 1
    causal_drivers = {k: v / total_weight for k, v in causal_drivers.items()}
    
    # Generate insights
    insights = []
    
    # Budget limited
    if avg_lost_budget > 0.15:
        insights.append({
            "type": "must_fix",
            "priority": 1,
            "title": "Budget Limiting Reach",
            "what": f"You're losing {avg_lost_budget * 100:.0f}% of impression share due to budget.",
            "why": "Your daily budget runs out before all searches complete." if level == "advanced" else None,
            "action": "Increase daily budget by 25-50% or reduce bids on lower-performing keywords.",
            "impact": f"Could increase impressions by up to {avg_lost_budget * 100:.0f}%",
            "driver_weight": causal_drivers.get("budget_limited", 0),
        })
    
    # Quality Score
    if avg_qs < 0.55:
        insights.append({
            "type": "must_fix",
            "priority": 2,
            "title": "Low Quality Score",
            "what": f"Average QS is {avg_qs * 10:.1f}/10, below the 5.5 threshold.",
            "why": "Low QS means higher CPCs and worse positions." if level == "advanced" else None,
            "action": "Improve ad relevance by including keywords in headlines. Check landing page speed.",
            "impact": "Each 1-point QS improvement reduces CPC by ~10-15%",
            "driver_weight": causal_drivers.get("qs_drop", 0),
        })
    
    # Lost to rank
    if avg_lost_rank > 0.25:
        insights.append({
            "type": "should_improve",
            "priority": 3,
            "title": "Losing Auctions to Competitors",
            "what": f"Losing {avg_lost_rank * 100:.0f}% of eligible auctions due to Ad Rank.",
            "why": "Competitors have higher bid × QS combinations." if level == "advanced" else None,
            "action": "Increase bids on high-value keywords or focus on QS improvements.",
            "impact": f"Could capture {avg_lost_rank * 50:.0f}% more impressions",
            "driver_weight": causal_drivers.get("competitor_bid_up", 0),
        })
    
    # Low CTR
    if avg_ctr < 0.025:
        insights.append({
            "type": "should_improve",
            "priority": 4,
            "title": "Click-Through Rate is Low",
            "what": f"CTR of {avg_ctr * 100:.2f}% is below the 2.5% benchmark.",
            "why": "Low CTR hurts QS and wastes impression share." if level == "advanced" else None,
            "action": "Test new ad copy with stronger CTAs. Highlight unique value props.",
            "impact": "Improving CTR typically improves QS by 1-2 points",
        })
    
    # Low CVR
    if avg_cvr < 0.03 and avg_ctr >= 0.02:
        insights.append({
            "type": "should_improve",
            "priority": 5,
            "title": "Low Conversion Rate",
            "what": f"CVR of {avg_cvr * 100:.2f}% means most clicks don't convert.",
            "why": "You're paying for clicks without getting leads." if level == "advanced" else None,
            "action": "Review landing page. Ensure message match with ad copy.",
            "impact": "Each 1% CVR improvement can double ROAS",
        })
    
    # Fatigue
    if causal_drivers.get("fatigue", 0) > 0.15:
        insights.append({
            "type": "should_improve",
            "priority": 6,
            "title": "Ad Fatigue Detected",
            "what": "Users are seeing your ads repeatedly, reducing effectiveness.",
            "why": "CTR naturally declines with repeated exposures." if level == "advanced" else None,
            "action": "Create new ad variations. Rotate headlines and descriptions.",
            "impact": "Fresh ads typically see 10-20% CTR improvement",
            "driver_weight": causal_drivers["fatigue"],
        })
    
    # Tracking loss
    if causal_drivers.get("tracking_loss", 0) > 0.1:
        insights.append({
            "type": "nice_to_have",
            "priority": 7,
            "title": "Tracking Discrepancy Detected",
            "what": "Some conversions may not be tracked due to cookie/attribution issues.",
            "why": "Platform reports fewer conversions than actually occurred." if level == "advanced" else None,
            "action": "Review conversion tracking setup. Consider enhanced conversions.",
            "impact": "Could be underreporting conversions by 10-20%",
            "driver_weight": causal_drivers["tracking_loss"],
        })
    
    # No issues
    if not insights:
        insights.append({
            "type": "success",
            "priority": 10,
            "title": "Campaign Performing Well",
            "what": "Key metrics are within healthy ranges.",
            "action": "Consider testing new keywords or ad variations for growth.",
            "impact": "Continuous optimization maintains competitive edge",
        })
    
    # Sort by priority
    insights.sort(key=lambda x: x["priority"])
    
    return {
        "run_id": run_id,
        "level": level,
        "metrics_summary": {
            "impressions": total_impressions,
            "clicks": total_clicks,
            "conversions": total_conversions,
            "cost": total_cost,
            "revenue": total_revenue,
            "ctr": avg_ctr,
            "cvr": avg_cvr,
            "cpc": avg_cpc,
            "cpa": avg_cpa,
            "roas": roas,
            "impression_share": avg_is,
            "lost_is_budget": avg_lost_budget,
            "lost_is_rank": avg_lost_rank,
            "avg_quality_score": avg_qs,
        },
        "causal_drivers": causal_drivers,
        "insights": insights,
    }
