"""
Causal Analysis API routes - explains WHY metrics changed.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Annotated
import uuid

from src.core.database import get_db

router = APIRouter(prefix="/runs", tags=["Causal Analysis"])


def get_current_user_id() -> str:
    return "00000000-0000-0000-0000-000000000001"


# Cause definitions with explanation templates
CAUSE_DEFINITIONS = {
    "competitor_bid_increase": {
        "label": "Competitor Bid Increase",
        "explanation": "A competitor raised their bids, increasing auction pressure.",
        "explanation_advanced": "Competitor '{competitor}' increased max CPC by {change}%. This raised auction pressure across {keywords} overlapping keywords.",
    },
    "quality_score_decrease": {
        "label": "Quality Score Dropped",
        "explanation": "Your Quality Score decreased, raising your cost per click.",
        "explanation_advanced": "Avg QS dropped from {prev} to {curr} due to {reason}.",
    },
    "quality_score_increase": {
        "label": "Quality Score Improved",
        "explanation": "Your Quality Score increased, lowering your cost per click.",
        "explanation_advanced": "Avg QS improved from {prev} to {curr} due to better ad relevance.",
    },
    "low_intent_query_share": {
        "label": "More Low-Intent Queries",
        "explanation": "Broad match triggered on more general searches.",
        "explanation_advanced": "Broad match keywords matched {percent}% more low-intent queries.",
    },
    "high_intent_query_share": {
        "label": "More High-Intent Queries",
        "explanation": "Your keywords matched more purchase-ready searches.",
        "explanation_advanced": "High-intent query share increased by {percent}%.",
    },
    "ad_fatigue": {
        "label": "Ad Fatigue",
        "explanation": "Users saw your ads too many times, reducing engagement.",
        "explanation_advanced": "Avg frequency reached {freq} impressions per user. CTR typically drops {drop}% after 3+ exposures.",
    },
    "ad_fatigue_recovery": {
        "label": "Fresh Ad Engagement",
        "explanation": "Users responded better to ads they hadn't seen recently.",
        "explanation_advanced": "Avg frequency dropped to {freq}, improving CTR by {gain}%.",
    },
    "position_decrease": {
        "label": "Lower Ad Position",
        "explanation": "Your ads appeared lower on the page, reducing visibility.",
        "explanation_advanced": "Avg position dropped from {prev} to {curr} due to competitive pressure.",
    },
    "position_increase": {
        "label": "Higher Ad Position",
        "explanation": "Your ads appeared higher on the page, improving visibility.",
        "explanation_advanced": "Avg position improved from {prev} to {curr}.",
    },
    "budget_limited": {
        "label": "Budget Ran Out Early",
        "explanation": "Your daily budget was exhausted before peak hours ended.",
        "explanation_advanced": "Budget exhausted by {time}, missing {percent}% of daily searches.",
    },
    "budget_increased": {
        "label": "More Budget Available",
        "explanation": "Higher budget allowed capturing more impressions.",
        "explanation_advanced": "Budget lasted until {time}, capturing {percent}% more searches.",
    },
    "landing_page_slow": {
        "label": "Landing Page Slow",
        "explanation": "Your landing page took longer to load, hurting conversions.",
        "explanation_advanced": "Load time increased from {prev}s to {curr}s, reducing CVR by {drop}%.",
    },
    "landing_page_fast": {
        "label": "Faster Landing Page",
        "explanation": "Improved page speed boosted conversion rates.",
        "explanation_advanced": "Load time improved from {prev}s to {curr}s.",
    },
    "mobile_share_increase": {
        "label": "More Mobile Traffic",
        "explanation": "Higher share of mobile users changed performance patterns.",
        "explanation_advanced": "Mobile traffic share increased to {percent}%.",
    },
    "time_of_day_shift": {
        "label": "Traffic Timing Shift",
        "explanation": "Traffic patterns shifted to different hours of the day.",
        "explanation_advanced": "Peak traffic shifted from {prev_time} to {curr_time}.",
    },
    "tracking_loss": {
        "label": "Tracking Discrepancy",
        "explanation": "Some conversions may not have been tracked properly.",
        "explanation_advanced": "Estimated {percent}% tracking loss due to cookie/attribution issues.",
    },
    "seasonal_trend": {
        "label": "Seasonal Pattern",
        "explanation": "Normal market fluctuations for this time period.",
        "explanation_advanced": "Historical data shows {percent}% typical variation for this day of week.",
    },
}


def generate_drivers_from_causal_log(
    causal_log: dict,
    metric: str,
    prev_value: float,
    curr_value: float,
) -> list:
    """Generate driver explanations from causal log data."""
    drivers = []
    
    if not causal_log:
        return drivers
    
    # Map causal log keys to causes
    cause_mappings = {
        "competitor_bid_up": ("competitor_bid_increase", 1),
        "qs_drop": ("quality_score_decrease", 1),
        "qs_increase": ("quality_score_increase", 1),
        "fatigue": ("ad_fatigue", 1),
        "fatigue_recovery": ("ad_fatigue_recovery", 1),
        "budget_limited": ("budget_limited", 1),
        "budget_ok": ("budget_increased", 1),
        "position_drop": ("position_decrease", 1),
        "position_gain": ("position_increase", 1),
        "low_intent_share": ("low_intent_query_share", 1),
        "high_intent_share": ("high_intent_query_share", 1),
        "landing_slow": ("landing_page_slow", 1),
        "landing_fast": ("landing_page_fast", 1),
        "mobile_up": ("mobile_share_increase", 1),
        "time_shift": ("time_of_day_shift", 1),
        "tracking_loss": ("tracking_loss", 1),
        "seasonal": ("seasonal_trend", 1),
    }
    
    # Collect relevant causes with their weights
    relevant_causes = []
    for log_key, weight in causal_log.items():
        if log_key in cause_mappings and weight > 0.05:  # 5% threshold
            cause_id, multiplier = cause_mappings[log_key]
            relevant_causes.append({
                "cause_id": cause_id,
                "weight": weight * multiplier,
                "log_key": log_key,
            })
    
    # Sort by weight and take top 3
    relevant_causes.sort(key=lambda x: x["weight"], reverse=True)
    top_causes = relevant_causes[:3]
    
    # Normalize weights to 100%
    total_weight = sum(c["weight"] for c in top_causes) or 1
    
    for cause in top_causes:
        cause_id = cause["cause_id"]
        definition = CAUSE_DEFINITIONS.get(cause_id, {
            "label": cause_id.replace("_", " ").title(),
            "explanation": "This factor contributed to the change.",
            "explanation_advanced": "Technical details unavailable.",
        })
        
        impact_percent = round((cause["weight"] / total_weight) * 100)
        
        drivers.append({
            "id": cause_id,
            "cause": cause_id,
            "label": definition["label"],
            "impact_percent": impact_percent,
            "explanation": definition["explanation"],
            "explanation_advanced": definition["explanation_advanced"],
            "segment_evidence": [],  # Would be populated from detailed logs
        })
    
    return drivers


def calculate_metric_change(prev: float, curr: float) -> dict:
    """Calculate change metrics between two values."""
    if prev == 0:
        change_percent = 100 if curr > 0 else 0
    else:
        change_percent = ((curr - prev) / prev) * 100
    
    if abs(change_percent) < 1:
        direction = "flat"
    elif change_percent > 0:
        direction = "up"
    else:
        direction = "down"
    
    return {
        "previous": round(prev, 4),
        "current": round(curr, 4),
        "change_percent": round(change_percent, 2),
        "direction": direction,
    }


@router.get("/{run_id}/days/{day_number}/causal-analysis")
async def get_causal_analysis(
    run_id: str,
    day_number: int,
    db: Annotated[Session, Depends(get_db)] = None,
    user_id: str = Depends(get_current_user_id),
):
    """
    Get causal analysis explaining why metrics changed for a specific day.
    
    Compares the selected day with the previous day and identifies
    the top drivers for each major metric change.
    """
    from src.models.tables import Run, DailyResult, SimAccount
    
    try:
        run_uuid = uuid.UUID(run_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid run ID format")
    
    # Verify run access
    run = db.query(Run).join(SimAccount).filter(
        Run.id == run_uuid,
        SimAccount.user_id == user_id,
    ).first()
    
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    
    # Get current day result
    current = db.query(DailyResult).filter(
        DailyResult.run_id == run_uuid,
        DailyResult.day_number == day_number,
    ).first()
    
    if not current:
        raise HTTPException(status_code=404, detail="Day not found")
    
    # Get previous day result (if exists)
    previous = None
    if day_number > 1:
        previous = db.query(DailyResult).filter(
            DailyResult.run_id == run_uuid,
            DailyResult.day_number == day_number - 1,
        ).first()
    
    # Calculate metrics changes
    def build_metric(prev_val, curr_val, causal_log, metric_name):
        change = calculate_metric_change(prev_val, curr_val)
        change["drivers"] = generate_drivers_from_causal_log(
            causal_log, metric_name, prev_val, curr_val
        )
        return change
    
    causal_log = current.causal_log or {}
    
    # Handle case where no previous day exists
    prev_impr = previous.impressions if previous else current.impressions
    prev_clicks = previous.clicks if previous else current.clicks
    prev_convs = previous.conversions if previous else current.conversions
    prev_cost = previous.cost if previous else current.cost
    
    prev_cpc = prev_cost / prev_clicks if prev_clicks > 0 else 0
    curr_cpc = current.cost / current.clicks if current.clicks > 0 else 0
    
    prev_ctr = prev_clicks / prev_impr if prev_impr > 0 else 0
    curr_ctr = current.clicks / current.impressions if current.impressions > 0 else 0
    
    prev_cvr = prev_convs / prev_clicks if prev_clicks > 0 else 0
    curr_cvr = current.conversions / current.clicks if current.clicks > 0 else 0
    
    prev_is = previous.impression_share if previous else current.impression_share
    
    return {
        "run_id": run_id,
        "day_number": day_number,
        "previous_day": day_number - 1 if previous else None,
        "is_first_day": previous is None,
        "metrics": {
            "cpc": build_metric(prev_cpc, curr_cpc, causal_log, "cpc"),
            "ctr": build_metric(prev_ctr, curr_ctr, causal_log, "ctr"),
            "cvr": build_metric(prev_cvr, curr_cvr, causal_log, "cvr"),
            "conversions": build_metric(prev_convs, current.conversions, causal_log, "conversions"),
            "impression_share": build_metric(prev_is, current.impression_share, causal_log, "impression_share"),
        },
        "raw_causal_log": causal_log,
    }
