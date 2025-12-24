"""
Click and conversion models.

Implements CTR, CVR calculation with position multipliers, fatigue, fraud, and tracking loss.
"""
from dataclasses import dataclass
from adsim.rng import SeededRNG


# Position click-through rate multipliers (position 1 = 1.0)
DEFAULT_POSITION_MULTIPLIERS = {
    1: 1.0,
    2: 0.85,
    3: 0.70,
    4: 0.55,
    5: 0.40,
    6: 0.30,
    7: 0.22,
    8: 0.15,
}


@dataclass
class ClickResult:
    """Result of click simulation."""
    clicked: bool
    is_fraud: bool
    ctr_used: float
    ctr_components: dict[str, float]


@dataclass
class ConversionResult:
    """Result of conversion simulation."""
    converted: bool
    is_tracked: bool  # False if lost to tracking
    delay_days: int  # Conversion attribution delay
    cvr_used: float
    cvr_components: dict[str, float]


def get_position_multiplier(position: int) -> float:
    """Get CTR multiplier for a position."""
    if position <= 0:
        return 0.0
    return DEFAULT_POSITION_MULTIPLIERS.get(position, 0.1)


def compute_ctr(
    base_ctr: float,
    position: int,
    ad_strength: float,
    relevance: float,
    fatigue: float,
    noise_variance: float = 0.1,
    rng: SeededRNG | None = None,
) -> tuple[float, dict[str, float]]:
    """
    Compute CTR for an impression.
    
    Formula:
    CTR = baseCTR × posMult × (0.6 + 0.4×AdStrength) × (0.7 + 0.6×Rel) × (1 - 0.5×Fatigue) × Noise
    
    Args:
        base_ctr: Base CTR for the segment/intent
        position: Ad position (1-8)
        ad_strength: Ad strength score (0-1)
        relevance: Ad-keyword relevance (0-1)
        fatigue: Fatigue level (0-1)
        noise_variance: Variance for multiplicative noise
        rng: Random number generator
    
    Returns:
        (ctr, components) where components breaks down the multipliers
    """
    pos_mult = get_position_multiplier(position)
    ad_mult = 0.6 + 0.4 * ad_strength
    rel_mult = 0.7 + 0.6 * relevance
    fatigue_mult = 1.0 - 0.5 * fatigue
    
    # Apply noise if RNG provided
    if rng is not None:
        noise_mult = rng.noise(1.0, noise_variance)
    else:
        noise_mult = 1.0
    
    ctr = base_ctr * pos_mult * ad_mult * rel_mult * fatigue_mult * noise_mult
    ctr = max(0.0, min(1.0, ctr))  # Clamp to valid range
    
    components = {
        "base_ctr": base_ctr,
        "position_mult": pos_mult,
        "ad_strength_mult": ad_mult,
        "relevance_mult": rel_mult,
        "fatigue_mult": fatigue_mult,
        "noise_mult": noise_mult,
    }
    
    return ctr, components


def compute_cvr(
    base_cvr: float,
    landing_mult: float,
    offer_mult: float = 1.0,
    trust_mult: float = 1.0,
    quality_penalty: float = 0.0,
    noise_variance: float = 0.1,
    rng: SeededRNG | None = None,
) -> tuple[float, dict[str, float]]:
    """
    Compute CVR for a click.
    
    Formula:
    CVR = baseCVR × LandMult × OfferMult × TrustMult × Noise × (1 - QualityPenalty)
    
    Args:
        base_cvr: Base CVR for the segment/intent
        landing_mult: Landing page quality multiplier
        offer_mult: Offer strength multiplier
        trust_mult: Trust signals multiplier
        quality_penalty: Penalty from poor traffic quality (0-1)
        noise_variance: Variance for multiplicative noise
        rng: Random number generator
    
    Returns:
        (cvr, components) where components breaks down the multipliers
    """
    quality_mult = 1.0 - quality_penalty
    
    # Apply noise if RNG provided
    if rng is not None:
        noise_mult = rng.noise(1.0, noise_variance)
    else:
        noise_mult = 1.0
    
    cvr = base_cvr * landing_mult * offer_mult * trust_mult * noise_mult * quality_mult
    cvr = max(0.0, min(1.0, cvr))  # Clamp to valid range
    
    components = {
        "base_cvr": base_cvr,
        "landing_mult": landing_mult,
        "offer_mult": offer_mult,
        "trust_mult": trust_mult,
        "noise_mult": noise_mult,
        "quality_mult": quality_mult,
    }
    
    return cvr, components


def simulate_click(
    ctr: float,
    fraud_rate: float = 0.0,
    rng: SeededRNG | None = None,
) -> ClickResult:
    """
    Simulate whether an impression results in a click.
    
    Args:
        ctr: Click-through rate
        fraud_rate: Probability of fraud click
        rng: Random number generator
    
    Returns:
        ClickResult with outcome
    """
    if rng is None:
        # Deterministic fallback
        clicked = ctr >= 0.5
        is_fraud = False
    else:
        clicked = rng.bernoulli(ctr)
        is_fraud = clicked and rng.bernoulli(fraud_rate)
    
    return ClickResult(
        clicked=clicked,
        is_fraud=is_fraud,
        ctr_used=ctr,
        ctr_components={},
    )


def simulate_conversion(
    cvr: float,
    tracking_loss_rate: float = 0.0,
    max_delay_days: int = 7,
    rng: SeededRNG | None = None,
) -> ConversionResult:
    """
    Simulate whether a click results in a conversion.
    
    Args:
        cvr: Conversion rate
        tracking_loss_rate: Probability conversion isn't tracked
        max_delay_days: Maximum conversion delay
        rng: Random number generator
    
    Returns:
        ConversionResult with outcome
    """
    if rng is None:
        # Deterministic fallback
        converted = cvr >= 0.5
        is_tracked = True
        delay_days = 0
    else:
        converted = rng.bernoulli(cvr)
        
        if converted:
            # Check tracking loss
            is_tracked = not rng.bernoulli(tracking_loss_rate)
            
            # Conversion delay (exponential decay distribution)
            # Most conversions happen same day, some delayed
            delay_probs = [0.5, 0.25, 0.12, 0.07, 0.03, 0.02, 0.01]
            delay_probs = delay_probs[:max_delay_days]
            # Normalize
            total = sum(delay_probs)
            delay_probs = [p / total for p in delay_probs]
            delay_days = rng.choices(range(len(delay_probs)), delay_probs)[0]
        else:
            is_tracked = True
            delay_days = 0
    
    return ConversionResult(
        converted=converted,
        is_tracked=is_tracked,
        delay_days=delay_days,
        cvr_used=cvr,
        cvr_components={},
    )


@dataclass
class FatigueState:
    """Fatigue tracking for an advertiser-segment pair."""
    impressions_today: int = 0
    cumulative_fatigue: float = 0.0
    scale: float = 1200.0
    decay_rate: float = 0.92
    
    def add_impressions(self, count: int) -> None:
        """Add impressions for today."""
        self.impressions_today += count
        self.cumulative_fatigue += count / self.scale
        self.cumulative_fatigue = min(1.0, self.cumulative_fatigue)
    
    def end_day(self) -> None:
        """Apply daily decay and reset daily counter."""
        self.cumulative_fatigue *= self.decay_rate
        self.impressions_today = 0
    
    @property
    def fatigue_level(self) -> float:
        """Current fatigue level (0-1)."""
        return self.cumulative_fatigue


def calculate_landing_multiplier(
    relevance_score: float,
    load_time_ms: float,
    mobile_score: float,
    is_mobile: bool,
) -> float:
    """
    Calculate landing page CVR multiplier.
    
    Args:
        relevance_score: Landing page relevance (0-1)
        load_time_ms: Page load time
        mobile_score: Mobile experience score (0-1)
        is_mobile: Whether user is on mobile
    
    Returns:
        Multiplier for CVR (0.5-1.5 range typically)
    """
    # Load time impact
    if load_time_ms < 1500:
        load_mult = 1.1
    elif load_time_ms < 2500:
        load_mult = 1.0
    elif load_time_ms < 4000:
        load_mult = 0.85
    else:
        load_mult = 0.7
    
    # Mobile impact
    if is_mobile:
        mobile_mult = 0.8 + 0.4 * mobile_score
    else:
        mobile_mult = 1.0
    
    # Relevance impact
    relevance_mult = 0.6 + 0.6 * relevance_score
    
    return load_mult * mobile_mult * relevance_mult
