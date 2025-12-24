# AdSim Lab

A production-ready advertising simulation platform for UAE market scenarios with deterministic simulation capabilities.

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 20+ (for local frontend development)
- Python 3.12+ (for local backend development)

### 1. Clone and Setup Environment

```bash
cd adlab
cp .env.example .env
```

### 2. Start All Services

```bash
docker-compose up -d
```

This starts:
- **PostgreSQL** (port 5432) - Database
- **Redis** (port 6379) - Celery broker
- **API** (port 8000) - FastAPI backend
- **Worker** - Celery worker for simulation jobs
- **Web** (port 3000) - Next.js frontend

### 3. Verify Services

```bash
# Check all containers are running
docker-compose ps

# Test API health
curl http://localhost:8000/health

# View API docs
open http://localhost:8000/docs

# View frontend
open http://localhost:3000
```

### 4. Run Database Migrations

```bash
docker-compose exec api alembic upgrade head
```

### 5. Load Seed Data (Scenarios)

```bash
docker-compose exec api python -m src.services.seed_loader
```

## Development

### Backend (FastAPI)

```bash
cd apps/api

# Create virtual environment
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows

# Install dependencies
pip install -r requirements.txt

# Run locally (requires Postgres/Redis running)
uvicorn src.main:app --reload
```

### Frontend (Next.js)

```bash
cd apps/web

# Install dependencies
npm install

# Run development server
npm run dev
```

### Simulation Package

```bash
cd packages/sim

# Install in development mode
pip install -e .

# Run tests
pytest -v
```

## Testing

```bash
# Backend tests
docker-compose exec api pytest -v

# Simulation engine tests
cd packages/sim && pytest -v

# Frontend tests
cd apps/web && npm test
```

## Project Structure

```
adlab/
├── apps/
│   ├── web/                    # Next.js frontend
│   └── api/                    # FastAPI backend
│       ├── src/
│       │   ├── routes/         # API endpoints
│       │   ├── models/         # SQLAlchemy models
│       │   ├── schemas/        # Pydantic schemas
│       │   └── services/       # Business logic
│       ├── seed/               # Scenario JSON files
│       ├── tests/              # API tests
│       └── alembic/            # Database migrations
├── packages/
│   └── sim/                    # Simulation engine library
│       ├── src/adsim/          # Engine code
│       └── tests/              # Engine tests
├── docker-compose.yml
├── .env.example
└── README.md
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Service health check |
| `/auth/mock-login` | POST | Get mock JWT token |
| `/scenarios` | GET | List available scenarios |
| `/accounts` | GET/POST | Manage sim accounts |
| `/runs` | POST | Create simulation run |
| `/runs/{id}/simulate-day` | POST | Run simulation day |
| `/runs/{id}/results` | GET | Get simulation results |

See full API docs at `http://localhost:8000/docs`

## Scenarios

Three UAE market scenarios are included:

1. **UAE Dubai Real Estate Leads** - High-value property leads
2. **UAE Local Services Leads** - Home services market
3. **UAE Ecommerce Sales** - Online retail transactions

## License

Proprietary - All rights reserved
