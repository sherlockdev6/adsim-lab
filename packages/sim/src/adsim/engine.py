"""
Main simulation engine.

Orchestrates the daily simulation loop, coordinating search term generation,
matching, auctions, clicks, and conversions.
"""
from dataclasses import dataclass, field
from typing import Any
import copy

from adsim.rng import SeededRNG, create_day_rng
from adsim.state import (
    SimState, DayMetrics, RunResult, Action, CausalLog,
    Segment, SearchQuery, KeywordMetrics, SegmentMetrics,
    IntentLevel, DeviceType, TimeBucket, Advertiser, Keyword,
)
from adsim.matching import match_keyword, MatchType, NegativeKeyword
from adsim.auction import run_auction, AuctionEntry
from adsim.clicks import (
    compute_ctr, compute_cvr, simulate_click, simulate_conversion,
    FatigueState, calculate_landing_multiplier,
)
from adsim.quality_score import QualityScoreState


@dataclass
class DayContext:
    """Context for a single day's simulation."""
    day: int
    rng: SeededRNG
    scenario_config: dict
    seasonality_mult: float = 1.0
    event_mult: float = 1.0


def get_seasonality_multiplier(day: int, scenario_config: dict) -> float:
    """Get seasonality multiplier for a given day."""
    seasonality = scenario_config.get("seasonality", {})
    monthly_factors = seasonality.get("monthly_factors", [1.0] * 12)
    dow_factors = seasonality.get("day_of_week_factors", [1.0] * 7)
    
    # Assume day 1 = Jan 1, calculate month and day of week
    month = ((day - 1) // 30) % 12
    dow = (day - 1) % 7
    
    monthly_mult = monthly_factors[month] if month < len(monthly_factors) else 1.0
    dow_mult = dow_factors[dow] if dow < len(dow_factors) else 1.0
    
    return monthly_mult * dow_mult


def get_event_multiplier(day: int, scenario_config: dict) -> float:
    """Get event shock multiplier for a given day."""
    event_shocks = scenario_config.get("event_shocks", [])
    
    for event in event_shocks:
        day_range = event.get("day_range", [0, 0])
        if day_range[0] <= day <= day_range[1]:
            return event.get("demand_mult", 1.0)
    
    return 1.0


def generate_segments() -> list[Segment]:
    """Generate all 48 market segments."""
    segments = []
    for intent in IntentLevel:
        for device in DeviceType:
            for time_bucket in TimeBucket:
                for geo in ["primary", "secondary"]:
                    segments.append(Segment(
                        intent=intent,
                        device=device,
                        time_bucket=time_bucket,
                        geo=geo,
                    ))
    return segments


def generate_daily_queries(
    segment: Segment,
    demand_config: dict,
    seasonality_mult: float,
    event_mult: float,
    rng: SeededRNG,
) -> list[SearchQuery]:
    """
    Generate search queries for a segment.
    
    In a full implementation, this would use the LexiconPack.
    For now, generates placeholder queries.
    """
    daily_baseline = demand_config.get("daily_baseline", 1000)
    intent_split = demand_config.get("intent_split", {})
    device_split = demand_config.get("device_split", {})
    geo_split = demand_config.get("geo_split", {})
    time_split = demand_config.get("time_split", {})
    
    # Calculate segment's share
    intent_share = intent_split.get(segment.intent.value, 0.33)
    device_share = device_split.get(segment.device.value, 0.5)
    geo_share = geo_split.get(segment.geo, 0.5)
    time_share = time_split.get(segment.time_bucket.value, 0.25)
    
    segment_demand = int(
        daily_baseline * intent_share * device_share * 
        geo_share * time_share * seasonality_mult * event_mult
    )
    
    queries = []
    for _ in range(segment_demand):
        # Generate a placeholder query
        query = SearchQuery(
            query=f"query_{rng.randint(1, 10000)}",
            topic="generic",
            segment=segment,
            true_intent_score=0.7 if segment.intent == IntentLevel.HIGH else 0.4,
            conversion_propensity=0.1 if segment.intent == IntentLevel.HIGH else 0.02,
            cpc_pressure=1.0,
            match_noise_risk=0.1,
        )
        queries.append(query)
    
    return queries


def apply_actions(state: SimState, actions: list[Action]) -> SimState:
    """Apply user actions to state."""
    new_state = copy.deepcopy(state)
    
    for action in actions:
        # TODO: Implement action application
        # For now, just pass through
        pass
    
    return new_state


def simulate_day(
    state: SimState,
    actions: list[Action],
    day: int,
    rng: SeededRNG,
) -> tuple[SimState, DayMetrics, list[CausalLog]]:
    """
    Simulate a single day.
    
    Args:
        state: Current simulation state
        actions: User actions to apply at start of day
        day: Day number (1-indexed)
        rng: Random number generator
    
    Returns:
        (new_state, metrics, causal_logs) tuple
    """
    # Apply actions
    new_state = apply_actions(state, actions)
    new_state.current_day = day
    
    # Get scenario config
    scenario_config = new_state.scenario_config
    demand_config = scenario_config.get("demand_config", {})
    ctr_cvr_config = scenario_config.get("ctr_cvr_config", {})
    
    # Calculate multipliers
    seasonality_mult = get_seasonality_multiplier(day, scenario_config)
    event_mult = get_event_multiplier(day, scenario_config)
    
    # Initialize metrics
    metrics = DayMetrics(day=day)
    causal_log = CausalLog()
    
    # Get user advertiser
    user_adv = new_state.get_user_advertiser()
    if user_adv is None:
        return new_state, metrics, [causal_log]
    
    # Generate queries for each segment
    segments = generate_segments()
    
    total_impressions = 0
    total_clicks = 0
    total_conversions = 0
    total_cost = 0.0
    total_revenue = 0.0
    total_position_sum = 0.0
    total_qs_sum = 0.0
    
    eligible_auctions = 0
    won_auctions = 0
    lost_budget = 0
    lost_rank = 0
    fraud_clicks = 0
    tracking_lost = 0
    
    fraud_rate = scenario_config.get("fraud_rate", 0.0)
    tracking_loss_rate = scenario_config.get("tracking_loss_rate", 0.0)
    
    # Reset daily budgets
    for adv in new_state.advertisers:
        for campaign in adv.campaigns:
            campaign.daily_spend = 0.0
    
    for segment in segments:
        queries = generate_daily_queries(
            segment, demand_config, seasonality_mult, event_mult, rng
        )
        
        # Get fatigue for this segment
        segment_key = segment.to_key()
        fatigue = new_state.get_fatigue(user_adv.id, segment_key)
        
        segment_impressions = 0
        
        for query in queries:
            # Build auction entries from all advertisers
            entries = []
            
            for adv in new_state.advertisers:
                for campaign in adv.campaigns:
                    if campaign.status.value != "active":
                        continue
                    
                    # Check budget
                    remaining = campaign.budget - campaign.daily_spend
                    if remaining <= 0:
                        continue
                    
                    for ad_group in campaign.ad_groups:
                        if ad_group.status.value != "active":
                            continue
                        
                        # Check for matching keywords
                        for keyword in ad_group.keywords:
                            if keyword.status.value != "active":
                                continue
                            if keyword.is_negative:
                                continue
                            
                            # Get negatives for this ad group
                            negatives = [
                                NegativeKeyword(k.text, MatchType(k.match_type.value))
                                for k in ad_group.keywords
                                if k.is_negative
                            ]
                            
                            # Try to match
                            result = match_keyword(
                                keyword=keyword.text,
                                query=query.query,
                                match_type=MatchType(keyword.match_type.value),
                                negatives=negatives,
                                learning_state=True,  # Simplified
                            )
                            
                            if result.matched:
                                # Get bid
                                bid = keyword.bid_override or ad_group.default_bid
                                if not adv.is_user:
                                    bid *= adv.bid_multiplier
                                
                                # Get quality score
                                qs = keyword.quality_score if adv.is_user else adv.base_quality_score
                                
                                # Get first active ad
                                ad = next(
                                    (a for a in ad_group.ads if a.status.value == "active"),
                                    None
                                )
                                if ad:
                                    entries.append(AuctionEntry(
                                        advertiser_id=adv.id,
                                        keyword_id=keyword.id,
                                        ad_id=ad.id,
                                        bid=bid,
                                        quality_score=qs,
                                    ))
                                break  # One keyword match per ad group
            
            if not entries:
                continue
            
            # Check if user is eligible
            user_entry = next(
                (e for e in entries if e.advertiser_id == user_adv.id),
                None
            )
            if user_entry:
                eligible_auctions += 1
            
            # Run auction
            budget_remaining = {}
            for adv in new_state.advertisers:
                for campaign in adv.campaigns:
                    budget_remaining[adv.id] = campaign.budget - campaign.daily_spend
            
            auction_result = run_auction(
                entries=entries,
                query=query.query,
                budget_remaining=budget_remaining,
                rng=rng,
            )
            
            # Process user's result
            user_pos = auction_result.get_user_position(user_adv.id)
            if user_pos and user_pos.won_auction:
                won_auctions += 1
                
                # Simulate click
                base_ctr = ctr_cvr_config.get("base_ctr_by_intent", {}).get(
                    segment.intent.value, 0.03
                )
                
                ctr, _ = compute_ctr(
                    base_ctr=base_ctr,
                    position=user_pos.position,
                    ad_strength=0.6,  # Simplified
                    relevance=0.7,  # Simplified
                    fatigue=fatigue,
                    rng=rng,
                )
                
                click_result = simulate_click(ctr, fraud_rate, rng)
                
                total_impressions += 1
                segment_impressions += 1
                total_position_sum += user_pos.position
                total_qs_sum += user_entry.quality_score if user_entry else 0.5
                
                if click_result.clicked:
                    cost = user_pos.cpc
                    total_clicks += 1
                    total_cost += cost
                    
                    # Update campaign spend
                    for campaign in user_adv.campaigns:
                        campaign.daily_spend += cost
                    
                    if click_result.is_fraud:
                        fraud_clicks += 1
                    else:
                        # Simulate conversion
                        base_cvr = ctr_cvr_config.get("base_cvr_by_intent", {}).get(
                            segment.intent.value, 0.05
                        )
                        
                        cvr, _ = compute_cvr(
                            base_cvr=base_cvr,
                            landing_mult=1.0,  # Simplified
                            rng=rng,
                        )
                        
                        conv_result = simulate_conversion(
                            cvr, tracking_loss_rate, rng=rng
                        )
                        
                        if conv_result.converted:
                            if conv_result.is_tracked:
                                total_conversions += 1
                                total_revenue += 100.0  # Simplified revenue
                            else:
                                tracking_lost += 1
            
            elif user_pos:
                if user_pos.loss_reason == "budget":
                    lost_budget += 1
                else:
                    lost_rank += 1
        
        # Update fatigue
        new_state.update_fatigue(user_adv.id, segment_key, segment_impressions)
    
    # Populate metrics
    metrics.impressions = total_impressions
    metrics.clicks = total_clicks
    metrics.conversions = total_conversions
    metrics.cost = total_cost
    metrics.revenue = total_revenue
    metrics.avg_position = (total_position_sum / total_impressions) if total_impressions > 0 else 0
    metrics.avg_quality_score = (total_qs_sum / total_impressions) if total_impressions > 0 else 0
    metrics.fraud_clicks = fraud_clicks
    metrics.tracking_lost_conversions = tracking_lost
    
    if eligible_auctions > 0:
        metrics.impression_share = won_auctions / eligible_auctions
        metrics.lost_is_budget = lost_budget / eligible_auctions
        metrics.lost_is_rank = lost_rank / eligible_auctions
    
    # Build causal log
    if lost_budget > lost_rank:
        causal_log.add_driver("budget_limited", 0.4)
    if lost_rank > lost_budget:
        causal_log.add_driver("rank_loss", 0.3)
    if fraud_clicks > 0:
        causal_log.add_driver("fraud", 0.1)
    if tracking_lost > 0:
        causal_log.add_driver("tracking_loss", 0.1)
    causal_log.normalize()
    
    metrics.causal_log = causal_log
    
    return new_state, metrics, [causal_log]


def simulate_run(
    initial_state: SimState,
    actions_by_day: dict[int, list[Action]],
    seed: int,
    n_days: int,
) -> RunResult:
    """
    Run a complete simulation.
    
    Args:
        initial_state: Starting state
        actions_by_day: Dict mapping day number to list of actions
        seed: RNG seed for reproducibility
        n_days: Number of days to simulate
    
    Returns:
        RunResult with all metrics and final state
    """
    state = copy.deepcopy(initial_state)
    daily_metrics = []
    keyword_metrics = []
    segment_metrics = []
    causal_logs = []
    
    for day in range(1, n_days + 1):
        # Create day-specific RNG
        day_rng = create_day_rng(seed, day)
        
        # Get actions for this day
        day_actions = actions_by_day.get(day, [])
        
        # Simulate the day
        state, metrics, day_causal_logs = simulate_day(
            state, day_actions, day, day_rng
        )
        
        daily_metrics.append(metrics)
        causal_logs.extend(day_causal_logs)
    
    return RunResult(
        seed=seed,
        n_days=n_days,
        final_state=state,
        daily_metrics=daily_metrics,
        keyword_metrics=keyword_metrics,
        segment_metrics=segment_metrics,
        causal_logs=causal_logs,
    )
