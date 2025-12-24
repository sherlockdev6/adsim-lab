"""
AdSim - Advertising Simulation Engine

A deterministic simulation engine for advertising scenarios.
"""
from adsim.engine import simulate_day, simulate_run
from adsim.state import (
    SimState,
    Advertiser,
    Campaign,
    AdGroup,
    Keyword,
    Ad,
    LandingPage,
    DayMetrics,
    RunResult,
    Action,
)
from adsim.rng import SeededRNG
from adsim.quality_score import QualityScoreState
from adsim.matching import match_keyword, MatchResult, MatchType
from adsim.auction import run_auction, AuctionResult

__version__ = "0.1.0"

__all__ = [
    # Engine
    "simulate_day",
    "simulate_run",
    # State
    "SimState",
    "Advertiser",
    "Campaign",
    "AdGroup",
    "Keyword",
    "Ad",
    "LandingPage",
    "DayMetrics",
    "RunResult",
    "Action",
    # RNG
    "SeededRNG",
    # Quality Score
    "QualityScoreState",
    # Matching
    "match_keyword",
    "MatchResult",
    "MatchType",
    # Auction
    "run_auction",
    "AuctionResult",
]
