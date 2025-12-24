# AdSim Simulation Engine

Pure Python simulation engine for advertising scenarios.

## Features

- Deterministic RNG via seed
- 48-segment simulation (intent × device × time × geo)
- Keyword-query matching (exact/phrase/broad)
- Google-like auction engine
- Quality score system
- CTR/CVR models with fatigue
- Causal logging

## Installation

```bash
pip install -e .
```

## Usage

```python
from adsim import simulate_run, SimState, SeededRNG

# Create initial state
state = SimState(...)
rng = SeededRNG(seed=12345)

# Run simulation
result = simulate_run(
    initial_state=state,
    actions_by_day={},
    seed=12345,
    n_days=30
)
```

## Testing

```bash
pytest -v
```
