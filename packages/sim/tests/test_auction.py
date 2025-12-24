"""
Tests for auction engine.
"""
import pytest
from adsim.auction import (
    AuctionEntry, run_auction, softmax_positions, calculate_cpc,
    calculate_impression_share,
)
from adsim.rng import SeededRNG


class TestSoftmaxPositions:
    """Tests for softmax position allocation."""
    
    def test_determinism(self):
        """Same seed should produce same positions."""
        ad_ranks = [10.0, 8.0, 6.0, 4.0]
        
        rng1 = SeededRNG(42)
        rng2 = SeededRNG(42)
        
        pos1 = softmax_positions(ad_ranks, tau=0.65, rng=rng1)
        pos2 = softmax_positions(ad_ranks, tau=0.65, rng=rng2)
        
        assert pos1 == pos2
    
    def test_all_unique_positions(self):
        """Each entry should get unique position."""
        ad_ranks = [10.0, 8.0, 6.0, 4.0]
        rng = SeededRNG(42)
        
        positions = softmax_positions(ad_ranks, rng=rng)
        
        assert len(set(positions)) == len(positions)
        assert all(1 <= p <= len(ad_ranks) for p in positions)
    
    def test_higher_rank_better_position_trend(self):
        """Higher AdRank should tend to get better positions over many runs."""
        ad_ranks = [10.0, 5.0, 2.0]
        
        position_sums = [0, 0, 0]
        n_runs = 1000
        
        for seed in range(n_runs):
            rng = SeededRNG(seed)
            positions = softmax_positions(ad_ranks, tau=0.65, rng=rng)
            for i, pos in enumerate(positions):
                position_sums[i] += pos
        
        avg_positions = [s / n_runs for s in position_sums]
        
        # Highest AdRank should have lowest average position (best)
        assert avg_positions[0] < avg_positions[1] < avg_positions[2]
    
    def test_empty_list(self):
        """Empty list should return empty."""
        assert softmax_positions([]) == []
    
    def test_single_entry(self):
        """Single entry should get position 1."""
        assert softmax_positions([10.0]) == [1]


class TestCalculateCPC:
    """Tests for CPC calculation."""
    
    def test_basic_calculation(self):
        """CPC should be based on next AdRank divided by winner's factors."""
        cpc = calculate_cpc(
            winner_ad_rank=10.0,
            winner_qs=0.8,
            winner_context=1.0,
            next_ad_rank=6.0,
            epsilon=0.01,
        )
        
        # CPC = 6.0 / (0.8 * 1.0) + 0.01 = 7.5 + 0.01 = 7.51
        assert abs(cpc - 7.51) < 0.01
    
    def test_min_cpc_floor(self):
        """CPC should not go below minimum."""
        cpc = calculate_cpc(
            winner_ad_rank=10.0,
            winner_qs=0.8,
            winner_context=1.0,
            next_ad_rank=0.001,  # Very low next rank
            min_cpc=0.05,
        )
        
        assert cpc >= 0.05
    
    def test_higher_qs_lower_cpc(self):
        """Higher QS should result in lower CPC."""
        cpc_low_qs = calculate_cpc(
            winner_ad_rank=10.0,
            winner_qs=0.5,
            winner_context=1.0,
            next_ad_rank=6.0,
        )
        
        cpc_high_qs = calculate_cpc(
            winner_ad_rank=10.0,
            winner_qs=0.9,
            winner_context=1.0,
            next_ad_rank=6.0,
        )
        
        assert cpc_high_qs < cpc_low_qs


class TestRunAuction:
    """Tests for complete auction."""
    
    def test_basic_auction(self):
        """Basic auction should work."""
        entries = [
            AuctionEntry("adv1", "kw1", "ad1", bid=5.0, quality_score=0.8),
            AuctionEntry("adv2", "kw2", "ad2", bid=4.0, quality_score=0.7),
            AuctionEntry("adv3", "kw3", "ad3", bid=3.0, quality_score=0.6),
        ]
        
        result = run_auction(entries, "test query", rng=SeededRNG(42))
        
        assert result.total_eligible >= 1
        assert result.total_shown >= 1
        assert len(result.positions) == 3
    
    def test_determinism(self):
        """Same inputs and seed should produce same result."""
        entries = [
            AuctionEntry("adv1", "kw1", "ad1", bid=5.0, quality_score=0.8),
            AuctionEntry("adv2", "kw2", "ad2", bid=4.0, quality_score=0.7),
        ]
        
        result1 = run_auction(entries, "test query", rng=SeededRNG(42))
        result2 = run_auction(entries, "test query", rng=SeededRNG(42))
        
        pos1 = [(p.advertiser_id, p.position, p.cpc) for p in result1.positions]
        pos2 = [(p.advertiser_id, p.position, p.cpc) for p in result2.positions]
        
        assert pos1 == pos2
    
    def test_budget_exclusion(self):
        """Advertisers with no budget should be excluded."""
        entries = [
            AuctionEntry("adv1", "kw1", "ad1", bid=5.0, quality_score=0.8),
            AuctionEntry("adv2", "kw2", "ad2", bid=4.0, quality_score=0.7),
        ]
        
        budget_remaining = {"adv1": 0.0, "adv2": 100.0}
        
        result = run_auction(
            entries, "test query",
            budget_remaining=budget_remaining,
            rng=SeededRNG(42),
        )
        
        # adv1 should be excluded
        adv1_pos = next(p for p in result.positions if p.advertiser_id == "adv1")
        assert adv1_pos.won_auction is False
        assert adv1_pos.loss_reason == "budget"
    
    def test_min_ad_rank_threshold(self):
        """Entries below min AdRank should be excluded."""
        entries = [
            AuctionEntry("adv1", "kw1", "ad1", bid=5.0, quality_score=0.8),  # AdRank = 4.0
            AuctionEntry("adv2", "kw2", "ad2", bid=0.1, quality_score=0.1),  # AdRank = 0.01
        ]
        
        result = run_auction(
            entries, "test query",
            min_ad_rank=0.1,
            rng=SeededRNG(42),
        )
        
        # adv2 should be excluded due to low rank
        adv2_pos = next(p for p in result.positions if p.advertiser_id == "adv2")
        assert adv2_pos.won_auction is False
        assert adv2_pos.loss_reason == "rank"
    
    def test_cpc_monotonicity(self):
        """Higher bid should generally get more impressions over many auctions."""
        # This is a statistical test over many auctions
        entries_high_bid = [
            AuctionEntry("user", "kw1", "ad1", bid=10.0, quality_score=0.7),
            AuctionEntry("comp1", "kw2", "ad2", bid=5.0, quality_score=0.7),
            AuctionEntry("comp2", "kw3", "ad3", bid=3.0, quality_score=0.7),
        ]
        
        entries_low_bid = [
            AuctionEntry("user", "kw1", "ad1", bid=2.0, quality_score=0.7),  # Lower bid
            AuctionEntry("comp1", "kw2", "ad2", bid=5.0, quality_score=0.7),
            AuctionEntry("comp2", "kw3", "ad3", bid=3.0, quality_score=0.7),
        ]
        
        wins_high = 0
        wins_low = 0
        
        for seed in range(100):
            result_high = run_auction(entries_high_bid, "q", rng=SeededRNG(seed))
            result_low = run_auction(entries_low_bid, "q", rng=SeededRNG(seed))
            
            user_high = result_high.get_user_position("user")
            user_low = result_low.get_user_position("user")
            
            if user_high and user_high.won_auction:
                wins_high += 1
            if user_low and user_low.won_auction:
                wins_low += 1
        
        # Higher bid should win more often
        assert wins_high >= wins_low


class TestImpressionShare:
    """Tests for impression share calculation."""
    
    def test_full_share(self):
        """100% impression share when winning all auctions."""
        share, budget_loss, rank_loss = calculate_impression_share(
            user_impressions=100,
            total_eligible_auctions=100,
            lost_to_budget=0,
            lost_to_rank=0,
        )
        
        assert share == 1.0
        assert budget_loss == 0.0
        assert rank_loss == 0.0
    
    def test_partial_share(self):
        """Calculate partial impression share correctly."""
        share, budget_loss, rank_loss = calculate_impression_share(
            user_impressions=50,
            total_eligible_auctions=100,
            lost_to_budget=30,
            lost_to_rank=20,
        )
        
        assert share == 0.5
        assert budget_loss == 0.3
        assert rank_loss == 0.2
    
    def test_zero_eligible(self):
        """Handle zero eligible auctions."""
        share, budget_loss, rank_loss = calculate_impression_share(
            user_impressions=0,
            total_eligible_auctions=0,
            lost_to_budget=0,
            lost_to_rank=0,
        )
        
        assert share == 0.0
        assert budget_loss == 0.0
        assert rank_loss == 0.0
