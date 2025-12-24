"""
Quality Score system.

Implements the stateful quality score with ECTR, ad relevance, and landing experience.
"""
from dataclasses import dataclass, field


@dataclass
class QualityScoreState:
    """
    Stateful quality score for a keyword.
    
    Components (all 0-1 scale):
    - ectr: Expected CTR based on historical performance
    - ad_relevance: Keyword-to-ad relevance score
    - landing_exp: Landing page experience score
    
    Also tracks EMA for actual CTR and CVR.
    """
    # QS components (0-1)
    ectr: float = 0.5
    ad_relevance: float = 0.5
    landing_exp: float = 0.5
    
    # Running EMAs for actual performance
    ctr_ema: float = 0.0
    cvr_ema: float = 0.0
    
    # Configuration
    ema_alpha: float = 0.1
    weights: dict[str, float] = field(default_factory=lambda: {
        "ectr": 0.40,
        "relevance": 0.35,
        "landing": 0.25,
    })
    
    # Learning phase tracking
    impressions_seen: int = 0
    learning_phase_threshold: int = 1000
    
    def score(self) -> float:
        """
        Calculate the composite quality score (0-1).
        
        QS = clamp(w1*ECTR + w2*Relevance + w3*Landing, 0, 1)
        """
        raw_score = (
            self.weights["ectr"] * self.ectr +
            self.weights["relevance"] * self.ad_relevance +
            self.weights["landing"] * self.landing_exp
        )
        return max(0.0, min(1.0, raw_score))
    
    def display_score(self) -> int:
        """
        Map internal 0-1 score to display 1-10 scale.
        
        Uses a non-linear mapping that clusters around 5-7.
        """
        internal = self.score()
        # Non-linear mapping
        if internal < 0.2:
            return 1
        elif internal < 0.3:
            return 2
        elif internal < 0.4:
            return 3
        elif internal < 0.5:
            return 4
        elif internal < 0.55:
            return 5
        elif internal < 0.6:
            return 6
        elif internal < 0.7:
            return 7
        elif internal < 0.8:
            return 8
        elif internal < 0.9:
            return 9
        else:
            return 10
    
    @property
    def in_learning_phase(self) -> bool:
        """Check if still in learning phase."""
        return self.impressions_seen < self.learning_phase_threshold
    
    def update_ctr_ema(self, actual_ctr: float) -> None:
        """
        Update CTR EMA with new observation.
        
        During learning phase, uses higher alpha for faster adaptation.
        """
        alpha = self.ema_alpha * 2 if self.in_learning_phase else self.ema_alpha
        self.ctr_ema = alpha * actual_ctr + (1 - alpha) * self.ctr_ema
    
    def update_cvr_ema(self, actual_cvr: float) -> None:
        """Update CVR EMA with new observation."""
        alpha = self.ema_alpha * 2 if self.in_learning_phase else self.ema_alpha
        self.cvr_ema = alpha * actual_cvr + (1 - alpha) * self.cvr_ema
    
    def update_ectr(self) -> None:
        """
        Update ECTR based on CTR EMA.
        
        ECTR moves toward CTR EMA but with dampening.
        """
        # Blend current ECTR with CTR EMA
        blend = 0.3 if self.in_learning_phase else 0.15
        self.ectr = (1 - blend) * self.ectr + blend * self.ctr_ema
        self.ectr = max(0.0, min(1.0, self.ectr))
    
    def add_impressions(self, count: int) -> None:
        """Record impressions seen."""
        self.impressions_seen += count
    
    def update_from_day(
        self,
        impressions: int,
        clicks: int,
        conversions: int,
    ) -> None:
        """
        Update quality score state from daily metrics.
        
        Args:
            impressions: Number of impressions
            clicks: Number of clicks
            conversions: Number of conversions
        """
        if impressions > 0:
            self.add_impressions(impressions)
            
            # Update CTR EMA
            actual_ctr = clicks / impressions
            self.update_ctr_ema(actual_ctr)
            
            # Update ECTR
            self.update_ectr()
            
            # Update CVR EMA if we had clicks
            if clicks > 0:
                actual_cvr = conversions / clicks
                self.update_cvr_ema(actual_cvr)
    
    def apply_relevance_update(self, delta: float) -> None:
        """
        Apply a relevance update (positive or negative).
        
        Used when ad copy changes or keyword-ad alignment improves.
        """
        self.ad_relevance = max(0.0, min(1.0, self.ad_relevance + delta))
    
    def apply_landing_update(self, delta: float) -> None:
        """
        Apply a landing page experience update.
        
        Used when landing page changes.
        """
        self.landing_exp = max(0.0, min(1.0, self.landing_exp + delta))


def create_initial_qs(
    keyword_relevance: float = 0.5,
    ad_relevance: float = 0.5,
    landing_score: float = 0.7,
) -> QualityScoreState:
    """
    Create initial quality score state for a new keyword.
    
    Args:
        keyword_relevance: How well the keyword matches the ad group theme
        ad_relevance: How relevant the ad is to the keyword
        landing_score: Landing page experience score
    
    Returns:
        Initial QualityScoreState
    """
    return QualityScoreState(
        ectr=0.5,  # Start neutral
        ad_relevance=ad_relevance,
        landing_exp=landing_score,
    )


def calculate_landing_experience(
    relevance_score: float,
    load_time_ms: float,
    mobile_score: float,
    is_mobile: bool,
) -> float:
    """
    Calculate landing page experience score.
    
    Args:
        relevance_score: Content relevance (0-1)
        load_time_ms: Page load time in milliseconds
        mobile_score: Mobile-friendliness (0-1)
        is_mobile: Whether the user is on mobile
    
    Returns:
        Landing experience score (0-1)
    """
    # Load time penalty
    if load_time_ms < 1000:
        load_score = 1.0
    elif load_time_ms < 2000:
        load_score = 0.9
    elif load_time_ms < 3000:
        load_score = 0.7
    elif load_time_ms < 5000:
        load_score = 0.5
    else:
        load_score = 0.3
    
    # Mobile adjustment
    if is_mobile:
        device_score = mobile_score
    else:
        device_score = 1.0
    
    # Combine factors
    experience = relevance_score * 0.5 + load_score * 0.3 + device_score * 0.2
    
    return max(0.0, min(1.0, experience))
