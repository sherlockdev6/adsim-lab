"""
Simulation state dataclasses.

Defines all the state objects used throughout the simulation engine.
"""
from dataclasses import dataclass, field
from typing import Any
from enum import Enum


class MatchType(str, Enum):
    """Keyword match types."""
    EXACT = "exact"
    PHRASE = "phrase"
    BROAD = "broad"


class IntentLevel(str, Enum):
    """Search intent levels."""
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class DeviceType(str, Enum):
    """Device types."""
    MOBILE = "mobile"
    DESKTOP = "desktop"


class TimeBucket(str, Enum):
    """Time of day buckets."""
    MORNING = "morning"      # 6-12
    AFTERNOON = "afternoon"  # 12-18
    EVENING = "evening"      # 18-24
    NIGHT = "night"          # 0-6


class CampaignStatus(str, Enum):
    """Campaign status."""
    ACTIVE = "active"
    PAUSED = "paused"
    ENDED = "ended"
    DRAFT = "draft"


class EntityStatus(str, Enum):
    """Generic entity status."""
    ACTIVE = "active"
    PAUSED = "paused"
    REMOVED = "removed"


# ============================================================
# Core Entity Dataclasses
# ============================================================

@dataclass
class LandingPage:
    """Landing page entity."""
    id: str
    url: str
    name: str
    relevance_score: float = 0.7  # 0-1
    load_time_ms: float = 2000.0
    mobile_score: float = 0.8  # 0-1


@dataclass
class Ad:
    """Ad entity."""
    id: str
    ad_group_id: str
    landing_page_id: str | None
    headline1: str
    headline2: str = ""
    headline3: str = ""
    description1: str = ""
    description2: str = ""
    status: EntityStatus = EntityStatus.ACTIVE
    ad_strength: float = 0.5  # 0-1


@dataclass
class Keyword:
    """Keyword entity."""
    id: str
    ad_group_id: str
    text: str
    match_type: MatchType = MatchType.BROAD
    intent: IntentLevel | None = None
    bid_override: float | None = None
    status: EntityStatus = EntityStatus.ACTIVE
    is_negative: bool = False
    
    # Quality score state (updated during simulation)
    quality_score: float = 0.5  # 0-1 internal, maps to 1-10 display
    ctr_ema: float = 0.0
    cvr_ema: float = 0.0


@dataclass
class AdGroup:
    """Ad group entity."""
    id: str
    campaign_id: str
    name: str
    status: EntityStatus = EntityStatus.ACTIVE
    default_bid: float = 1.0
    keywords: list[Keyword] = field(default_factory=list)
    ads: list[Ad] = field(default_factory=list)


@dataclass
class Campaign:
    """Campaign entity."""
    id: str
    name: str
    status: CampaignStatus = CampaignStatus.ACTIVE
    budget: float = 50.0
    daily_spend: float = 0.0  # Accumulated spend for current day
    bid_strategy: str = "manual_cpc"
    target_cpa: float | None = None
    ad_groups: list[AdGroup] = field(default_factory=list)


@dataclass 
class Advertiser:
    """
    An advertiser in the simulation.
    
    Can be the user or a competitor.
    """
    id: str
    name: str
    is_user: bool = False
    daily_budget: float = 100.0
    campaigns: list[Campaign] = field(default_factory=list)
    landing_pages: list[LandingPage] = field(default_factory=list)
    
    # Competitor-specific attributes
    archetype: str | None = None  # aggressive, defensive, neutral
    bid_multiplier: float = 1.0
    budget_multiplier: float = 1.0
    base_quality_score: float = 0.6


# ============================================================
# Segment and Query Dataclasses
# ============================================================

@dataclass
class Segment:
    """
    A market segment defined by intent × device × time × geo.
    
    Total segments = 3 × 2 × 4 × 2 = 48
    """
    intent: IntentLevel
    device: DeviceType
    time_bucket: TimeBucket
    geo: str
    
    def to_key(self) -> str:
        """Return a string key for this segment."""
        return f"{self.intent.value}_{self.device.value}_{self.time_bucket.value}_{self.geo}"


@dataclass
class SearchQuery:
    """
    A generated search query with metadata.
    """
    query: str
    topic: str
    segment: Segment
    true_intent_score: float  # 0-1 actual purchase intent
    conversion_propensity: float  # 0-1 likelihood to convert
    cpc_pressure: float  # Market competition factor
    match_noise_risk: float  # Probability of irrelevant match


# ============================================================
# Results Dataclasses
# ============================================================

@dataclass
class CausalLog:
    """
    Causal log entry for explainability.
    
    Tracks drivers of metric changes with impact weights.
    """
    drivers: dict[str, float] = field(default_factory=dict)
    # Common drivers:
    # - qs_drop: Quality score decreased
    # - competitor_bid_up: Competitor increased bids
    # - intent_shift_low: Shift toward lower intent traffic
    # - fatigue: Ad fatigue affecting CTR
    # - budget_limited: Lost impression share due to budget
    # - tracking_loss: Conversions lost to tracking issues
    
    def add_driver(self, name: str, weight: float) -> None:
        """Add a driver with its impact weight."""
        self.drivers[name] = self.drivers.get(name, 0) + weight
    
    def normalize(self) -> None:
        """Normalize weights to sum to 1."""
        total = sum(self.drivers.values())
        if total > 0:
            self.drivers = {k: v / total for k, v in self.drivers.items()}
    
    def top_drivers(self, n: int = 3) -> list[tuple[str, float]]:
        """Get top N drivers by weight."""
        sorted_drivers = sorted(self.drivers.items(), key=lambda x: -x[1])
        return sorted_drivers[:n]


@dataclass
class DayMetrics:
    """Aggregated metrics for a single day."""
    day: int
    impressions: float = 0
    clicks: float = 0
    conversions: float = 0
    cost: float = 0
    revenue: float = 0
    avg_position: float = 0
    avg_quality_score: float = 0
    impression_share: float = 0
    lost_is_budget: float = 0
    lost_is_rank: float = 0
    fraud_clicks: float = 0
    tracking_lost_conversions: float = 0
    causal_log: CausalLog | None = None
    
    @property
    def ctr(self) -> float:
        """Click-through rate."""
        return self.clicks / self.impressions if self.impressions > 0 else 0
    
    @property
    def cvr(self) -> float:
        """Conversion rate."""
        return self.conversions / self.clicks if self.clicks > 0 else 0
    
    @property
    def cpc(self) -> float:
        """Cost per click."""
        return self.cost / self.clicks if self.clicks > 0 else 0
    
    @property
    def cpa(self) -> float:
        """Cost per acquisition."""
        return self.cost / self.conversions if self.conversions > 0 else 0
    
    @property
    def roas(self) -> float:
        """Return on ad spend."""
        return self.revenue / self.cost if self.cost > 0 else 0


@dataclass
class KeywordMetrics:
    """Metrics for a single keyword on a single day."""
    keyword_id: str
    day: int
    impressions: float = 0
    clicks: float = 0
    conversions: float = 0
    cost: float = 0
    avg_position: float = 0
    avg_cpc: float = 0
    quality_score: float = 0


@dataclass
class SegmentMetrics:
    """Metrics for a segment on a single day."""
    segment: Segment
    day: int
    impressions: float = 0
    clicks: float = 0
    conversions: float = 0
    cost: float = 0


# ============================================================
# Action Dataclasses
# ============================================================

@dataclass
class Action:
    """
    A user action to modify the simulation state.
    
    Actions are applied at the start of each day.
    """
    action_type: str
    entity_type: str
    entity_id: str
    field: str | None = None
    value: Any = None
    # Action types: create, update, delete, pause, enable


# ============================================================
# Full Simulation State
# ============================================================

@dataclass
class SimState:
    """
    Complete simulation state.
    
    Contains all advertisers, campaigns, and accumulated state.
    """
    advertisers: list[Advertiser] = field(default_factory=list)
    
    # Scenario reference
    scenario_slug: str = ""
    scenario_config: dict = field(default_factory=dict)
    
    # Time tracking
    current_day: int = 0
    
    # Fatigue state per (advertiser, user_segment) pair
    fatigue_state: dict[str, float] = field(default_factory=dict)
    
    # Quality score history for learning phase
    qs_history: dict[str, list[float]] = field(default_factory=dict)
    
    def get_user_advertiser(self) -> Advertiser | None:
        """Get the user's advertiser."""
        for adv in self.advertisers:
            if adv.is_user:
                return adv
        return None
    
    def get_all_keywords(self, advertiser_id: str) -> list[Keyword]:
        """Get all keywords for an advertiser."""
        keywords = []
        for adv in self.advertisers:
            if adv.id == advertiser_id:
                for campaign in adv.campaigns:
                    for ad_group in campaign.ad_groups:
                        keywords.extend(ad_group.keywords)
        return keywords
    
    def get_fatigue(self, advertiser_id: str, segment_key: str) -> float:
        """Get fatigue level for an advertiser-segment pair."""
        key = f"{advertiser_id}_{segment_key}"
        return self.fatigue_state.get(key, 0.0)
    
    def update_fatigue(self, advertiser_id: str, segment_key: str, impressions: int, scale: float = 1200, decay: float = 0.92) -> None:
        """Update fatigue for an advertiser-segment pair."""
        key = f"{advertiser_id}_{segment_key}"
        current = self.fatigue_state.get(key, 0.0)
        # Add fatigue from new impressions, then apply decay
        added = impressions / scale
        new_fatigue = (current + added) * decay
        self.fatigue_state[key] = min(new_fatigue, 1.0)  # Cap at 1.0


@dataclass
class RunResult:
    """
    Complete result from a simulation run.
    """
    seed: int
    n_days: int
    final_state: SimState
    daily_metrics: list[DayMetrics]
    keyword_metrics: list[KeywordMetrics]
    segment_metrics: list[SegmentMetrics]
    causal_logs: list[CausalLog]
