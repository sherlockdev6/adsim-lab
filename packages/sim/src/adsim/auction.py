"""
Auction engine.

Implements Google Search-like auction with AdRank, position allocation,
and CPC calculation using generalized second price.
"""
from dataclasses import dataclass, field
import math
from adsim.rng import SeededRNG


@dataclass
class AuctionEntry:
    """An entry in the auction (one advertiser's bid)."""
    advertiser_id: str
    keyword_id: str
    ad_id: str
    bid: float
    quality_score: float  # 0-1 internal scale
    context_factor: float = 1.0  # Location/time relevance
    format_factor: float = 1.0  # Ad extensions, etc.
    
    @property
    def ad_rank(self) -> float:
        """Calculate AdRank = Bid × QS × Context × Format."""
        return self.bid * self.quality_score * self.context_factor * self.format_factor


@dataclass
class AuctionPosition:
    """Result for an advertiser in the auction."""
    advertiser_id: str
    keyword_id: str
    ad_id: str
    position: int  # 1-indexed, 0 means not shown
    ad_rank: float
    cpc: float  # Cost per click
    won_auction: bool
    loss_reason: str | None = None  # "budget", "rank", None


@dataclass
class AuctionResult:
    """Complete auction result."""
    query: str
    positions: list[AuctionPosition]
    total_eligible: int
    total_shown: int
    
    def get_user_position(self, user_advertiser_id: str) -> AuctionPosition | None:
        """Get the user's position in this auction."""
        for pos in self.positions:
            if pos.advertiser_id == user_advertiser_id:
                return pos
        return None


def softmax_positions(
    ad_ranks: list[float],
    tau: float = 0.65,
    rng: SeededRNG | None = None,
) -> list[int]:
    """
    Allocate positions using softmax probabilities.
    
    Higher AdRank = higher probability of better position,
    but not deterministic. This models Google's probabilistic
    allocation.
    
    Args:
        ad_ranks: List of AdRank values
        tau: Temperature parameter (lower = more deterministic)
        rng: Random number generator
    
    Returns:
        List of positions (1-indexed, lower is better)
    """
    n = len(ad_ranks)
    if n == 0:
        return []
    if n == 1:
        return [1]
    
    # For deterministic fallback
    if rng is None:
        # Sort by ad_rank descending and assign positions
        sorted_indices = sorted(range(n), key=lambda i: -ad_ranks[i])
        positions = [0] * n
        for pos, idx in enumerate(sorted_indices, 1):
            positions[idx] = pos
        return positions
    
    # Softmax probabilities
    max_rank = max(ad_ranks)
    exp_ranks = [math.exp((r - max_rank) / tau) for r in ad_ranks]
    sum_exp = sum(exp_ranks)
    probs = [e / sum_exp for e in exp_ranks]
    
    # Allocate positions probabilistically
    positions = [0] * n
    remaining_indices = list(range(n))
    
    for position in range(1, n + 1):
        if not remaining_indices:
            break
            
        # Get probabilities for remaining candidates
        remaining_probs = [probs[i] for i in remaining_indices]
        total_prob = sum(remaining_probs)
        if total_prob <= 0:
            # Fallback to uniform
            remaining_probs = [1.0 / len(remaining_indices)] * len(remaining_indices)
        else:
            remaining_probs = [p / total_prob for p in remaining_probs]
        
        # Sample winner for this position
        winner_local_idx = rng.choices(range(len(remaining_indices)), remaining_probs)[0]
        winner_idx = remaining_indices[winner_local_idx]
        
        positions[winner_idx] = position
        remaining_indices.remove(winner_idx)
    
    return positions


def calculate_cpc(
    winner_ad_rank: float,
    winner_qs: float,
    winner_context: float,
    next_ad_rank: float,
    min_cpc: float = 0.01,
    epsilon: float = 0.01,
) -> float:
    """
    Calculate CPC using generalized second price auction.
    
    CPC = (AdRank_next / (QS_you × Context_you)) + epsilon
    
    Args:
        winner_ad_rank: Winner's AdRank
        winner_qs: Winner's quality score
        winner_context: Winner's context factor
        next_ad_rank: Next highest AdRank
        min_cpc: Minimum CPC floor
        epsilon: Small increment added to CPC
    
    Returns:
        Cost per click
    """
    denominator = winner_qs * winner_context
    if denominator <= 0:
        return min_cpc
    
    cpc = (next_ad_rank / denominator) + epsilon
    return max(min_cpc, cpc)


def run_auction(
    entries: list[AuctionEntry],
    query: str,
    max_positions: int = 8,
    min_ad_rank: float = 0.1,
    budget_remaining: dict[str, float] | None = None,
    rng: SeededRNG | None = None,
) -> AuctionResult:
    """
    Run a single auction for a query.
    
    Args:
        entries: List of auction entries (bids from advertisers)
        query: The search query
        max_positions: Maximum ad positions to show
        min_ad_rank: Minimum AdRank to qualify for auction
        budget_remaining: Dict of advertiser_id -> remaining daily budget
        rng: Random number generator for probabilistic positioning
    
    Returns:
        AuctionResult with positions and CPCs
    """
    if not entries:
        return AuctionResult(
            query=query,
            positions=[],
            total_eligible=0,
            total_shown=0,
        )
    
    # Filter by minimum AdRank
    eligible = [e for e in entries if e.ad_rank >= min_ad_rank]
    
    # Filter by budget
    positions_list: list[AuctionPosition] = []
    budget_excluded = []
    
    if budget_remaining is not None:
        for entry in entries:
            if entry not in eligible:
                continue
            remaining = budget_remaining.get(entry.advertiser_id, float('inf'))
            if remaining <= 0:
                budget_excluded.append(entry)
        eligible = [e for e in eligible if e not in budget_excluded]
    
    # Create positions for budget-excluded entries
    for entry in budget_excluded:
        positions_list.append(AuctionPosition(
            advertiser_id=entry.advertiser_id,
            keyword_id=entry.keyword_id,
            ad_id=entry.ad_id,
            position=0,
            ad_rank=entry.ad_rank,
            cpc=0,
            won_auction=False,
            loss_reason="budget",
        ))
    
    # Create positions for rank-excluded entries
    rank_excluded = [e for e in entries if e.ad_rank < min_ad_rank]
    for entry in rank_excluded:
        positions_list.append(AuctionPosition(
            advertiser_id=entry.advertiser_id,
            keyword_id=entry.keyword_id,
            ad_id=entry.ad_id,
            position=0,
            ad_rank=entry.ad_rank,
            cpc=0,
            won_auction=False,
            loss_reason="rank",
        ))
    
    if not eligible:
        return AuctionResult(
            query=query,
            positions=positions_list,
            total_eligible=0,
            total_shown=0,
        )
    
    # Sort by AdRank for position allocation
    sorted_eligible = sorted(eligible, key=lambda e: -e.ad_rank)
    
    # Limit to max positions
    shown = sorted_eligible[:max_positions]
    not_shown = sorted_eligible[max_positions:]
    
    # Allocate positions
    ad_ranks = [e.ad_rank for e in shown]
    allocated_positions = softmax_positions(ad_ranks, tau=0.65, rng=rng)
    
    # Calculate CPCs
    for i, entry in enumerate(shown):
        position = allocated_positions[i]
        
        # Find next highest AdRank for CPC calculation
        # Use the entry at position+1 (or min threshold if last)
        next_ad_rank = min_ad_rank
        for j, other_entry in enumerate(shown):
            if allocated_positions[j] == position + 1:
                next_ad_rank = other_entry.ad_rank
                break
        
        cpc = calculate_cpc(
            winner_ad_rank=entry.ad_rank,
            winner_qs=entry.quality_score,
            winner_context=entry.context_factor,
            next_ad_rank=next_ad_rank,
        )
        
        positions_list.append(AuctionPosition(
            advertiser_id=entry.advertiser_id,
            keyword_id=entry.keyword_id,
            ad_id=entry.ad_id,
            position=position,
            ad_rank=entry.ad_rank,
            cpc=cpc,
            won_auction=True,
        ))
    
    # Entries that were eligible but didn't get a position
    for entry in not_shown:
        positions_list.append(AuctionPosition(
            advertiser_id=entry.advertiser_id,
            keyword_id=entry.keyword_id,
            ad_id=entry.ad_id,
            position=0,
            ad_rank=entry.ad_rank,
            cpc=0,
            won_auction=False,
            loss_reason="rank",  # Lost due to lower rank
        ))
    
    return AuctionResult(
        query=query,
        positions=positions_list,
        total_eligible=len(eligible),
        total_shown=len(shown),
    )


def calculate_impression_share(
    user_impressions: int,
    total_eligible_auctions: int,
    lost_to_budget: int,
    lost_to_rank: int,
) -> tuple[float, float, float]:
    """
    Calculate impression share and loss breakdown.
    
    Args:
        user_impressions: Impressions won by user
        total_eligible_auctions: Total auctions user was eligible for
        lost_to_budget: Auctions lost due to budget
        lost_to_rank: Auctions lost due to rank
    
    Returns:
        (impression_share, lost_is_budget, lost_is_rank) all as 0-1
    """
    if total_eligible_auctions == 0:
        return 0.0, 0.0, 0.0
    
    impression_share = user_impressions / total_eligible_auctions
    lost_is_budget = lost_to_budget / total_eligible_auctions
    lost_is_rank = lost_to_rank / total_eligible_auctions
    
    return impression_share, lost_is_budget, lost_is_rank
