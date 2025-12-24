"""
Deterministic RNG wrapper for reproducible simulations.

Provides a seeded random number generator that ensures identical
results given the same seed and sequence of calls.
"""
import random
from dataclasses import dataclass, field
from typing import TypeVar, Sequence

T = TypeVar("T")


@dataclass
class SeededRNG:
    """
    Deterministic random number generator wrapper.
    
    Uses Python's Mersenne Twister via the random module with a fixed seed.
    All random operations should go through this class for reproducibility.
    
    Attributes:
        seed: The integer seed for reproducibility
        _rng: Internal Random instance
    """
    seed: int
    _rng: random.Random = field(init=False, repr=False)
    
    def __post_init__(self):
        """Initialize the internal RNG with the seed."""
        self._rng = random.Random(self.seed)
    
    def random(self) -> float:
        """Return a random float in [0.0, 1.0)."""
        return self._rng.random()
    
    def uniform(self, a: float, b: float) -> float:
        """Return a random float N such that a <= N <= b."""
        return self._rng.uniform(a, b)
    
    def gauss(self, mu: float, sigma: float) -> float:
        """Return a random float from Gaussian distribution."""
        return self._rng.gauss(mu, sigma)
    
    def randint(self, a: int, b: int) -> int:
        """Return random integer N such that a <= N <= b."""
        return self._rng.randint(a, b)
    
    def choice(self, seq: Sequence[T]) -> T:
        """Return a random element from the non-empty sequence."""
        return self._rng.choice(seq)
    
    def choices(self, population: Sequence[T], weights: list[float] | None = None, k: int = 1) -> list[T]:
        """Return k sized list of elements chosen with optional weights."""
        return self._rng.choices(population, weights=weights, k=k)
    
    def sample(self, population: Sequence[T], k: int) -> list[T]:
        """Return k unique elements from the population."""
        return self._rng.sample(population, k)
    
    def shuffle(self, seq: list[T]) -> None:
        """Shuffle list in place."""
        self._rng.shuffle(seq)
    
    def noise(self, base: float, variance: float = 0.1) -> float:
        """
        Apply multiplicative noise to a base value.
        
        Args:
            base: The base value to apply noise to
            variance: The variance of the noise (default 0.1 = ±10%)
        
        Returns:
            base * (1 + noise) where noise is in [-variance, variance]
        """
        noise = self.uniform(-variance, variance)
        return base * (1 + noise)
    
    def bernoulli(self, p: float) -> bool:
        """
        Return True with probability p.
        
        Args:
            p: Probability of returning True (0.0 to 1.0)
        
        Returns:
            Boolean result
        """
        return self.random() < p
    
    def fork(self, offset: int = 0) -> "SeededRNG":
        """
        Create a new RNG with a derived seed.
        
        Useful for creating independent RNG streams for different
        parts of the simulation while maintaining determinism.
        
        Args:
            offset: Offset to add to create derived seed
        
        Returns:
            New SeededRNG instance
        """
        derived_seed = self.seed + offset + self.randint(0, 2**31)
        return SeededRNG(seed=derived_seed)
    
    def get_state(self) -> tuple:
        """Get the internal state for serialization."""
        return self._rng.getstate()
    
    def set_state(self, state: tuple) -> None:
        """Restore internal state from serialization."""
        self._rng.setstate(state)


def create_day_rng(base_seed: int, day: int) -> SeededRNG:
    """
    Create a deterministic RNG for a specific day.
    
    This ensures that simulating day N always produces the same
    results regardless of whether previous days were simulated.
    
    Args:
        base_seed: The run's base seed
        day: The day number (1-indexed)
    
    Returns:
        SeededRNG for this specific day
    """
    # Combine base seed with day to create unique but deterministic seed
    day_seed = base_seed * 1000000 + day
    return SeededRNG(seed=day_seed)
