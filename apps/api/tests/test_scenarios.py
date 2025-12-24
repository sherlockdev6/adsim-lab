"""
Tests for scenarios endpoints.
"""
import pytest
from fastapi.testclient import TestClient
from src.main import app


client = TestClient(app)


class TestListScenarios:
    """Tests for GET /scenarios endpoint."""
    
    def test_list_returns_200(self):
        """Should return 200."""
        response = client.get("/scenarios")
        assert response.status_code == 200
    
    def test_list_returns_scenarios(self):
        """Should return scenarios list."""
        response = client.get("/scenarios")
        data = response.json()
        
        assert "scenarios" in data
        assert "count" in data
        assert isinstance(data["scenarios"], list)
    
    def test_list_includes_three_scenarios(self):
        """Should include 3 UAE scenarios."""
        response = client.get("/scenarios")
        data = response.json()
        
        assert data["count"] == 3
        
        slugs = [s["slug"] for s in data["scenarios"]]
        assert "uae-real-estate" in slugs
        assert "uae-local-services" in slugs
        assert "uae-ecommerce" in slugs
    
    def test_scenario_has_required_fields(self):
        """Each scenario should have required fields."""
        response = client.get("/scenarios")
        data = response.json()
        
        for scenario in data["scenarios"]:
            assert "slug" in scenario
            assert "name" in scenario
            assert "market" in scenario
            assert "description" in scenario


class TestGetScenario:
    """Tests for GET /scenarios/{slug} endpoint."""
    
    def test_get_existing_scenario(self):
        """Should return scenario details."""
        response = client.get("/scenarios/uae-real-estate")
        assert response.status_code == 200
        
        data = response.json()
        assert data["slug"] == "uae-real-estate"
        assert data["market"] == "UAE"
    
    def test_get_scenario_includes_config(self):
        """Scenario detail should include full config."""
        response = client.get("/scenarios/uae-real-estate")
        data = response.json()
        
        assert "demand_config" in data
        assert "ctr_cvr_config" in data
        assert "cpc_anchors" in data
        assert "seasonality" in data
        assert "competitor_mix" in data
    
    def test_get_nonexistent_scenario(self):
        """Should return 404 for unknown slug."""
        response = client.get("/scenarios/nonexistent-scenario")
        assert response.status_code == 404
    
    def test_demand_config_structure(self):
        """Demand config should have expected structure."""
        response = client.get("/scenarios/uae-real-estate")
        data = response.json()
        
        demand = data["demand_config"]
        assert "daily_baseline" in demand
        assert "intent_split" in demand
        assert "device_split" in demand
        
    def test_competitor_mix_sums_to_one(self):
        """Competitor mix should sum to approximately 1."""
        response = client.get("/scenarios/uae-real-estate")
        data = response.json()
        
        mix = data["competitor_mix"]
        total = sum(mix.values())
        assert 0.99 <= total <= 1.01
