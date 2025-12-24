"""Initial schema with all tables

Revision ID: 001_initial_schema
Revises: 
Create Date: 2024-12-23

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create enum types
    op.execute("CREATE TYPE campaignstatus AS ENUM ('active', 'paused', 'ended', 'draft')")
    op.execute("CREATE TYPE bidstrategy AS ENUM ('manual_cpc', 'maximize_clicks', 'maximize_conversions', 'target_cpa')")
    op.execute("CREATE TYPE matchtype AS ENUM ('exact', 'phrase', 'broad')")
    op.execute("CREATE TYPE intentlevel AS ENUM ('high', 'medium', 'low')")
    op.execute("CREATE TYPE entitystatus AS ENUM ('active', 'paused', 'removed')")
    op.execute("CREATE TYPE runstatus AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled')")

    # Users table
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('email', sa.String(255), unique=True, nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_users_email', 'users', ['email'])

    # Scenarios table
    op.create_table(
        'scenarios',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('slug', sa.String(100), unique=True, nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('market', sa.String(50), nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('demand_config', postgresql.JSONB, nullable=False, server_default='{}'),
        sa.Column('ctr_cvr_config', postgresql.JSONB, nullable=False, server_default='{}'),
        sa.Column('cpc_anchors', postgresql.JSONB, nullable=False, server_default='{}'),
        sa.Column('tracking_loss_rate', sa.Float, nullable=False, server_default='0.0'),
        sa.Column('fraud_rate', sa.Float, nullable=False, server_default='0.0'),
        sa.Column('seasonality', postgresql.JSONB, nullable=False, server_default='{}'),
        sa.Column('event_shocks', postgresql.JSONB, nullable=False, server_default='[]'),
        sa.Column('competitor_mix', postgresql.JSONB, nullable=False, server_default='{}'),
        sa.Column('quality_score_config', postgresql.JSONB, nullable=False, server_default='{}'),
        sa.Column('fatigue_config', postgresql.JSONB, nullable=False, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_scenarios_slug', 'scenarios', ['slug'])

    # Sim accounts table
    op.create_table(
        'sim_accounts',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('daily_budget', sa.Float, nullable=False, server_default='100.0'),
        sa.Column('currency', sa.String(3), nullable=False, server_default="'USD'"),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_sim_accounts_user_id', 'sim_accounts', ['user_id'])

    # Landing pages table (created before ads due to FK)
    op.create_table(
        'landing_pages',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('sim_account_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('sim_accounts.id', ondelete='CASCADE'), nullable=False),
        sa.Column('url', sa.String(2048), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('relevance_score', sa.Float, nullable=False, server_default='0.7'),
        sa.Column('load_time_ms', sa.Float, nullable=False, server_default='2000.0'),
        sa.Column('mobile_score', sa.Float, nullable=False, server_default='0.8'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_landing_pages_sim_account_id', 'landing_pages', ['sim_account_id'])

    # Campaigns table
    op.create_table(
        'campaigns',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('sim_account_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('sim_accounts.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('status', postgresql.ENUM('active', 'paused', 'ended', 'draft', name='campaignstatus', create_type=False), nullable=False, server_default='draft'),
        sa.Column('budget', sa.Float, nullable=False, server_default='50.0'),
        sa.Column('bid_strategy', postgresql.ENUM('manual_cpc', 'maximize_clicks', 'maximize_conversions', 'target_cpa', name='bidstrategy', create_type=False), nullable=False, server_default='manual_cpc'),
        sa.Column('target_cpa', sa.Float, nullable=True),
        sa.Column('start_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('end_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_campaigns_sim_account_status', 'campaigns', ['sim_account_id', 'status'])

    # Ad groups table
    op.create_table(
        'ad_groups',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('campaign_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('campaigns.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('status', postgresql.ENUM('active', 'paused', 'removed', name='entitystatus', create_type=False), nullable=False, server_default='active'),
        sa.Column('default_bid', sa.Float, nullable=False, server_default='1.0'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_ad_groups_campaign_id', 'ad_groups', ['campaign_id'])

    # Keywords table
    op.create_table(
        'keywords',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('ad_group_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('ad_groups.id', ondelete='CASCADE'), nullable=False),
        sa.Column('text', sa.String(500), nullable=False),
        sa.Column('match_type', postgresql.ENUM('exact', 'phrase', 'broad', name='matchtype', create_type=False), nullable=False, server_default='broad'),
        sa.Column('intent', postgresql.ENUM('high', 'medium', 'low', name='intentlevel', create_type=False), nullable=True),
        sa.Column('bid_override', sa.Float, nullable=True),
        sa.Column('status', postgresql.ENUM('active', 'paused', 'removed', name='entitystatus', create_type=False), nullable=False, server_default='active'),
        sa.Column('is_negative', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_keywords_ad_group_id', 'keywords', ['ad_group_id'])
    op.create_index('ix_keywords_text', 'keywords', ['text'])

    # Ads table
    op.create_table(
        'ads',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('ad_group_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('ad_groups.id', ondelete='CASCADE'), nullable=False),
        sa.Column('landing_page_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('landing_pages.id', ondelete='SET NULL'), nullable=True),
        sa.Column('headline1', sa.String(30), nullable=False),
        sa.Column('headline2', sa.String(30), nullable=True),
        sa.Column('headline3', sa.String(30), nullable=True),
        sa.Column('description1', sa.String(90), nullable=False),
        sa.Column('description2', sa.String(90), nullable=True),
        sa.Column('status', postgresql.ENUM('active', 'paused', 'removed', name='entitystatus', create_type=False), nullable=False, server_default='active'),
        sa.Column('ad_strength', sa.Float, nullable=False, server_default='0.5'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_ads_ad_group_id', 'ads', ['ad_group_id'])

    # Runs table
    op.create_table(
        'runs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('sim_account_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('sim_accounts.id', ondelete='CASCADE'), nullable=False),
        sa.Column('scenario_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('scenarios.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('parent_run_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('runs.id', ondelete='SET NULL'), nullable=True),
        sa.Column('branch_day', sa.Integer, nullable=True),
        sa.Column('rng_seed', sa.BigInteger, nullable=False),
        sa.Column('duration_days', sa.Integer, nullable=False, server_default='30'),
        sa.Column('current_day', sa.Integer, nullable=False, server_default='0'),
        sa.Column('status', postgresql.ENUM('pending', 'running', 'completed', 'failed', 'cancelled', name='runstatus', create_type=False), nullable=False, server_default='pending'),
        sa.Column('initial_state_snapshot', postgresql.JSONB, nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_runs_sim_account_created', 'runs', ['sim_account_id', 'created_at'])
    op.create_index('ix_runs_scenario_id', 'runs', ['scenario_id'])
    op.create_index('ix_runs_status', 'runs', ['status'])

    # Daily results table
    op.create_table(
        'daily_results',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('run_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('runs.id', ondelete='CASCADE'), nullable=False),
        sa.Column('day_number', sa.Integer, nullable=False),
        sa.Column('impressions', sa.Float, nullable=False, server_default='0'),
        sa.Column('clicks', sa.Float, nullable=False, server_default='0'),
        sa.Column('conversions', sa.Float, nullable=False, server_default='0'),
        sa.Column('cost', sa.Float, nullable=False, server_default='0'),
        sa.Column('revenue', sa.Float, nullable=False, server_default='0'),
        sa.Column('avg_position', sa.Float, nullable=False, server_default='0'),
        sa.Column('avg_quality_score', sa.Float, nullable=False, server_default='0'),
        sa.Column('impression_share', sa.Float, nullable=False, server_default='0'),
        sa.Column('lost_is_budget', sa.Float, nullable=False, server_default='0'),
        sa.Column('lost_is_rank', sa.Float, nullable=False, server_default='0'),
        sa.Column('fraud_clicks', sa.Float, nullable=False, server_default='0'),
        sa.Column('tracking_lost_conversions', sa.Float, nullable=False, server_default='0'),
        sa.Column('causal_log', postgresql.JSONB, nullable=True),
        sa.Column('extra_metrics', postgresql.JSONB, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_daily_results_run_day', 'daily_results', ['run_id', 'day_number'])
    op.create_unique_constraint('uq_daily_results_run_day', 'daily_results', ['run_id', 'day_number'])

    # Keyword daily results table
    op.create_table(
        'keyword_daily_results',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('run_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('runs.id', ondelete='CASCADE'), nullable=False),
        sa.Column('keyword_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('keywords.id', ondelete='CASCADE'), nullable=False),
        sa.Column('day_number', sa.Integer, nullable=False),
        sa.Column('impressions', sa.Float, nullable=False, server_default='0'),
        sa.Column('clicks', sa.Float, nullable=False, server_default='0'),
        sa.Column('conversions', sa.Float, nullable=False, server_default='0'),
        sa.Column('cost', sa.Float, nullable=False, server_default='0'),
        sa.Column('avg_position', sa.Float, nullable=False, server_default='0'),
        sa.Column('avg_cpc', sa.Float, nullable=False, server_default='0'),
        sa.Column('quality_score', sa.Float, nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_keyword_daily_results_run_day', 'keyword_daily_results', ['run_id', 'day_number'])
    op.create_index('ix_keyword_daily_results_keyword_run', 'keyword_daily_results', ['keyword_id', 'run_id'])
    op.create_unique_constraint('uq_keyword_daily_results', 'keyword_daily_results', ['run_id', 'keyword_id', 'day_number'])

    # Segment daily results table
    op.create_table(
        'segment_daily_results',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('run_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('runs.id', ondelete='CASCADE'), nullable=False),
        sa.Column('day_number', sa.Integer, nullable=False),
        sa.Column('segment_type', sa.String(50), nullable=False),
        sa.Column('segment_value', sa.String(100), nullable=False),
        sa.Column('impressions', sa.Float, nullable=False, server_default='0'),
        sa.Column('clicks', sa.Float, nullable=False, server_default='0'),
        sa.Column('conversions', sa.Float, nullable=False, server_default='0'),
        sa.Column('cost', sa.Float, nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_segment_daily_results_run_type_day', 'segment_daily_results', ['run_id', 'segment_type', 'day_number'])
    op.create_unique_constraint('uq_segment_daily_results', 'segment_daily_results', ['run_id', 'day_number', 'segment_type', 'segment_value'])

    # Change history table
    op.create_table(
        'change_history',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('entity_type', sa.String(50), nullable=False),
        sa.Column('entity_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('field_name', sa.String(100), nullable=False),
        sa.Column('old_value', postgresql.JSONB, nullable=True),
        sa.Column('new_value', postgresql.JSONB, nullable=True),
        sa.Column('changed_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_change_history_entity', 'change_history', ['entity_type', 'entity_id', 'changed_at'])

    # Run state snapshots table
    op.create_table(
        'run_state_snapshots',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('run_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('runs.id', ondelete='CASCADE'), nullable=False),
        sa.Column('day_number', sa.Integer, nullable=False),
        sa.Column('state_data', postgresql.JSONB, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_run_state_snapshots_run_day', 'run_state_snapshots', ['run_id', 'day_number'])
    op.create_unique_constraint('uq_run_state_snapshot', 'run_state_snapshots', ['run_id', 'day_number'])

    # Search terms reports table
    op.create_table(
        'search_terms_reports',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('run_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('runs.id', ondelete='CASCADE'), nullable=False),
        sa.Column('day_number', sa.Integer, nullable=False),
        sa.Column('search_term', sa.String(500), nullable=False),
        sa.Column('keyword_text', sa.String(500), nullable=True),
        sa.Column('keyword_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('match_type', sa.String(20), nullable=True),
        sa.Column('impressions', sa.Float, nullable=False, server_default='0'),
        sa.Column('clicks', sa.Float, nullable=False, server_default='0'),
        sa.Column('conversions', sa.Float, nullable=False, server_default='0'),
        sa.Column('cost', sa.Float, nullable=False, server_default='0'),
        sa.Column('is_mismatch', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('intent_tier', sa.String(20), nullable=True),
        sa.Column('sample_reason', sa.String(50), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_search_terms_reports_run_day', 'search_terms_reports', ['run_id', 'day_number'])


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_table('search_terms_reports')
    op.drop_table('run_state_snapshots')
    op.drop_table('change_history')
    op.drop_table('segment_daily_results')
    op.drop_table('keyword_daily_results')
    op.drop_table('daily_results')
    op.drop_table('runs')
    op.drop_table('ads')
    op.drop_table('keywords')
    op.drop_table('ad_groups')
    op.drop_table('campaigns')
    op.drop_table('landing_pages')
    op.drop_table('sim_accounts')
    op.drop_table('scenarios')
    op.drop_table('users')
    
    # Drop enum types
    op.execute("DROP TYPE runstatus")
    op.execute("DROP TYPE entitystatus")
    op.execute("DROP TYPE intentlevel")
    op.execute("DROP TYPE matchtype")
    op.execute("DROP TYPE bidstrategy")
    op.execute("DROP TYPE campaignstatus")
