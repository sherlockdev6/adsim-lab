"""
Tests for auth endpoints.
"""
import pytest
from fastapi.testclient import TestClient
from src.main import app


client = TestClient(app)


class TestMockLogin:
    """Tests for /auth/mock-login endpoint."""
    
    def test_login_returns_token(self):
        """Mock login should return JWT token."""
        response = client.post(
            "/auth/mock-login",
            json={"email": "test@example.com"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert "expires_in" in data
    
    def test_login_returns_user_info(self):
        """Mock login should return user information."""
        response = client.post(
            "/auth/mock-login",
            json={"email": "test@example.com"}
        )
        
        data = response.json()
        assert "user" in data
        assert data["user"]["email"] == "test@example.com"
        assert "id" in data["user"]
        assert "name" in data["user"]
    
    def test_login_deterministic_user_id(self):
        """Same email should produce same user ID."""
        response1 = client.post(
            "/auth/mock-login",
            json={"email": "test@example.com"}
        )
        response2 = client.post(
            "/auth/mock-login",
            json={"email": "test@example.com"}
        )
        
        user_id1 = response1.json()["user"]["id"]
        user_id2 = response2.json()["user"]["id"]
        
        assert user_id1 == user_id2
    
    def test_login_different_emails_different_ids(self):
        """Different emails should produce different user IDs."""
        response1 = client.post(
            "/auth/mock-login",
            json={"email": "user1@example.com"}
        )
        response2 = client.post(
            "/auth/mock-login",
            json={"email": "user2@example.com"}
        )
        
        user_id1 = response1.json()["user"]["id"]
        user_id2 = response2.json()["user"]["id"]
        
        assert user_id1 != user_id2
    
    def test_login_validates_email(self):
        """Invalid email should return 422."""
        response = client.post(
            "/auth/mock-login",
            json={"email": "not-an-email"}
        )
        
        assert response.status_code == 422
    
    def test_login_requires_email(self):
        """Missing email should return 422."""
        response = client.post(
            "/auth/mock-login",
            json={}
        )
        
        assert response.status_code == 422


class TestGetMe:
    """Tests for /auth/me endpoint."""
    
    def test_me_requires_auth(self):
        """Should return 401 without auth header."""
        response = client.get("/auth/me")
        
        assert response.status_code == 401
