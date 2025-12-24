"""
Integration test for full simulation.
"""
import pytest
from adsim.engine import simulate_day, simulate_run
from adsim.state import (
    SimState, Advertiser, Campaign, AdGroup, Keyword, Ad, LandingPage,
    CampaignStatus, EntityStatus, MatchType as StateMatchType, IntentLevel,
)
from adsim.rng import SeededRNG


def create_test_state() -> SimState:
    """Create a minimal test state."""
    # Create landing page
    landing_page = LandingPage(
        id="lp1",
        url="https://example.com",
        name="Main Landing Page",
        relevance_score=0.8,
        load_time_ms=1500,
        mobile_score=0.9,
    )
    
    # Create ad
    ad = Ad(
        id="ad1",
        ad_group_id="ag1",
        landing_page_id="lp1",
        headline1="Buy Villa Dubai",
        headline2="Best Prices",
        description1="Find your dream villa in Dubai",
        status=EntityStatus.ACTIVE,
        ad_strength=0.7,
    )
    
    # Create keywords
    keywords = [
        Keyword(
            id="kw1",
            ad_group_id="ag1",
            text="buy villa dubai",
            match_type=StateMatchType.BROAD,
            intent=IntentLevel.HIGH,
            status=EntityStatus.ACTIVE,
            quality_score=0.7,
        ),
        Keyword(
            id="kw2",
            ad_group_id="ag1",
            text="villa rental dubai",
            match_type=StateMatchType.PHRASE,
            intent=IntentLevel.MEDIUM,
            status=EntityStatus.ACTIVE,
            quality_score=0.6,
        ),
    ]
    
    # Create ad group
    ad_group = AdGroup(
        id="ag1",
        campaign_id="camp1",
        name="Dubai Villas",
        status=EntityStatus.ACTIVE,
        default_bid=5.0,
        keywords=keywords,
        ads=[ad],
    )
    
    # Create campaign
    campaign = Campaign(
        id="camp1",
        name="Real Estate Campaign",
        status=CampaignStatus.ACTIVE,
        budget=100.0,
        bid_strategy="manual_cpc",
        ad_groups=[ad_group],
    )
    
    # Create user advertiser
    user_adv = Advertiser(
        id="user1",
        name="User",
        is_user=True,
        daily_budget=200.0,
        campaigns=[campaign],
        landing_pages=[landing_page],
    )
    
    # Create competitor
    competitor = Advertiser(
        id="comp1",
        name="Competitor 1",
        is_user=False,
        daily_budget=150.0,
        archetype="neutral",
        bid_multiplier=1.0,
        base_quality_score=0.6,
        campaigns=[
            Campaign(
                id="comp_camp1",
                name="Competitor Campaign",
                status=CampaignStatus.ACTIVE,
                budget=75.0,
                ad_groups=[
                    AdGroup(
                        id="comp_ag1",
                        campaign_id="comp_camp1",
                        name="Competitor AG",
                        default_bid=4.0,
                        keywords=[
                            Keyword(
                                id="comp_kw1",
                                ad_group_id="comp_ag1",
                                text="dubai property",
                                match_type=StateMatchType.BROAD,
                                quality_score=0.6,
                            ),
                        ],
                        ads=[
                            Ad(
                                id="comp_ad1",
                                ad_group_id="comp_ag1",
                                landing_page_id=None,
                                headline1="Dubai Properties",
                                description1="Great deals",
                            ),
                        ],
                    ),
                ],
            ),
        ],
    )
    
    # Create state with scenario config
    state = SimState(
        advertisers=[user_adv, competitor],
        scenario_slug="uae-real-estate",
        scenario_config={
            "demand_config": {
                "daily_baseline": 100,  # Small for testing
                "intent_split": {"high": 0.2, "medium": 0.4, "low": 0.4},
                "device_split": {"mobile": 0.6, "desktop": 0.4},
                "geo_split": {"primary": 0.6, "secondary": 0.4},
                "time_split": {"morning": 0.25, "afternoon": 0.25, "evening": 0.3, "night": 0.2},
            },
            "ctr_cvr_config": {
                "base_ctr_by_intent": {"high": 0.08, "medium": 0.04, "low": 0.015},
                "base_cvr_by_intent": {"high": 0.12, "medium": 0.05, "low": 0.01},
            },
            "seasonality": {"monthly_factors": [1.0] * 12},
            "event_shocks": [],
            "fraud_rate": 0.02,
            "tracking_loss_rate": 0.05,
        },
    )
    
    return state


class TestSimulateDay:
    """Tests for single day simulation."""
    
    def test_basic_day_simulation(self):
        """Should complete without error."""
        state = create_test_state()
        rng = SeededRNG(12345)
        
        new_state, metrics, logs = simulate_day(state, [], 1, rng)
        
        assert new_state is not None
        assert metrics is not None
        assert metrics.day == 1
    
    def test_determinism_single_day(self):
        """Same inputs should produce same outputs."""
        state = create_test_state()
        
        rng1 = SeededRNG(12345)
        rng2 = SeededRNG(12345)
        
        new_state1, metrics1, _ = simulate_day(state, [], 1, rng1)
        new_state2, metrics2, _ = simulate_day(state, [], 1, rng2)
        
        assert metrics1.impressions == metrics2.impressions
        assert metrics1.clicks == metrics2.clicks
        assert metrics1.conversions == metrics2.conversions
        assert metrics1.cost == metrics2.cost
    
    def test_metrics_reasonable(self):
        """Metrics should be in reasonable ranges."""
        state = create_test_state()
        rng = SeededRNG(42)
        
        _, metrics, _ = simulate_day(state, [], 1, rng)
        
        # Basic sanity checks
        assert metrics.impressions >= 0
        assert metrics.clicks >= 0
        assert metrics.clicks <= metrics.impressions
        assert metrics.conversions >= 0
        assert metrics.conversions <= metrics.clicks
        assert metrics.cost >= 0
        assert 0 <= metrics.impression_share <= 1


class TestSimulateRun:
    """Tests for full simulation run."""
    
    def test_basic_run(self):
        """Should complete a multi-day run."""
        state = create_test_state()
        
        result = simulate_run(
            initial_state=state,
            actions_by_day={},
            seed=12345,
            n_days=5,
        )
        
        assert result.n_days == 5
        assert len(result.daily_metrics) == 5
        assert result.seed == 12345
    
    def test_determinism_full_run(self):
        """Same seed should produce identical runs."""
        state = create_test_state()
        
        result1 = simulate_run(state, {}, seed=12345, n_days=10)
        result2 = simulate_run(state, {}, seed=12345, n_days=10)
        
        # All daily metrics should match
        for m1, m2 in zip(result1.daily_metrics, result2.daily_metrics):
            assert m1.impressions == m2.impressions
            assert m1.clicks == m2.clicks
            assert m1.conversions == m2.conversions
            assert m1.cost == m2.cost
    
    def test_different_seeds_different_results(self):
        """Different seeds should produce different results."""
        state = create_test_state()
        
        result1 = simulate_run(state, {}, seed=12345, n_days=10)
        result2 = simulate_run(state, {}, seed=54321, n_days=10)
        
        # Results should differ
        metrics1 = [m.impressions for m in result1.daily_metrics]
        metrics2 = [m.impressions for m in result2.daily_metrics]
        
        assert metrics1 != metrics2
    
    def test_day_independence(self):
        """Running days 1-5 or 1-10 should have same results for days 1-5."""
        state = create_test_state()
        
        result_5days = simulate_run(state, {}, seed=12345, n_days=5)
        result_10days = simulate_run(state, {}, seed=12345, n_days=10)
        
        # First 5 days should be identical
        for i in range(5):
            m1 = result_5days.daily_metrics[i]
            m2 = result_10days.daily_metrics[i]
            
            assert m1.impressions == m2.impressions
            assert m1.clicks == m2.clicks
            assert m1.cost == m2.cost
    
    def test_metrics_accumulate(self):
        """Metrics should accumulate over days."""
        state = create_test_state()
        
        result = simulate_run(state, {}, seed=42, n_days=30)
        
        total_impressions = sum(m.impressions for m in result.daily_metrics)
        total_cost = sum(m.cost for m in result.daily_metrics)
        
        # Should have some activity
        assert total_impressions > 0
        # Cost should be reasonable relative to impressions
        if total_impressions > 0:
            assert total_cost >= 0


class TestCausalLogging:
    """Tests for causal logging."""
    
    def test_causal_log_exists(self):
        """Each day should have causal log."""
        state = create_test_state()
        
        result = simulate_run(state, {}, seed=12345, n_days=5)
        
        for metrics in result.daily_metrics:
            assert metrics.causal_log is not None
    
    def test_causal_weights_normalized(self):
        """Causal log weights should sum to approximately 1."""
        state = create_test_state()
        
        result = simulate_run(state, {}, seed=12345, n_days=5)
        
        for metrics in result.daily_metrics:
            if metrics.causal_log and metrics.causal_log.drivers:
                total = sum(metrics.causal_log.drivers.values())
                # Allow small floating point differences
                assert 0.99 <= total <= 1.01
