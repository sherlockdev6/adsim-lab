"""
Tests for health endpoint.
"""
import pytest
from fastapi.testclient import TestClient
from src.main import app


client = TestClient(app)


class TestHealthEndpoint:
    """Tests for /health endpoint."""
    
    def test_health_returns_200(self):
        """Health endpoint should return 200."""
        response = client.get("/health")
        assert response.status_code == 200
    
    def test_health_returns_healthy_status(self):
        """Health response should have healthy status."""
        response = client.get("/health")
        data = response.json()
        
        assert data["status"] == "healthy"
        assert data["service"] == "adsim-api"
    
    def test_health_includes_version(self):
        """Health response should include version."""
        response = client.get("/health")
        data = response.json()
        
        assert "version" in data
        assert data["version"] == "0.1.0"
    
    def test_health_includes_timestamp(self):
        """Health response should include timestamp."""
        response = client.get("/health")
        data = response.json()
        
        assert "timestamp" in data
        # Timestamp should be ISO format
        assert "T" in data["timestamp"]
