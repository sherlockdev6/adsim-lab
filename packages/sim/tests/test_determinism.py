"""
Tests for deterministic RNG.

Verifies that same seed produces identical sequences.
"""
import pytest
from adsim.rng import SeededRNG, create_day_rng


class TestSeededRNG:
    """Tests for SeededRNG class."""
    
    def test_same_seed_same_sequence(self):
        """Same seed must produce identical random sequences."""
        seed = 12345
        
        rng1 = SeededRNG(seed)
        rng2 = SeededRNG(seed)
        
        # Generate sequences
        seq1 = [rng1.random() for _ in range(100)]
        seq2 = [rng2.random() for _ in range(100)]
        
        assert seq1 == seq2, "Same seed must produce identical sequences"
    
    def test_different_seeds_different_sequences(self):
        """Different seeds must produce different sequences."""
        rng1 = SeededRNG(12345)
        rng2 = SeededRNG(54321)
        
        seq1 = [rng1.random() for _ in range(100)]
        seq2 = [rng2.random() for _ in range(100)]
        
        assert seq1 != seq2, "Different seeds must produce different sequences"
    
    def test_uniform_range(self):
        """uniform() must return values in specified range."""
        rng = SeededRNG(42)
        
        for _ in range(100):
            value = rng.uniform(5.0, 10.0)
            assert 5.0 <= value <= 10.0
    
    def test_randint_range(self):
        """randint() must return values in specified range."""
        rng = SeededRNG(42)
        
        for _ in range(100):
            value = rng.randint(1, 6)
            assert 1 <= value <= 6
    
    def test_choice_from_list(self):
        """choice() must return element from list."""
        rng = SeededRNG(42)
        options = ["a", "b", "c", "d"]
        
        for _ in range(100):
            value = rng.choice(options)
            assert value in options
    
    def test_bernoulli_probability(self):
        """bernoulli() must respect probability."""
        rng = SeededRNG(42)
        
        # Test p=0 always returns False
        for _ in range(100):
            assert rng.bernoulli(0.0) is False
        
        # Test p=1 always returns True
        rng2 = SeededRNG(42)
        for _ in range(100):
            assert rng2.bernoulli(1.0) is True
    
    def test_noise_around_base(self):
        """noise() must apply multiplicative noise around base value."""
        rng = SeededRNG(42)
        base = 100.0
        variance = 0.1
        
        values = [rng.noise(base, variance) for _ in range(1000)]
        
        # All values should be within expected range
        for v in values:
            assert base * 0.9 <= v <= base * 1.1
        
        # Average should be close to base
        avg = sum(values) / len(values)
        assert 95 <= avg <= 105
    
    def test_fork_determinism(self):
        """fork() must produce deterministic child RNGs."""
        rng1 = SeededRNG(42)
        rng2 = SeededRNG(42)
        
        child1 = rng1.fork(offset=1)
        child2 = rng2.fork(offset=1)
        
        seq1 = [child1.random() for _ in range(50)]
        seq2 = [child2.random() for _ in range(50)]
        
        assert seq1 == seq2
    
    def test_state_save_restore(self):
        """State save/restore must work correctly."""
        rng = SeededRNG(42)
        
        # Generate some values
        _ = [rng.random() for _ in range(10)]
        
        # Save state
        state = rng.get_state()
        
        # Generate more values
        seq1 = [rng.random() for _ in range(10)]
        
        # Restore state
        rng.set_state(state)
        
        # Should get same values
        seq2 = [rng.random() for _ in range(10)]
        
        assert seq1 == seq2


class TestCreateDayRNG:
    """Tests for create_day_rng function."""
    
    def test_same_day_same_rng(self):
        """Same base seed and day must produce identical RNG."""
        rng1 = create_day_rng(base_seed=12345, day=5)
        rng2 = create_day_rng(base_seed=12345, day=5)
        
        seq1 = [rng1.random() for _ in range(100)]
        seq2 = [rng2.random() for _ in range(100)]
        
        assert seq1 == seq2
    
    def test_different_days_different_rng(self):
        """Different days must produce different RNGs."""
        rng1 = create_day_rng(base_seed=12345, day=5)
        rng2 = create_day_rng(base_seed=12345, day=6)
        
        seq1 = [rng1.random() for _ in range(100)]
        seq2 = [rng2.random() for _ in range(100)]
        
        assert seq1 != seq2
    
    def test_day_independence(self):
        """Simulating day N should not affect day N+1's RNG."""
        base_seed = 12345
        
        # Create day 5 RNG and use it
        rng_day5 = create_day_rng(base_seed, day=5)
        _ = [rng_day5.random() for _ in range(1000)]
        
        # Create day 6 RNG - should be unaffected
        rng_day6_a = create_day_rng(base_seed, day=6)
        
        # Compare with fresh day 6 RNG
        rng_day6_b = create_day_rng(base_seed, day=6)
        
        seq_a = [rng_day6_a.random() for _ in range(100)]
        seq_b = [rng_day6_b.random() for _ in range(100)]
        
        assert seq_a == seq_b
