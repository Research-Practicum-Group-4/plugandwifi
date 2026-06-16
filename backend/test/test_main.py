import os
import sys
from datetime import date, time

# Environment isolation and path alignment
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["SECRET_KEY"] = "secret_key_for_testing"
os.environ["ALGORITHM"] = "HS256"
os.environ["ACCESS_TOKEN_EXPIRE_MINUTES"] = "60"
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import Base, get_db
from app.models import User, Venue, AvailabilitySlot 
from app.auth import hash_password

# SQLite test database configuration
TEST_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False}, poolclass=StaticPool)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_and_seed_database():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        # A. Seed test user
        test_user = User(
            id=1,
            full_name="Test Student",
            email="test2@example.com",
            password_hash=hash_password("00000000")
        )
        db.add(test_user)

        # B. Seed test venue with all required schema attributes
        test_venue = Venue(
            venue_id="osm_296568074",
            name="UCD Library Shared Space",
            borough="Dublin South",
            has_wifi=True,
            noise_level="quiet",
            hourly_price=3.5,
            opening_hours="Mo-Fr 09:00-17:00",
            lat=53.3078,
            lon=-6.2230,
            noise_score=0.12,
            rating=4.8,
            plug_access=1
        )
        db.add(test_venue)

        second_venue = Venue(
            venue_id="osm_296568075",
            name="UCD Village Study Hub",
            borough="Dublin South",
            has_wifi=True,
            noise_level="moderate",
            hourly_price=4.0,
            opening_hours="Mo-Fr 10:00-18:00",
            lat=53.3069,
            lon=-6.2218,
            noise_score=0.35,
            rating=4.4,
            plug_access=1
        )
        db.add(second_venue)

        # C. Seed availability slot using explicit Python date/time objects
        test_slot = AvailabilitySlot(
            id=1,
            venue_id="osm_296568074",
            date=date(2026, 6, 15),
            start_time=time(9, 0, 0),
            end_time=time(10, 0, 0),
            available=True,
            available_seats=5
        )
        db.add(test_slot)
        
        db.commit()
    finally:
        db.close()

    yield
    Base.metadata.drop_all(bind=engine)

# ==========================================================
# 3. Test Cases
# ==========================================================

def test_login_success():
    login_payload = {"email": "test2@example.com", "password": "00000000"}
    response = client.post("/api/auth/login", json=login_payload)
    assert response.status_code == 200

def test_get_venues_with_data():
    response = client.get("/api/venues?borough=Dublin South")
    assert response.status_code == 200
    data = response.json()
    assert data["page"] == 1
    assert data["limit"] == 20
    assert data["has_more"] is False
    assert len(data["items"]) == 2
    assert data["items"][0]["name"] == "UCD Library Shared Space"
    required_fields = {
        "plugs_available",
        "noise_level",
        "hourly_fee",
        "availability_window",
        "opening_hours_summary",
        "distance_km",
    }
    assert required_fields.issubset(data["items"][0].keys())
    assert data["items"][0]["plugs_available"] == 1
    assert data["items"][0]["hourly_fee"] == 3.5
    assert data["items"][0]["opening_hours_summary"] == "Mo-Fr 09:00-17:00"

def test_get_venues_pagination_metadata():
    first_page = client.get("/api/venues?borough=Dublin South&limit=1&page=1")
    assert first_page.status_code == 200
    first_page_data = first_page.json()
    assert first_page_data["page"] == 1
    assert first_page_data["limit"] == 1
    assert first_page_data["has_more"] is True
    assert len(first_page_data["items"]) == 1

    second_page = client.get("/api/venues?borough=Dublin South&limit=1&page=2")
    assert second_page.status_code == 200
    second_page_data = second_page.json()
    assert second_page_data["page"] == 2
    assert second_page_data["limit"] == 1
    assert second_page_data["has_more"] is False
    assert len(second_page_data["items"]) == 1

def test_create_booking_success():
    booking_payload = {
        "user_id": 1,
        "venue_id": "osm_296568074",
        "booking_date": "2026-06-15", 
        "start_time": "09:00:00",
        "end_time": "10:00:00",
        "seats_reserved": 2
    }
    response = client.post("/api/bookings", json=booking_payload)
    assert response.status_code == 200
    
def test_register_flow():
    payload = {"full_name": "New Student", "email": "new@ucd.ie", "password": "password123"}
    # First registration attempt should succeed
    res1 = client.post("/api/auth/register", json=payload)
    assert res1.status_code == 200
    
    # Second registration with the same email should fail (Duplicate handling)
    res2 = client.post("/api/auth/register", json=payload)
    assert res2.status_code == 400
    assert res2.json()["detail"] == "Email already exists"

# Test single venue retrieval and 404 error handling
def test_get_venue_by_id():
    # Existing venue ID lookup
    res_success = client.get("/api/venues/osm_296568074")
    assert res_success.status_code == 200
    assert res_success.json()["name"] == "UCD Library Shared Space"
    
    # Non-existent venue ID lookup
    res_404 = client.get("/api/venues/ghost_venue_id")
    assert res_404.status_code == 404

# Deep integration test for seat optimization limits and overbooking blockades
def test_booking_edge_cases():
    # Attempting to book 10 seats when the capacity limit is 5
    bad_payload = {
        "user_id": 1, "venue_id": "osm_296568074", "booking_date": "2026-06-15",
        "start_time": "09:00:00", "end_time": "10:00:00", "seats_reserved": 10
    }
    res_bad = client.post("/api/bookings", json=bad_payload)
    assert res_bad.status_code == 400
    assert res_bad.json()["detail"] == "Not enough seats available"

# Verification of API firewall guards protecting user data endpoints
def test_get_me_unauthorized():
    # Unauthenticated requests to private profile routes must return HTTP 401
    response = client.get("/api/users/me")
    assert response.status_code == 401
