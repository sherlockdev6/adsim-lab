"""
Pydantic schemas for API request/response models.
"""
from datetime import datetime
from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from enum import Enum


# ============================================================
# Auth Schemas
# ============================================================

class LoginRequest(BaseModel):
    email: EmailStr


class UserResponse(BaseModel):
    id: str
    email: str
    name: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse


# ============================================================
# Scenario Schemas
# ============================================================

class ScenarioSummary(BaseModel):
    slug: str
    name: str
    market: str
    description: str


class ScenarioDetail(ScenarioSummary):
    demand_config: dict
    ctr_cvr_config: dict
    cpc_anchors: dict
    tracking_loss_rate: float
    fraud_rate: float
    seasonality: dict
    event_shocks: list
    competitor_mix: dict


class ScenarioListResponse(BaseModel):
    scenarios: list[ScenarioSummary]
    count: int


# ============================================================
# Sim Account Schemas
# ============================================================

class SimAccountCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    daily_budget: float = Field(default=100.0, ge=1.0, le=100000.0)
    currency: str = Field(default="USD", pattern="^[A-Z]{3}$")


class SimAccountUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    daily_budget: Optional[float] = Field(None, ge=1.0, le=100000.0)


class SimAccountResponse(BaseModel):
    id: str
    name: str
    daily_budget: float
    currency: str
    created_at: datetime
    updated_at: datetime


class SimAccountListResponse(BaseModel):
    accounts: list[SimAccountResponse]
    count: int


# ============================================================
# Campaign Schemas
# ============================================================

class CampaignStatus(str, Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    ENDED = "ended"
    DRAFT = "draft"


class BidStrategy(str, Enum):
    MANUAL_CPC = "manual_cpc"
    MAXIMIZE_CLICKS = "maximize_clicks"
    MAXIMIZE_CONVERSIONS = "maximize_conversions"
    TARGET_CPA = "target_cpa"


class CampaignCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    budget: float = Field(default=50.0, ge=1.0, le=50000.0)
    bid_strategy: BidStrategy = BidStrategy.MANUAL_CPC
    target_cpa: Optional[float] = Field(None, ge=0.01, le=1000.0)
    status: CampaignStatus = CampaignStatus.DRAFT


class CampaignUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    budget: Optional[float] = Field(None, ge=1.0, le=50000.0)
    bid_strategy: Optional[BidStrategy] = None
    target_cpa: Optional[float] = Field(None, ge=0.01, le=1000.0)
    status: Optional[CampaignStatus] = None


class CampaignResponse(BaseModel):
    id: str
    sim_account_id: str
    name: str
    status: CampaignStatus
    budget: float
    bid_strategy: BidStrategy
    target_cpa: Optional[float]
    created_at: datetime
    updated_at: datetime


class CampaignListResponse(BaseModel):
    campaigns: list[CampaignResponse]
    count: int


# ============================================================
# Ad Group Schemas
# ============================================================

class EntityStatus(str, Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    REMOVED = "removed"


class AdGroupCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    default_bid: float = Field(default=1.0, ge=0.01, le=500.0)
    status: EntityStatus = EntityStatus.ACTIVE


class AdGroupUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    default_bid: Optional[float] = Field(None, ge=0.01, le=500.0)
    status: Optional[EntityStatus] = None


class AdGroupResponse(BaseModel):
    id: str
    campaign_id: str
    name: str
    status: EntityStatus
    default_bid: float
    created_at: datetime
    updated_at: datetime


class AdGroupListResponse(BaseModel):
    ad_groups: list[AdGroupResponse]
    count: int


# ============================================================
# Keyword Schemas
# ============================================================

class MatchType(str, Enum):
    EXACT = "exact"
    PHRASE = "phrase"
    BROAD = "broad"


class IntentLevel(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class KeywordCreate(BaseModel):
    text: str = Field(..., min_length=1, max_length=500)
    match_type: MatchType = MatchType.BROAD
    intent: Optional[IntentLevel] = None
    bid_override: Optional[float] = Field(None, ge=0.01, le=500.0)
    is_negative: bool = False


class KeywordUpdate(BaseModel):
    match_type: Optional[MatchType] = None
    intent: Optional[IntentLevel] = None
    bid_override: Optional[float] = Field(None, ge=0.01, le=500.0)
    status: Optional[EntityStatus] = None


class KeywordResponse(BaseModel):
    id: str
    ad_group_id: str
    text: str
    match_type: MatchType
    intent: Optional[IntentLevel]
    bid_override: Optional[float]
    status: EntityStatus
    is_negative: bool
    quality_score: Optional[float] = None
    created_at: datetime
    updated_at: datetime


class KeywordListResponse(BaseModel):
    keywords: list[KeywordResponse]
    count: int


# ============================================================
# Ad Schemas
# ============================================================

class AdCreate(BaseModel):
    landing_page_id: Optional[str] = None
    headline1: str = Field(..., min_length=1, max_length=30)
    headline2: Optional[str] = Field(None, max_length=30)
    headline3: Optional[str] = Field(None, max_length=30)
    description1: str = Field(..., min_length=1, max_length=90)
    description2: Optional[str] = Field(None, max_length=90)


class AdUpdate(BaseModel):
    landing_page_id: Optional[str] = None
    headline1: Optional[str] = Field(None, min_length=1, max_length=30)
    headline2: Optional[str] = Field(None, max_length=30)
    headline3: Optional[str] = Field(None, max_length=30)
    description1: Optional[str] = Field(None, min_length=1, max_length=90)
    description2: Optional[str] = Field(None, max_length=90)
    status: Optional[EntityStatus] = None


class AdResponse(BaseModel):
    id: str
    ad_group_id: str
    landing_page_id: Optional[str]
    headline1: str
    headline2: Optional[str]
    headline3: Optional[str]
    description1: str
    description2: Optional[str]
    status: EntityStatus
    ad_strength: float
    created_at: datetime
    updated_at: datetime


class AdListResponse(BaseModel):
    ads: list[AdResponse]
    count: int


# ============================================================
# Landing Page Schemas
# ============================================================

class LandingPageCreate(BaseModel):
    url: str = Field(..., min_length=1, max_length=2048)
    name: str = Field(..., min_length=1, max_length=255)
    relevance_score: float = Field(default=0.7, ge=0.0, le=1.0)
    load_time_ms: float = Field(default=2000.0, ge=100.0, le=30000.0)
    mobile_score: float = Field(default=0.8, ge=0.0, le=1.0)


class LandingPageUpdate(BaseModel):
    url: Optional[str] = Field(None, min_length=1, max_length=2048)
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    relevance_score: Optional[float] = Field(None, ge=0.0, le=1.0)
    load_time_ms: Optional[float] = Field(None, ge=100.0, le=30000.0)
    mobile_score: Optional[float] = Field(None, ge=0.0, le=1.0)


class LandingPageResponse(BaseModel):
    id: str
    sim_account_id: str
    url: str
    name: str
    relevance_score: float
    load_time_ms: float
    mobile_score: float
    created_at: datetime
    updated_at: datetime


class LandingPageListResponse(BaseModel):
    landing_pages: list[LandingPageResponse]
    count: int


# ============================================================
# Run Schemas
# ============================================================

class RunStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class RunCreate(BaseModel):
    scenario_slug: str
    duration_days: int = Field(default=30, ge=1, le=365)
    seed: Optional[int] = None  # Auto-generated if not provided


class RunResponse(BaseModel):
    id: str
    sim_account_id: str
    scenario_id: str
    rng_seed: int
    duration_days: int
    current_day: int
    status: RunStatus
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    created_at: datetime


class RunListResponse(BaseModel):
    runs: list[RunResponse]
    count: int


# ============================================================
# Daily Results Schemas
# ============================================================

class DailyResultResponse(BaseModel):
    day_number: int
    impressions: float
    clicks: float
    conversions: float
    cost: float
    revenue: float
    avg_position: float
    avg_quality_score: float
    impression_share: float
    lost_is_budget: float
    lost_is_rank: float
    ctr: Optional[float] = None
    cvr: Optional[float] = None
    cpc: Optional[float] = None
    cpa: Optional[float] = None
    roas: Optional[float] = None


class RunResultsResponse(BaseModel):
    run_id: str
    status: RunStatus
    current_day: int
    duration_days: int
    daily_results: list[DailyResultResponse]
    totals: Optional[DailyResultResponse] = None
