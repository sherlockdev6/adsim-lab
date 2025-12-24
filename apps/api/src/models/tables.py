"""
SQLAlchemy models for AdSim Lab database.

All tables with proper relationships, indexes, and constraints.
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Float, Integer, BigInteger, Boolean, DateTime, 
    ForeignKey, Index, Text, Enum as SQLEnum, UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from src.core.database import Base
import enum


# ============================================================
# Enums
# ============================================================

class CampaignStatus(str, enum.Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    ENDED = "ended"
    DRAFT = "draft"


class BidStrategy(str, enum.Enum):
    MANUAL_CPC = "manual_cpc"
    MAXIMIZE_CLICKS = "maximize_clicks"
    MAXIMIZE_CONVERSIONS = "maximize_conversions"
    TARGET_CPA = "target_cpa"


class MatchType(str, enum.Enum):
    EXACT = "exact"
    PHRASE = "phrase"
    BROAD = "broad"


class IntentLevel(str, enum.Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class EntityStatus(str, enum.Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    REMOVED = "removed"


class RunStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


# ============================================================
# Helper functions
# ============================================================

def generate_uuid():
    return str(uuid.uuid4())


def utc_now():
    return datetime.now(timezone.utc)


# ============================================================
# User Model
# ============================================================

class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)
    
    # Relationships
    sim_accounts = relationship("SimAccount", back_populates="user", cascade="all, delete-orphan")
    change_history = relationship("ChangeHistory", back_populates="user", cascade="all, delete-orphan")


# ============================================================
# Scenario Model
# ============================================================

class Scenario(Base):
    __tablename__ = "scenarios"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    market = Column(String(50), nullable=False)
    description = Column(Text, nullable=True)
    demand_config = Column(JSONB, nullable=False, default=dict)
    ctr_cvr_config = Column(JSONB, nullable=False, default=dict)
    cpc_anchors = Column(JSONB, nullable=False, default=dict)
    tracking_loss_rate = Column(Float, nullable=False, default=0.0)
    fraud_rate = Column(Float, nullable=False, default=0.0)
    seasonality = Column(JSONB, nullable=False, default=dict)
    event_shocks = Column(JSONB, nullable=False, default=list)
    competitor_mix = Column(JSONB, nullable=False, default=dict)
    quality_score_config = Column(JSONB, nullable=False, default=dict)
    fatigue_config = Column(JSONB, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    
    # Relationships
    runs = relationship("Run", back_populates="scenario")


# ============================================================
# Sim Account Model
# ============================================================

class SimAccount(Base):
    __tablename__ = "sim_accounts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    daily_budget = Column(Float, nullable=False, default=100.0)
    currency = Column(String(3), nullable=False, default="USD")
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="sim_accounts")
    campaigns = relationship("Campaign", back_populates="sim_account", cascade="all, delete-orphan")
    landing_pages = relationship("LandingPage", back_populates="sim_account", cascade="all, delete-orphan")
    runs = relationship("Run", back_populates="sim_account", cascade="all, delete-orphan")
    
    # Indexes
    __table_args__ = (
        Index("ix_sim_accounts_user_id", "user_id"),
    )


# ============================================================
# Campaign Model
# ============================================================

class Campaign(Base):
    __tablename__ = "campaigns"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sim_account_id = Column(UUID(as_uuid=True), ForeignKey("sim_accounts.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    status = Column(SQLEnum(CampaignStatus), nullable=False, default=CampaignStatus.DRAFT)
    budget = Column(Float, nullable=False, default=50.0)
    bid_strategy = Column(SQLEnum(BidStrategy), nullable=False, default=BidStrategy.MANUAL_CPC)
    target_cpa = Column(Float, nullable=True)
    start_date = Column(DateTime(timezone=True), nullable=True)
    end_date = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)
    
    # Relationships
    sim_account = relationship("SimAccount", back_populates="campaigns")
    ad_groups = relationship("AdGroup", back_populates="campaign", cascade="all, delete-orphan")
    
    # Indexes
    __table_args__ = (
        Index("ix_campaigns_sim_account_status", "sim_account_id", "status"),
    )


# ============================================================
# Ad Group Model
# ============================================================

class AdGroup(Base):
    __tablename__ = "ad_groups"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    campaign_id = Column(UUID(as_uuid=True), ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    status = Column(SQLEnum(EntityStatus), nullable=False, default=EntityStatus.ACTIVE)
    default_bid = Column(Float, nullable=False, default=1.0)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)
    
    # Relationships
    campaign = relationship("Campaign", back_populates="ad_groups")
    keywords = relationship("Keyword", back_populates="ad_group", cascade="all, delete-orphan")
    ads = relationship("Ad", back_populates="ad_group", cascade="all, delete-orphan")
    
    # Indexes
    __table_args__ = (
        Index("ix_ad_groups_campaign_id", "campaign_id"),
    )


# ============================================================
# Keyword Model
# ============================================================

class Keyword(Base):
    __tablename__ = "keywords"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ad_group_id = Column(UUID(as_uuid=True), ForeignKey("ad_groups.id", ondelete="CASCADE"), nullable=False)
    text = Column(String(500), nullable=False)
    match_type = Column(SQLEnum(MatchType), nullable=False, default=MatchType.BROAD)
    intent = Column(SQLEnum(IntentLevel), nullable=True)
    bid_override = Column(Float, nullable=True)
    status = Column(SQLEnum(EntityStatus), nullable=False, default=EntityStatus.ACTIVE)
    is_negative = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)
    
    # Relationships
    ad_group = relationship("AdGroup", back_populates="keywords")
    keyword_daily_results = relationship("KeywordDailyResult", back_populates="keyword", cascade="all, delete-orphan")
    
    # Indexes
    __table_args__ = (
        Index("ix_keywords_ad_group_id", "ad_group_id"),
        Index("ix_keywords_text", "text"),
    )


# ============================================================
# Ad Model
# ============================================================

class Ad(Base):
    __tablename__ = "ads"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ad_group_id = Column(UUID(as_uuid=True), ForeignKey("ad_groups.id", ondelete="CASCADE"), nullable=False)
    landing_page_id = Column(UUID(as_uuid=True), ForeignKey("landing_pages.id", ondelete="SET NULL"), nullable=True)
    headline1 = Column(String(30), nullable=False)
    headline2 = Column(String(30), nullable=True)
    headline3 = Column(String(30), nullable=True)
    description1 = Column(String(90), nullable=False)
    description2 = Column(String(90), nullable=True)
    status = Column(SQLEnum(EntityStatus), nullable=False, default=EntityStatus.ACTIVE)
    ad_strength = Column(Float, nullable=False, default=0.5)  # 0-1 score
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)
    
    # Relationships
    ad_group = relationship("AdGroup", back_populates="ads")
    landing_page = relationship("LandingPage", back_populates="ads")
    
    # Indexes
    __table_args__ = (
        Index("ix_ads_ad_group_id", "ad_group_id"),
    )


# ============================================================
# Landing Page Model
# ============================================================

class LandingPage(Base):
    __tablename__ = "landing_pages"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sim_account_id = Column(UUID(as_uuid=True), ForeignKey("sim_accounts.id", ondelete="CASCADE"), nullable=False)
    url = Column(String(2048), nullable=False)
    name = Column(String(255), nullable=False)
    relevance_score = Column(Float, nullable=False, default=0.7)  # 0-1
    load_time_ms = Column(Float, nullable=False, default=2000.0)
    mobile_score = Column(Float, nullable=False, default=0.8)  # 0-1
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)
    
    # Relationships
    sim_account = relationship("SimAccount", back_populates="landing_pages")
    ads = relationship("Ad", back_populates="landing_page")
    
    # Indexes
    __table_args__ = (
        Index("ix_landing_pages_sim_account_id", "sim_account_id"),
    )


# ============================================================
# Run Model
# ============================================================

class Run(Base):
    __tablename__ = "runs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sim_account_id = Column(UUID(as_uuid=True), ForeignKey("sim_accounts.id", ondelete="CASCADE"), nullable=False)
    scenario_id = Column(UUID(as_uuid=True), ForeignKey("scenarios.id", ondelete="RESTRICT"), nullable=False)
    parent_run_id = Column(UUID(as_uuid=True), ForeignKey("runs.id", ondelete="SET NULL"), nullable=True)
    branch_day = Column(Integer, nullable=True)  # Day at which this run branched
    rng_seed = Column(BigInteger, nullable=False)
    duration_days = Column(Integer, nullable=False, default=30)
    current_day = Column(Integer, nullable=False, default=0)
    status = Column(SQLEnum(RunStatus), nullable=False, default=RunStatus.PENDING)
    initial_state_snapshot = Column(JSONB, nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    
    # Relationships
    sim_account = relationship("SimAccount", back_populates="runs")
    scenario = relationship("Scenario", back_populates="runs")
    parent_run = relationship("Run", remote_side=[id], backref="child_runs")
    daily_results = relationship("DailyResult", back_populates="run", cascade="all, delete-orphan")
    keyword_daily_results = relationship("KeywordDailyResult", back_populates="run", cascade="all, delete-orphan")
    segment_daily_results = relationship("SegmentDailyResult", back_populates="run", cascade="all, delete-orphan")
    state_snapshots = relationship("RunStateSnapshot", back_populates="run", cascade="all, delete-orphan")
    search_terms_reports = relationship("SearchTermsReport", back_populates="run", cascade="all, delete-orphan")
    
    # Indexes
    __table_args__ = (
        Index("ix_runs_sim_account_created", "sim_account_id", "created_at"),
        Index("ix_runs_scenario_id", "scenario_id"),
        Index("ix_runs_status", "status"),
    )


# ============================================================
# Daily Results Model
# ============================================================

class DailyResult(Base):
    __tablename__ = "daily_results"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    run_id = Column(UUID(as_uuid=True), ForeignKey("runs.id", ondelete="CASCADE"), nullable=False)
    day_number = Column(Integer, nullable=False)
    impressions = Column(Float, nullable=False, default=0)
    clicks = Column(Float, nullable=False, default=0)
    conversions = Column(Float, nullable=False, default=0)
    cost = Column(Float, nullable=False, default=0)
    revenue = Column(Float, nullable=False, default=0)
    avg_position = Column(Float, nullable=False, default=0)
    avg_quality_score = Column(Float, nullable=False, default=0)
    impression_share = Column(Float, nullable=False, default=0)
    lost_is_budget = Column(Float, nullable=False, default=0)
    lost_is_rank = Column(Float, nullable=False, default=0)
    fraud_clicks = Column(Float, nullable=False, default=0)
    tracking_lost_conversions = Column(Float, nullable=False, default=0)
    causal_log = Column(JSONB, nullable=True)  # Causal logging data
    extra_metrics = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    
    # Relationships
    run = relationship("Run", back_populates="daily_results")
    
    # Indexes and constraints
    __table_args__ = (
        Index("ix_daily_results_run_day", "run_id", "day_number"),
        UniqueConstraint("run_id", "day_number", name="uq_daily_results_run_day"),
    )


# ============================================================
# Keyword Daily Results Model
# ============================================================

class KeywordDailyResult(Base):
    __tablename__ = "keyword_daily_results"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    run_id = Column(UUID(as_uuid=True), ForeignKey("runs.id", ondelete="CASCADE"), nullable=False)
    keyword_id = Column(UUID(as_uuid=True), ForeignKey("keywords.id", ondelete="CASCADE"), nullable=False)
    day_number = Column(Integer, nullable=False)
    impressions = Column(Float, nullable=False, default=0)
    clicks = Column(Float, nullable=False, default=0)
    conversions = Column(Float, nullable=False, default=0)
    cost = Column(Float, nullable=False, default=0)
    avg_position = Column(Float, nullable=False, default=0)
    avg_cpc = Column(Float, nullable=False, default=0)
    quality_score = Column(Float, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    
    # Relationships
    run = relationship("Run", back_populates="keyword_daily_results")
    keyword = relationship("Keyword", back_populates="keyword_daily_results")
    
    # Indexes
    __table_args__ = (
        Index("ix_keyword_daily_results_run_day", "run_id", "day_number"),
        Index("ix_keyword_daily_results_keyword_run", "keyword_id", "run_id"),
        UniqueConstraint("run_id", "keyword_id", "day_number", name="uq_keyword_daily_results"),
    )


# ============================================================
# Segment Daily Results Model
# ============================================================

class SegmentDailyResult(Base):
    __tablename__ = "segment_daily_results"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    run_id = Column(UUID(as_uuid=True), ForeignKey("runs.id", ondelete="CASCADE"), nullable=False)
    day_number = Column(Integer, nullable=False)
    segment_type = Column(String(50), nullable=False)  # device, geo, intent, time
    segment_value = Column(String(100), nullable=False)
    impressions = Column(Float, nullable=False, default=0)
    clicks = Column(Float, nullable=False, default=0)
    conversions = Column(Float, nullable=False, default=0)
    cost = Column(Float, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    
    # Relationships
    run = relationship("Run", back_populates="segment_daily_results")
    
    # Indexes
    __table_args__ = (
        Index("ix_segment_daily_results_run_type_day", "run_id", "segment_type", "day_number"),
        UniqueConstraint("run_id", "day_number", "segment_type", "segment_value", name="uq_segment_daily_results"),
    )


# ============================================================
# Change History Model (Audit Log)
# ============================================================

class ChangeHistory(Base):
    __tablename__ = "change_history"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    entity_type = Column(String(50), nullable=False)  # campaign, ad_group, keyword, ad, etc.
    entity_id = Column(UUID(as_uuid=True), nullable=False)
    field_name = Column(String(100), nullable=False)
    old_value = Column(JSONB, nullable=True)
    new_value = Column(JSONB, nullable=True)
    changed_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="change_history")
    
    # Indexes
    __table_args__ = (
        Index("ix_change_history_entity", "entity_type", "entity_id", "changed_at"),
    )


# ============================================================
# Run State Snapshot Model
# ============================================================

class RunStateSnapshot(Base):
    __tablename__ = "run_state_snapshots"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    run_id = Column(UUID(as_uuid=True), ForeignKey("runs.id", ondelete="CASCADE"), nullable=False)
    day_number = Column(Integer, nullable=False)
    state_data = Column(JSONB, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    
    # Relationships
    run = relationship("Run", back_populates="state_snapshots")
    
    # Indexes and constraints
    __table_args__ = (
        Index("ix_run_state_snapshots_run_day", "run_id", "day_number"),
        UniqueConstraint("run_id", "day_number", name="uq_run_state_snapshot"),
    )


# ============================================================
# Search Terms Report Model
# ============================================================

class SearchTermsReport(Base):
    __tablename__ = "search_terms_reports"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    run_id = Column(UUID(as_uuid=True), ForeignKey("runs.id", ondelete="CASCADE"), nullable=False)
    day_number = Column(Integer, nullable=False)
    search_term = Column(String(500), nullable=False)
    keyword_text = Column(String(500), nullable=True)
    keyword_id = Column(UUID(as_uuid=True), nullable=True)
    match_type = Column(String(20), nullable=True)
    impressions = Column(Float, nullable=False, default=0)
    clicks = Column(Float, nullable=False, default=0)
    conversions = Column(Float, nullable=False, default=0)
    cost = Column(Float, nullable=False, default=0)
    is_mismatch = Column(Boolean, nullable=False, default=False)
    intent_tier = Column(String(20), nullable=True)
    sample_reason = Column(String(50), nullable=True)  # top_spend, random, mismatch
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    
    # Relationships
    run = relationship("Run", back_populates="search_terms_reports")
    
    # Indexes
    __table_args__ = (
        Index("ix_search_terms_reports_run_day", "run_id", "day_number"),
    )
