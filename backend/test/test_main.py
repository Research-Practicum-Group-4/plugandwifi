import os
import sys
from datetime import date, datetime, time, timedelta

# Environment isolation and path alignment
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["SECRET_KEY"] = "secret_key_for_testing"
os.environ["ALGORITHM"] = "HS256"
os.environ["ACCESS_TOKEN_EXPIRE_MINUTES"] = "60"
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
import httpx
from fastapi import Depends, HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app import main as main_module
from app.database import Base, build_engine_options, get_db
from app.models import (
    User,
    Venue,
    AvailabilitySlot,
    Booking,
    RefreshSession,
    Favorite,
    PostBookingReview
)
from app.auth import create_access_token, hash_password, verify_access_token
from app.rbac import require_roles
from app.refresh_tokens import hash_refresh_token

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


@app.get("/_test/provider-only")
def provider_only_route(
    current_user: User = Depends(require_roles("provider"))
):
    return {"user_id": current_user.id}


client = TestClient(app)


def get_test_user_headers():
    login_response = client.post(
        "/api/auth/login",
        json={"email": "test2@example.com", "password": "00000000"}
    )
    return {
        "Authorization": f"Bearer {login_response.json()['access_token']}"
    }


def test_sqlite_engine_options_exclude_postgresql_settings():
    options = build_engine_options("sqlite:///:memory:")

    assert options == {"pool_pre_ping": True}


def test_postgresql_engine_options(monkeypatch):
    setting_names = (
        "DB_POOL_SIZE",
        "DB_MAX_OVERFLOW",
        "DB_POOL_RECYCLE",
        "DB_POOL_TIMEOUT",
        "DB_CONNECT_TIMEOUT",
        "DB_KEEPALIVES_IDLE",
        "DB_KEEPALIVES_INTERVAL",
        "DB_KEEPALIVES_COUNT"
    )

    for setting_name in setting_names:
        monkeypatch.delenv(setting_name, raising=False)

    options = build_engine_options(
        "postgresql+psycopg2://user:password@127.0.0.1:5433/database"
    )

    assert options["pool_pre_ping"] is True
    assert options["pool_size"] == 5
    assert options["max_overflow"] == 5
    assert options["pool_recycle"] == 1800
    assert options["pool_timeout"] == 30
    assert options["connect_args"] == {
        "connect_timeout": 10,
        "keepalives": 1,
        "keepalives_idle": 30,
        "keepalives_interval": 10,
        "keepalives_count": 5
    }


def test_chatbot_recommend_returns_real_venue_suggestions(monkeypatch):
    def fake_get_busyness_predictions(venue_ids, hour=None, day_type=None):
        return {
            "osm_296568074": {
                "busyness_score": 32,
                "busyness_label": "Low"
            }
        }

    monkeypatch.setattr(
        main_module,
        "call_gemini_search_parameter_extraction",
        lambda message: None
    )
    monkeypatch.setattr(
        main_module,
        "get_busyness_predictions",
        fake_get_busyness_predictions
    )
    monkeypatch.setenv(
        "GEMINI_MODEL",
        "gemini-test-model"
    )

    response = client.post(
        "/api/chatbot/recommend",
        json={
            "message": "Find me a library with Wi-Fi near UCD that is not too busy now."
        }
    )

    assert response.status_code == 200
    data = response.json()
    assert data["model"] == "gemini-test-model"
    assert data["search_parameters"] == {
        "location": "UCD",
        "radius_km": None,
        "venue_type": "library",
        "wifi": True,
        "busyness": "low",
        "time": "now"
    }
    assert data["venues"][0]["venue_id"] == "osm_296568074"
    assert data["venues"][0]["busyness_label"] == "Low"
    assert data["follow_up_question"] is None


def test_chatbot_recommend_uses_extracted_radius_and_location(monkeypatch):
    monkeypatch.setattr(
        main_module,
        "call_gemini_search_parameter_extraction",
        lambda message: {
            "location": "UCD Library",
            "radius_km": 0.1,
            "venue_type": None,
            "wifi": True,
            "busyness": None,
            "time": "now"
        }
    )
    monkeypatch.setattr(
        main_module,
        "get_busyness_predictions",
        lambda venue_ids, hour=None, day_type=None: {}
    )

    response = client.post(
        "/api/chatbot/recommend",
        json={
            "message": "Find a Wi-Fi workspace within 0.1km of UCD Library now."
        }
    )

    assert response.status_code == 200
    data = response.json()
    assert data["search_parameters"]["location"] == "UCD Library"
    assert data["search_parameters"]["radius_km"] == 0.1
    assert [
        venue["venue_id"]
        for venue in data["venues"]
    ] == ["osm_296568074"]


def test_chatbot_recommend_asks_follow_up_for_unclear_request(monkeypatch):
    monkeypatch.setattr(
        main_module,
        "call_gemini_search_parameter_extraction",
        lambda message: None
    )

    response = client.post(
        "/api/chatbot/recommend",
        json={
            "message": "Can you help me?"
        }
    )

    assert response.status_code == 200
    data = response.json()
    assert data["venues"] == []
    assert data["follow_up_question"] == (
        "Could you share the area, venue type, or workspace features you need?"
    )


def test_chatbot_recommend_returns_useful_no_result(monkeypatch):
    monkeypatch.setattr(
        main_module,
        "call_gemini_search_parameter_extraction",
        lambda message: {
            "location": None,
            "radius_km": None,
            "venue_type": "restaurant",
            "wifi": False,
            "busyness": None,
            "time": None
        }
    )

    response = client.post(
        "/api/chatbot/recommend",
        json={
            "message": "Find a restaurant without Wi-Fi."
        }
    )

    assert response.status_code == 200
    data = response.json()
    assert data["venues"] == []
    assert data["follow_up_question"] is None
    assert data["response"] == (
        "I could not find matching venues. Try increasing the radius or relaxing one of the filters."
    )


def test_chatbot_recommend_requires_message():
    response = client.post(
        "/api/chatbot/recommend",
        json={
            "message": ""
        }
    )

    assert response.status_code == 422


def test_call_gemini_chatbot_requires_api_key(monkeypatch):
    monkeypatch.delenv(
        "GEMINI_API_KEY",
        raising=False
    )

    with pytest.raises(HTTPException) as exc_info:
        main_module.call_gemini_chatbot(
            "Find a workspace."
        )

    assert exc_info.value.status_code == 503
    assert exc_info.value.detail == "Gemini API key is not configured"


def test_call_gemini_chatbot_handles_api_failure(monkeypatch):
    def fake_post(*args, **kwargs):
        raise httpx.HTTPError("Gemini is unavailable")

    monkeypatch.setenv(
        "GEMINI_API_KEY",
        "test-key"
    )
    monkeypatch.setattr(
        main_module.httpx,
        "post",
        fake_post
    )

    with pytest.raises(HTTPException) as exc_info:
        main_module.call_gemini_chatbot(
            "Find a workspace."
        )

    assert exc_info.value.status_code == 502
    assert exc_info.value.detail == "Gemini API request failed"


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
            plug_access=1,
            wifi_norm=1.0,
            plug_norm=1.0,
            rating_norm=0.96,
            bus_norm=0.8,
            train_norm=0.7
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
            plug_access=1,
            wifi_norm=0.8,
            plug_norm=0.5,
            rating_norm=0.88,
            bus_norm=0.2,
            train_norm=0.3
        )
        db.add(second_venue)

        # C. Seed availability slot using explicit Python date/time objects
        test_slot = AvailabilitySlot(
            id=1,
            venue_id="osm_296568074",
            date=date(2026, 6, 15),
            start_time=time(9, 0, 0),
            end_time=time(12, 0, 0),
            available=True,
            available_seats=5
        )
        db.add(test_slot)

        second_slot = AvailabilitySlot(
            id=2,
            venue_id="osm_296568075",
            date=date(2026, 6, 15),
            start_time=time(9, 0, 0),
            end_time=time(12, 0, 0),
            available=True,
            available_seats=2
        )
        db.add(second_slot)

        test_booking = Booking(
            id=1,
            user_id=1,
            venue_id="osm_296568074",
            booking_date=date(2026, 6, 15),
            start_time=time(10, 0, 0),
            end_time=time(11, 0, 0),
            seats_reserved=2,
            order_id="ORD-duration-test",
            payment_status="paid"
        )
        db.add(test_booking)
        
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

def test_logout_success():
    response = client.post("/api/auth/logout")
    assert response.status_code == 200
    assert response.json()["message"] == "Logged out successfully"

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


def test_get_venues_includes_busyness_fields(monkeypatch):
    def fake_get_busyness_predictions(venue_ids, hour=None, day_type=None):
        return {
            "osm_296568074": {
                "busyness_score": 32,
                "busyness_label": "Low"
            },
            "osm_296568075": {
                "busyness_score": 85,
                "busyness_label": "High"
            }
        }

    monkeypatch.setattr(
        main_module,
        "get_busyness_predictions",
        fake_get_busyness_predictions
    )

    response = client.get("/api/venues?borough=Dublin South")

    assert response.status_code == 200
    data = response.json()
    assert data["items"][0]["busyness_score"] == 32
    assert data["items"][0]["busyness_label"] == "Low"
    assert data["items"][1]["busyness_score"] == 85
    assert data["items"][1]["busyness_label"] == "High"


def test_get_venues_includes_suitability_score():
    response = client.get("/api/venues?borough=Dublin South")

    assert response.status_code == 200
    data = response.json()
    assert data["items"][0]["suitability_score"] == 91.23
    assert data["items"][1]["suitability_score"] == 58.5


def test_get_venues_can_sort_by_suitability():
    db = TestingSessionLocal()
    try:
        venue = db.query(Venue).filter(
            Venue.venue_id == "osm_296568075"
        ).one()
        venue.wifi_norm = 1.0
        venue.plug_norm = 1.0
        venue.rating_norm = 1.0
        venue.bus_norm = 1.0
        venue.train_norm = 1.0
        venue.noise_score = 0.0
        db.commit()
    finally:
        db.close()

    response = client.get("/api/venues?borough=Dublin South&sort=suitability")

    assert response.status_code == 200
    data = response.json()
    assert [
        item["venue_id"]
        for item in data["items"]
    ] == [
        "osm_296568075",
        "osm_296568074"
    ]
    assert data["total_items"] == 2
    assert data["total_pages"] == 1


def test_get_venues_radius_search_can_sort_by_suitability():
    db = TestingSessionLocal()
    try:
        venue = db.query(Venue).filter(
            Venue.venue_id == "osm_296568075"
        ).one()
        venue.wifi_norm = 1.0
        venue.plug_norm = 1.0
        venue.rating_norm = 1.0
        venue.bus_norm = 1.0
        venue.train_norm = 1.0
        venue.noise_score = 0.0
        db.commit()
    finally:
        db.close()

    response = client.get(
        "/api/venues?borough=Dublin South&lat=53.3078&lon=-6.2230&radius=1&sort=recommended"
    )

    assert response.status_code == 200
    data = response.json()
    assert [
        item["venue_id"]
        for item in data["items"]
    ] == [
        "osm_296568075",
        "osm_296568074"
    ]
    assert data["items"][0]["distance_km"] is not None


def test_get_venues_suitability_score_handles_null_fields():
    db = TestingSessionLocal()
    try:
        venue = db.query(Venue).filter(
            Venue.venue_id == "osm_296568074"
        ).one()
        venue.wifi_norm = None
        venue.plug_norm = None
        venue.rating_norm = None
        venue.bus_norm = None
        venue.train_norm = None
        venue.noise_score = None
        venue.noise_level = None
        db.commit()
    finally:
        db.close()

    response = client.get("/api/venues?borough=Dublin South&sort=suitability")

    assert response.status_code == 200
    data = response.json()
    null_field_venue = next(
        item
        for item in data["items"]
        if item["venue_id"] == "osm_296568074"
    )
    assert null_field_venue["suitability_score"] == 0.0


def test_get_venues_pagination_metadata():
    first_page = client.get("/api/venues?borough=Dublin South&limit=1&page=1")
    assert first_page.status_code == 200
    first_page_data = first_page.json()
    assert first_page_data["page"] == 1
    assert first_page_data["limit"] == 1
    assert first_page_data["total_items"] == 2
    assert first_page_data["total_pages"] == 2
    assert first_page_data["has_more"] is True
    assert len(first_page_data["items"]) == 1

    second_page = client.get("/api/venues?borough=Dublin South&limit=1&page=2")
    assert second_page.status_code == 200
    second_page_data = second_page.json()
    assert second_page_data["page"] == 2
    assert second_page_data["limit"] == 1
    assert second_page_data["total_items"] == 2
    assert second_page_data["total_pages"] == 2
    assert second_page_data["has_more"] is False
    assert len(second_page_data["items"]) == 1


def test_get_venue_suggestions_matches_partial_name_case_insensitive():
    response = client.get("/api/venues/suggestions?q=library")

    assert response.status_code == 200
    assert response.json() == {
        "items": [
            {
                "venue_id": "osm_296568074",
                "name": "UCD Library Shared Space",
                "lat": 53.3078,
                "lon": -6.223,
                "borough": "Dublin South",
                "type": "venue"
            }
        ]
    }


def test_get_venue_suggestions_respects_limit():
    response = client.get("/api/venues/suggestions?q=ucd&limit=1")

    assert response.status_code == 200
    assert len(response.json()["items"]) == 1


def test_get_venue_suggestions_excludes_suspended_venues():
    db = TestingSessionLocal()
    try:
        venue = db.query(Venue).filter(
            Venue.venue_id == "osm_296568074"
        ).one()
        venue.state = "Suspended"
        db.commit()
    finally:
        db.close()

    response = client.get("/api/venues/suggestions?q=library")

    assert response.status_code == 200
    assert response.json() == {"items": []}


def test_get_venues_geospatial_sorting_and_radius():
    response = client.get(
        "/api/venues?borough=Dublin South&lat=53.3078&lon=-6.2230&radius=1"
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total_items"] == 2
    assert data["total_pages"] == 1
    assert len(data["items"]) == 2
    assert data["items"][0]["name"] == "UCD Library Shared Space"
    assert data["items"][0]["distance_km"] == 0
    assert data["items"][1]["distance_km"] > data["items"][0]["distance_km"]

    narrow_response = client.get(
        "/api/venues?borough=Dublin South&lat=53.3078&lon=-6.2230&radius=0.05"
    )
    assert narrow_response.status_code == 200
    narrow_data = narrow_response.json()
    assert narrow_data["total_items"] == 1
    assert narrow_data["total_pages"] == 1
    assert len(narrow_data["items"]) == 1
    assert narrow_data["items"][0]["name"] == "UCD Library Shared Space"

def test_get_venues_requires_lat_and_lon_together():
    lat_only = client.get("/api/venues?lat=53.3078")
    assert lat_only.status_code == 400

    lon_only = client.get("/api/venues?lon=-6.2230")
    assert lon_only.status_code == 400

def test_get_venues_duration_hours_respects_required_seats():
    response = client.get(
        "/api/venues?borough=Dublin South&date=2026-06-15&start_time=09:00:00&duration_hours=3&seats_required=3"
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 1
    assert data["items"][0]["venue_id"] == "osm_296568074"

    unavailable_response = client.get(
        "/api/venues?borough=Dublin South&date=2026-06-15&start_time=09:00:00&duration_hours=3&seats_required=4"
    )
    assert unavailable_response.status_code == 200
    unavailable_data = unavailable_response.json()
    assert len(unavailable_data["items"]) == 0

def test_get_venues_duration_hours_requires_date_and_start_time():
    missing_date = client.get(
        "/api/venues?start_time=09:00:00&duration_hours=1"
    )
    assert missing_date.status_code == 400

    missing_start_time = client.get(
        "/api/venues?date=2026-06-15&duration_hours=1"
    )
    assert missing_start_time.status_code == 400

def test_create_booking_requires_authentication():
    booking_payload = {
        "venue_id": "osm_296568074",
        "booking_date": "2026-06-15",
        "start_time": "09:00:00",
        "end_time": "10:00:00",
        "seats_reserved": 2
    }
    response = client.post("/api/bookings", json=booking_payload)
    assert response.status_code == 401


def test_create_booking_success():
    booking_payload = {
        "venue_id": "osm_296568074",
        "booking_date": "2026-06-15", 
        "start_time": "09:00:00",
        "end_time": "10:00:00",
        "seats_reserved": 2
    }
    response = client.post(
        "/api/bookings",
        json=booking_payload,
        headers=get_test_user_headers()
    )
    assert response.status_code == 200
    assert response.json()["user_id"] == 1


def test_create_booking_ignores_client_user_id():
    db = TestingSessionLocal()
    try:
        other_user = User(
            id=2,
            full_name="Other Booking User",
            email="other-booking@example.com",
            password_hash=hash_password("00000000")
        )
        db.add(other_user)
        db.commit()
    finally:
        db.close()

    booking_payload = {
        "user_id": 2,
        "venue_id": "osm_296568074",
        "booking_date": "2026-06-15",
        "start_time": "09:00:00",
        "end_time": "10:00:00",
        "seats_reserved": 1
    }
    response = client.post(
        "/api/bookings",
        json=booking_payload,
        headers=get_test_user_headers()
    )

    assert response.status_code == 200
    assert response.json()["user_id"] == 1


def test_register_flow():
    payload = {"full_name": "New Student", "email": "new@ucd.ie", "password": "password123"}
    # First registration attempt should succeed
    res1 = client.post("/api/auth/register", json=payload)
    assert res1.status_code == 200
    
    # Second registration with the same email should fail (Duplicate handling)
    res2 = client.post("/api/auth/register", json=payload)
    assert res2.status_code == 400
    assert res2.json()["detail"] == "Email already exists"

    login_response = client.post(
        "/api/auth/login",
        json={"email": payload["email"], "password": payload["password"]}
    )
    assert login_response.status_code == 200
    assert login_response.json()["user"]["role"] == "user"


def test_provider_registration_flow():
    payload = {
        "full_name": "New Provider",
        "email": "provider@ucd.ie",
        "password": "password123",
        "role": "provider"
    }

    register_response = client.post("/api/auth/register", json=payload)
    assert register_response.status_code == 200

    login_response = client.post(
        "/api/auth/login",
        json={"email": payload["email"], "password": payload["password"]}
    )
    assert login_response.status_code == 200
    assert login_response.json()["user"]["role"] == "provider"

    access_token = login_response.json()["access_token"]
    assert verify_access_token(access_token)["role"] == "provider"
    me_response = client.get(
        "/api/users/me",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    assert me_response.status_code == 200
    assert me_response.json()["role"] == "provider"

    provider_response = client.get(
        "/_test/provider-only",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    assert provider_response.status_code == 200
    assert provider_response.json()["user_id"] is not None


def test_provider_route_rejects_standard_user():
    login_response = client.post(
        "/api/auth/login",
        json={"email": "test2@example.com", "password": "00000000"}
    )
    access_token = login_response.json()["access_token"]

    response = client.get(
        "/_test/provider-only",
        headers={"Authorization": f"Bearer {access_token}"}
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "Insufficient permissions"


def test_provider_route_rejects_token_without_role():
    access_token = create_access_token(
        {"user_id": 1, "email": "test2@example.com"}
    )

    response = client.get(
        "/_test/provider-only",
        headers={"Authorization": f"Bearer {access_token}"}
    )

    assert response.status_code == 403


def test_provider_route_rejects_role_changed_after_token_issue():
    access_token = create_access_token(
        {
            "user_id": 1,
            "email": "test2@example.com",
            "role": "provider"
        }
    )

    response = client.get(
        "/_test/provider-only",
        headers={"Authorization": f"Bearer {access_token}"}
    )

    assert response.status_code == 403


def test_create_venue_requires_authentication():
    response = client.post(
        "/api/venues",
        json={
            "name": "Provider Study Room",
            "lat": 53.3,
            "lon": -6.2,
            "borough": "Dublin South",
            "seat_capacity": 12
        }
    )

    assert response.status_code == 401


def test_create_venue_rejects_standard_user():
    login_response = client.post(
        "/api/auth/login",
        json={"email": "test2@example.com", "password": "00000000"}
    )
    access_token = login_response.json()["access_token"]

    response = client.post(
        "/api/venues",
        headers={"Authorization": f"Bearer {access_token}"},
        json={
            "name": "Provider Study Room",
            "lat": 53.3,
            "lon": -6.2,
            "borough": "Dublin South",
            "seat_capacity": 12
        }
    )

    assert response.status_code == 403


def test_provider_created_pending_venue_stays_hidden_until_admin_activation():
    provider_payload = {
        "full_name": "Venue Creator",
        "email": "venue-creator@ucd.ie",
        "password": "password123",
        "role": "provider"
    }
    register_response = client.post(
        "/api/auth/register",
        json=provider_payload
    )
    assert register_response.status_code == 200

    login_response = client.post(
        "/api/auth/login",
        json={
            "email": provider_payload["email"],
            "password": provider_payload["password"]
        }
    )
    headers = {
        "Authorization": f"Bearer {login_response.json()['access_token']}"
    }

    create_payload = {
        "name": "Provider Study Room",
        "lat": 53.31,
        "lon": -6.22,
        "borough": "Dublin South",
        "opening_hours": "Mo-Fr 09:00-18:00",
        "seat_capacity": 12,
        "amenity_tags": ["wifi", "plugs", "quiet"],
        "rules_text": "Keep noise low.",
        "has_wifi": True,
        "plug_access": 1,
        "hourly_price": 5.5
    }

    response = client.post(
        "/api/venues",
        headers=headers,
        json=create_payload
    )

    assert response.status_code == 200
    data = response.json()
    assert data["venue_id"].startswith("provider-")
    assert data["name"] == "Provider Study Room"
    assert data["state"] == "Pending Approval"
    assert data["seat_capacity"] == 12
    assert data["amenity_tags"] == ["wifi", "plugs", "quiet"]

    db = TestingSessionLocal()
    try:
        created_venue = db.query(Venue).filter(
            Venue.venue_id == data["venue_id"]
        ).one()
        assert created_venue.state == "Pending Approval"
        assert created_venue.partner == login_response.json()["user"]["user_id"]
        assert created_venue.amenity_tags == "wifi,plugs,quiet"

        db.add(
            AvailabilitySlot(
                id=90,
                venue_id=data["venue_id"],
                date=date(2026, 6, 15),
                start_time=time(9, 0, 0),
                end_time=time(12, 0, 0),
                available=True,
                available_seats=12
            )
        )
        db.add(
            User(
                id=93,
                full_name="Venue Approval Admin",
                email="venue-approval-admin@example.com",
                password_hash=hash_password("00000000"),
                role="admin"
            )
        )
        db.commit()
    finally:
        db.close()

    venues_response = client.get("/api/venues?borough=Dublin South")
    assert venues_response.status_code == 200
    venue_ids = [
        item["venue_id"]
        for item in venues_response.json()["items"]
    ]
    assert data["venue_id"] not in venue_ids

    radius_response = client.get(
        "/api/venues?borough=Dublin South&lat=53.31&lon=-6.22&radius=1"
    )
    assert radius_response.status_code == 200
    radius_venue_ids = [
        item["venue_id"]
        for item in radius_response.json()["items"]
    ]
    assert data["venue_id"] not in radius_venue_ids

    availability_response = client.get(
        "/api/venues?borough=Dublin South&date=2026-06-15&start_time=09:00:00&duration_hours=3&seats_required=1"
    )
    assert availability_response.status_code == 200
    availability_venue_ids = [
        item["venue_id"]
        for item in availability_response.json()["items"]
    ]
    assert data["venue_id"] not in availability_venue_ids

    suggestions_response = client.get("/api/venues/suggestions?q=provider")
    assert suggestions_response.status_code == 200
    suggestion_venue_ids = [
        item["venue_id"]
        for item in suggestions_response.json()["items"]
    ]
    assert data["venue_id"] not in suggestion_venue_ids

    admin_login_response = client.post(
        "/api/auth/login",
        json={
            "email": "venue-approval-admin@example.com",
            "password": "00000000"
        }
    )
    admin_headers = {
        "Authorization": f"Bearer {admin_login_response.json()['access_token']}"
    }

    activation_response = client.patch(
        f"/api/admin/venues/{data['venue_id']}/suspension",
        headers=admin_headers,
        json={"state": "Active"}
    )
    assert activation_response.status_code == 200
    assert activation_response.json() == {
        "venue_id": data["venue_id"],
        "state": "Active",
        "cancelled_bookings": 0,
        "released_seats": 0,
        "message": "Venue activated successfully"
    }

    activated_response = client.get("/api/venues?borough=Dublin South")
    assert activated_response.status_code == 200
    activated_venue_ids = [
        item["venue_id"]
        for item in activated_response.json()["items"]
    ]
    assert data["venue_id"] in activated_venue_ids


def test_create_venue_rejects_invalid_payload():
    provider_payload = {
        "full_name": "Invalid Venue Provider",
        "email": "invalid-venue-provider@ucd.ie",
        "password": "password123",
        "role": "provider"
    }
    register_response = client.post(
        "/api/auth/register",
        json=provider_payload
    )
    assert register_response.status_code == 200

    login_response = client.post(
        "/api/auth/login",
        json={
            "email": provider_payload["email"],
            "password": provider_payload["password"]
        }
    )
    headers = {
        "Authorization": f"Bearer {login_response.json()['access_token']}"
    }

    response = client.post(
        "/api/venues",
        headers=headers,
        json={
            "name": "",
            "lat": 100,
            "lon": -6.2,
            "borough": "Dublin South",
            "seat_capacity": 0
        }
    )

    assert response.status_code == 422


def test_provider_dashboard_kpis_requires_authentication():
    response = client.get("/api/provider/dashboard/kpis")
    assert response.status_code == 401


def test_provider_dashboard_kpis_rejects_standard_user():
    login_response = client.post(
        "/api/auth/login",
        json={"email": "test2@example.com", "password": "00000000"}
    )
    access_token = login_response.json()["access_token"]

    response = client.get(
        "/api/provider/dashboard/kpis",
        headers={"Authorization": f"Bearer {access_token}"}
    )

    assert response.status_code == 403


def test_provider_dashboard_kpis_returns_window_metrics_and_deltas():
    provider_payload = {
        "full_name": "KPI Provider",
        "email": "kpi-provider@ucd.ie",
        "password": "password123",
        "role": "provider"
    }
    register_response = client.post(
        "/api/auth/register",
        json=provider_payload
    )
    assert register_response.status_code == 200

    login_response = client.post(
        "/api/auth/login",
        json={
            "email": provider_payload["email"],
            "password": provider_payload["password"]
        }
    )
    headers = {
        "Authorization": f"Bearer {login_response.json()['access_token']}"
    }

    today = date.today()
    current_booking_date = today - timedelta(days=5)
    previous_booking_date = today - timedelta(days=35)

    db = TestingSessionLocal()
    try:
        db.query(Booking).delete()
        db.query(AvailabilitySlot).delete()

        db.add_all(
            [
                AvailabilitySlot(
                    id=20,
                    venue_id="osm_296568074",
                    date=current_booking_date,
                    start_time=time(9, 0),
                    end_time=time(12, 0),
                    available=True,
                    available_seats=5
                ),
                AvailabilitySlot(
                    id=21,
                    venue_id="osm_296568075",
                    date=current_booking_date,
                    start_time=time(9, 0),
                    end_time=time(12, 0),
                    available=True,
                    available_seats=5
                ),
                AvailabilitySlot(
                    id=22,
                    venue_id="osm_296568074",
                    date=previous_booking_date,
                    start_time=time(9, 0),
                    end_time=time(12, 0),
                    available=True,
                    available_seats=5
                ),
                Booking(
                    id=20,
                    user_id=1,
                    venue_id="osm_296568074",
                    booking_date=current_booking_date,
                    start_time=time(9, 0),
                    end_time=time(11, 0),
                    seats_reserved=2,
                    status="confirmed",
                    order_id="ORD-kpi-current-one",
                    payment_status="paid"
                ),
                Booking(
                    id=21,
                    user_id=1,
                    venue_id="osm_296568075",
                    booking_date=current_booking_date,
                    start_time=time(9, 0),
                    end_time=time(10, 0),
                    seats_reserved=1,
                    status="confirmed",
                    order_id="ORD-kpi-current-two",
                    payment_status="paid"
                ),
                Booking(
                    id=22,
                    user_id=1,
                    venue_id="osm_296568074",
                    booking_date=previous_booking_date,
                    start_time=time(9, 0),
                    end_time=time(10, 0),
                    seats_reserved=1,
                    status="confirmed",
                    order_id="ORD-kpi-previous",
                    payment_status="paid"
                ),
                Booking(
                    id=23,
                    user_id=1,
                    venue_id="osm_296568075",
                    booking_date=current_booking_date,
                    start_time=time(10, 0),
                    end_time=time(11, 0),
                    seats_reserved=1,
                    status="cancelled",
                    order_id="ORD-kpi-cancelled",
                    payment_status="refund_pending"
                )
            ]
        )
        db.commit()
    finally:
        db.close()

    response = client.get(
        "/api/provider/dashboard/kpis",
        headers=headers
    )

    assert response.status_code == 200
    data = response.json()

    assert data["window_days"] == 30
    assert data["total_reservations"]["value"] == 2
    assert data["total_reservations"]["delta_percent"] == 100
    assert data["monthly_revenue"]["value"] == 18
    assert data["monthly_revenue"]["delta_percent"] == pytest.approx(414.29)
    assert data["active_properties_count"]["value"] == 2
    assert data["active_properties_count"]["delta_percent"] == 100
    assert data["average_user_rating"]["value"] == 4.6
    assert data["average_user_rating"]["delta_percent"] == pytest.approx(-4.17)


def test_admin_dashboard_overview_requires_authentication():
    response = client.get("/api/admin/dashboard/overview")
    assert response.status_code == 401


def test_admin_dashboard_overview_rejects_standard_user():
    login_response = client.post(
        "/api/auth/login",
        json={"email": "test2@example.com", "password": "00000000"}
    )
    access_token = login_response.json()["access_token"]

    response = client.get(
        "/api/admin/dashboard/overview",
        headers={"Authorization": f"Bearer {access_token}"}
    )

    assert response.status_code == 403


def test_admin_dashboard_overview_rejects_provider_user():
    provider_payload = {
        "full_name": "Admin Blocked Provider",
        "email": "admin-blocked-provider@ucd.ie",
        "password": "password123",
        "role": "provider"
    }
    register_response = client.post(
        "/api/auth/register",
        json=provider_payload
    )
    assert register_response.status_code == 200

    login_response = client.post(
        "/api/auth/login",
        json={
            "email": provider_payload["email"],
            "password": provider_payload["password"]
        }
    )
    access_token = login_response.json()["access_token"]

    response = client.get(
        "/api/admin/dashboard/overview",
        headers={"Authorization": f"Bearer {access_token}"}
    )

    assert response.status_code == 403


def test_admin_dashboard_overview_returns_system_metrics():
    db = TestingSessionLocal()
    try:
        db.query(Booking).delete()
        db.query(AvailabilitySlot).delete()

        admin_user = User(
            id=90,
            full_name="Admin User",
            email="admin@example.com",
            password_hash=hash_password("00000000"),
            role="admin"
        )
        db.add(admin_user)

        db.add_all(
            [
                AvailabilitySlot(
                    id=60,
                    venue_id="osm_296568074",
                    date=date(2026, 7, 1),
                    start_time=time(9, 0),
                    end_time=time(12, 0),
                    available=True,
                    available_seats=5
                ),
                AvailabilitySlot(
                    id=61,
                    venue_id="osm_296568075",
                    date=date(2026, 7, 1),
                    start_time=time(9, 0),
                    end_time=time(12, 0),
                    available=True,
                    available_seats=5
                ),
                AvailabilitySlot(
                    id=62,
                    venue_id="osm_296568075",
                    date=date(2026, 7, 2),
                    start_time=time(9, 0),
                    end_time=time(12, 0),
                    available=False,
                    available_seats=0
                ),
                Booking(
                    id=60,
                    user_id=1,
                    venue_id="osm_296568074",
                    booking_date=date(2026, 7, 1),
                    start_time=time(9, 0),
                    end_time=time(11, 0),
                    seats_reserved=2,
                    status="confirmed",
                    order_id="ORD-admin-paid-one",
                    payment_status="paid"
                ),
                Booking(
                    id=61,
                    user_id=1,
                    venue_id="osm_296568075",
                    booking_date=date(2026, 7, 1),
                    start_time=time(10, 0),
                    end_time=time(11, 0),
                    seats_reserved=1,
                    status="completed",
                    order_id="ORD-admin-paid-two",
                    payment_status="paid"
                ),
                Booking(
                    id=62,
                    user_id=1,
                    venue_id="osm_296568074",
                    booking_date=date(2026, 7, 2),
                    start_time=time(9, 0),
                    end_time=time(10, 0),
                    seats_reserved=1,
                    status="cancelled",
                    order_id="ORD-admin-refund",
                    payment_status="refund_pending"
                ),
                Booking(
                    id=63,
                    user_id=1,
                    venue_id="osm_296568075",
                    booking_date=date(2026, 7, 2),
                    start_time=time(10, 0),
                    end_time=time(11, 0),
                    seats_reserved=1,
                    status="canceled",
                    order_id="ORD-admin-canceled",
                    payment_status="paid"
                )
            ]
        )
        db.commit()
    finally:
        db.close()

    login_response = client.post(
        "/api/auth/login",
        json={"email": "admin@example.com", "password": "00000000"}
    )
    headers = {
        "Authorization": f"Bearer {login_response.json()['access_token']}"
    }

    response = client.get(
        "/api/admin/dashboard/overview",
        headers=headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["global_active_properties"] == 2
    assert data["total_completed_checkout_revenues"] == pytest.approx(18.0)
    assert data["system_incident_counts"] == {
        "cancelled_bookings": 2,
        "refund_pending_bookings": 1,
        "unavailable_slots": 1
    }


def test_admin_venue_suspension_requires_authentication():
    response = client.patch(
        "/api/admin/venues/osm_296568074/suspension",
        json={"state": "Suspended"}
    )

    assert response.status_code == 401


def test_admin_venue_suspension_rejects_non_admin_user():
    login_response = client.post(
        "/api/auth/login",
        json={"email": "test2@example.com", "password": "00000000"}
    )
    access_token = login_response.json()["access_token"]

    response = client.patch(
        "/api/admin/venues/osm_296568074/suspension",
        headers={"Authorization": f"Bearer {access_token}"},
        json={"state": "Suspended"}
    )

    assert response.status_code == 403


def test_admin_venue_suspension_cancels_active_bookings_and_excludes_search():
    db = TestingSessionLocal()
    try:
        db.query(Booking).delete()

        admin_user = User(
            id=91,
            full_name="Suspension Admin",
            email="suspension-admin@example.com",
            password_hash=hash_password("00000000"),
            role="admin"
        )
        db.add(admin_user)

        active_booking = Booking(
            id=80,
            user_id=1,
            venue_id="osm_296568074",
            booking_date=date(2026, 7, 1),
            start_time=time(9, 0),
            end_time=time(10, 0),
            seats_reserved=2,
            status="confirmed",
            order_id="ORD-suspend-active",
            payment_status="paid"
        )
        completed_booking = Booking(
            id=81,
            user_id=1,
            venue_id="osm_296568074",
            booking_date=date(2026, 6, 1),
            start_time=time(9, 0),
            end_time=time(10, 0),
            seats_reserved=1,
            status="completed",
            order_id="ORD-suspend-completed",
            payment_status="paid"
        )
        db.add_all([active_booking, completed_booking])
        db.commit()
    finally:
        db.close()

    login_response = client.post(
        "/api/auth/login",
        json={
            "email": "suspension-admin@example.com",
            "password": "00000000"
        }
    )
    headers = {
        "Authorization": f"Bearer {login_response.json()['access_token']}"
    }

    response = client.patch(
        "/api/admin/venues/osm_296568074/suspension",
        headers=headers,
        json={"state": "Suspended"}
    )

    assert response.status_code == 200
    assert response.json() == {
        "venue_id": "osm_296568074",
        "state": "Suspended",
        "cancelled_bookings": 1,
        "released_seats": 2,
        "message": "Venue suspended successfully"
    }

    db = TestingSessionLocal()
    try:
        venue = db.query(Venue).filter(
            Venue.venue_id == "osm_296568074"
        ).one()
        cancelled_booking = db.query(Booking).filter(
            Booking.id == 80
        ).one()
        completed_booking = db.query(Booking).filter(
            Booking.id == 81
        ).one()

        assert venue.state == "Suspended"
        assert cancelled_booking.status == "cancelled"
        assert cancelled_booking.payment_status == "refund_pending"
        assert completed_booking.status == "completed"
        assert completed_booking.payment_status == "paid"
    finally:
        db.close()

    venues_response = client.get("/api/venues?borough=Dublin South")
    assert venues_response.status_code == 200
    venue_ids = [
        item["venue_id"]
        for item in venues_response.json()["items"]
    ]
    assert "osm_296568074" not in venue_ids
    assert "osm_296568075" in venue_ids


def test_admin_venue_suspension_returns_404_for_missing_venue():
    db = TestingSessionLocal()
    try:
        admin_user = User(
            id=92,
            full_name="Missing Venue Admin",
            email="missing-venue-admin@example.com",
            password_hash=hash_password("00000000"),
            role="admin"
        )
        db.add(admin_user)
        db.commit()
    finally:
        db.close()

    login_response = client.post(
        "/api/auth/login",
        json={
            "email": "missing-venue-admin@example.com",
            "password": "00000000"
        }
    )
    headers = {
        "Authorization": f"Bearer {login_response.json()['access_token']}"
    }

    response = client.patch(
        "/api/admin/venues/ghost_venue_id/suspension",
        headers=headers,
        json={"state": "Suspended"}
    )

    assert response.status_code == 404


def test_provider_dashboard_arrivals_requires_authentication():
    response = client.get("/api/provider/dashboard/arrivals")
    assert response.status_code == 401


def test_provider_dashboard_arrivals_rejects_standard_user():
    login_response = client.post(
        "/api/auth/login",
        json={"email": "test2@example.com", "password": "00000000"}
    )
    access_token = login_response.json()["access_token"]

    response = client.get(
        "/api/provider/dashboard/arrivals",
        headers={"Authorization": f"Bearer {access_token}"}
    )

    assert response.status_code == 403


def test_provider_dashboard_arrivals_returns_upcoming_feed_in_chronological_order():
    provider_payload = {
        "full_name": "Arrival Provider",
        "email": "arrival-provider@ucd.ie",
        "password": "password123",
        "role": "provider"
    }
    register_response = client.post(
        "/api/auth/register",
        json=provider_payload
    )
    assert register_response.status_code == 200

    login_response = client.post(
        "/api/auth/login",
        json={
            "email": provider_payload["email"],
            "password": provider_payload["password"]
        }
    )
    headers = {
        "Authorization": f"Bearer {login_response.json()['access_token']}"
    }

    soon_start = (
        datetime.now() + timedelta(days=1)
    ).replace(microsecond=0)
    soon_end = soon_start + timedelta(hours=1)
    later_start = (
        datetime.now() + timedelta(days=2)
    ).replace(microsecond=0)
    later_end = later_start + timedelta(hours=1)
    past_start = (
        datetime.now() - timedelta(days=1)
    ).replace(microsecond=0)
    past_end = past_start + timedelta(hours=1)

    db = TestingSessionLocal()
    try:
        db.query(Booking).delete()
        db.add_all(
            [
                Booking(
                    id=30,
                    user_id=1,
                    venue_id="osm_296568074",
                    booking_date=later_start.date(),
                    start_time=later_start.time(),
                    end_time=later_end.time(),
                    seats_reserved=2,
                    status="confirmed",
                    order_id="ORD-arrival-later",
                    payment_status="paid"
                ),
                Booking(
                    id=31,
                    user_id=1,
                    venue_id="osm_296568075",
                    booking_date=soon_start.date(),
                    start_time=soon_start.time(),
                    end_time=soon_end.time(),
                    seats_reserved=1,
                    status="confirmed",
                    order_id="ORD-arrival-soon",
                    payment_status="paid"
                ),
                Booking(
                    id=32,
                    user_id=1,
                    venue_id="osm_296568074",
                    booking_date=soon_start.date(),
                    start_time=soon_start.time(),
                    end_time=soon_end.time(),
                    seats_reserved=1,
                    status="cancelled",
                    order_id="ORD-arrival-cancelled",
                    payment_status="refund_pending"
                ),
                Booking(
                    id=33,
                    user_id=1,
                    venue_id="osm_296568075",
                    booking_date=soon_start.date(),
                    start_time=soon_start.time(),
                    end_time=soon_end.time(),
                    seats_reserved=1,
                    status="completed",
                    order_id="ORD-arrival-completed",
                    payment_status="paid"
                ),
                Booking(
                    id=34,
                    user_id=1,
                    venue_id="osm_296568074",
                    booking_date=past_start.date(),
                    start_time=past_start.time(),
                    end_time=past_end.time(),
                    seats_reserved=1,
                    status="confirmed",
                    order_id="ORD-arrival-past",
                    payment_status="paid"
                )
            ]
        )
        db.commit()
    finally:
        db.close()

    response = client.get(
        "/api/provider/dashboard/arrivals",
        headers=headers
    )

    assert response.status_code == 200
    data = response.json()

    assert [item["booking_id"] for item in data["items"]] == [31, 30]
    assert data["items"][0]["client_full_name"] == "Test Student"
    assert data["items"][0]["venue_name"] == "UCD Village Study Hub"
    assert data["items"][0]["confirmation_status"] == "confirmed"
    assert data["items"][0]["space_label"] == "UCD Village Study Hub"
    assert data["items"][0]["fee_estimate"] == 4
    assert data["items"][1]["fee_estimate"] == 7

    limited_response = client.get(
        "/api/provider/dashboard/arrivals?limit=1",
        headers=headers
    )
    assert limited_response.status_code == 200
    assert len(limited_response.json()["items"]) == 1
    assert limited_response.json()["items"][0]["booking_id"] == 31


def test_deactivate_slot_requires_authentication():
    response = client.delete("/api/venues/osm_296568074/slots/1")
    assert response.status_code == 401


def test_deactivate_slot_rejects_standard_user():
    login_response = client.post(
        "/api/auth/login",
        json={"email": "test2@example.com", "password": "00000000"}
    )
    access_token = login_response.json()["access_token"]

    response = client.delete(
        "/api/venues/osm_296568074/slots/1",
        headers={"Authorization": f"Bearer {access_token}"}
    )

    assert response.status_code == 403


def test_deactivate_slot_returns_404_for_missing_slot():
    provider_payload = {
        "full_name": "Slot Provider",
        "email": "slot-provider-404@ucd.ie",
        "password": "password123",
        "role": "provider"
    }
    client.post("/api/auth/register", json=provider_payload)
    login_response = client.post(
        "/api/auth/login",
        json={
            "email": provider_payload["email"],
            "password": provider_payload["password"]
        }
    )
    headers = {
        "Authorization": f"Bearer {login_response.json()['access_token']}"
    }

    response = client.delete(
        "/api/venues/osm_296568074/slots/999",
        headers=headers
    )

    assert response.status_code == 404


def test_deactivate_slot_blocks_when_active_booking_overlaps():
    provider_payload = {
        "full_name": "Slot Provider",
        "email": "slot-provider-conflict@ucd.ie",
        "password": "password123",
        "role": "provider"
    }
    client.post("/api/auth/register", json=provider_payload)
    login_response = client.post(
        "/api/auth/login",
        json={
            "email": provider_payload["email"],
            "password": provider_payload["password"]
        }
    )
    headers = {
        "Authorization": f"Bearer {login_response.json()['access_token']}"
    }
    slot_date = date.today() + timedelta(days=3)

    db = TestingSessionLocal()
    try:
        slot = AvailabilitySlot(
            id=40,
            venue_id="osm_296568074",
            date=slot_date,
            start_time=time(9, 0),
            end_time=time(12, 0),
            available=True,
            available_seats=5
        )
        booking = Booking(
            id=40,
            user_id=1,
            venue_id="osm_296568074",
            booking_date=slot_date,
            start_time=time(10, 0),
            end_time=time(11, 0),
            seats_reserved=2,
            status="confirmed",
            order_id="ORD-slot-conflict",
            payment_status="paid"
        )
        db.add_all([slot, booking])
        db.commit()
    finally:
        db.close()

    response = client.delete(
        "/api/venues/osm_296568074/slots/40",
        headers=headers
    )

    assert response.status_code == 409
    assert response.json()["detail"] == (
        "An active booking exists during this time."
    )

    db = TestingSessionLocal()
    try:
        unchanged_slot = db.query(AvailabilitySlot).filter(
            AvailabilitySlot.id == 40
        ).one()
        assert unchanged_slot.available is True
        assert unchanged_slot.available_seats == 5
    finally:
        db.close()


def test_deactivate_slot_allows_when_only_inactive_bookings_overlap():
    provider_payload = {
        "full_name": "Slot Provider",
        "email": "slot-provider-success@ucd.ie",
        "password": "password123",
        "role": "provider"
    }
    client.post("/api/auth/register", json=provider_payload)
    login_response = client.post(
        "/api/auth/login",
        json={
            "email": provider_payload["email"],
            "password": provider_payload["password"]
        }
    )
    headers = {
        "Authorization": f"Bearer {login_response.json()['access_token']}"
    }
    slot_date = date.today() + timedelta(days=4)

    db = TestingSessionLocal()
    try:
        slot = AvailabilitySlot(
            id=41,
            venue_id="osm_296568075",
            date=slot_date,
            start_time=time(9, 0),
            end_time=time(12, 0),
            available=True,
            available_seats=4
        )
        cancelled_booking = Booking(
            id=41,
            user_id=1,
            venue_id="osm_296568075",
            booking_date=slot_date,
            start_time=time(9, 0),
            end_time=time(10, 0),
            seats_reserved=1,
            status="cancelled",
            order_id="ORD-slot-cancelled",
            payment_status="refund_pending"
        )
        completed_booking = Booking(
            id=42,
            user_id=1,
            venue_id="osm_296568075",
            booking_date=slot_date,
            start_time=time(10, 0),
            end_time=time(11, 0),
            seats_reserved=1,
            status="completed",
            order_id="ORD-slot-completed",
            payment_status="paid"
        )
        db.add_all([slot, cancelled_booking, completed_booking])
        db.commit()
    finally:
        db.close()

    response = client.delete(
        "/api/venues/osm_296568075/slots/41",
        headers=headers
    )

    assert response.status_code == 200
    assert response.json() == {
        "slot_id": 41,
        "venue_id": "osm_296568075",
        "available": False,
        "available_seats": 0,
        "message": "Slot deactivated successfully"
    }

    db = TestingSessionLocal()
    try:
        deactivated_slot = db.query(AvailabilitySlot).filter(
            AvailabilitySlot.id == 41
        ).one()
        assert deactivated_slot.available is False
        assert deactivated_slot.available_seats == 0
    finally:
        db.close()


def test_registration_rejects_invalid_role():
    response = client.post(
        "/api/auth/register",
        json={
            "full_name": "Invalid Role",
            "email": "invalid-role@ucd.ie",
            "password": "password123",
            "role": "admin"
        }
    )

    assert response.status_code == 422

# Test single venue retrieval and 404 error handling
def test_get_venue_by_id():
    # Existing venue ID lookup
    res_success = client.get("/api/venues/osm_296568074")
    assert res_success.status_code == 200
    assert res_success.json()["name"] == "UCD Library Shared Space"
    
    # Non-existent venue ID lookup
    res_404 = client.get("/api/venues/ghost_venue_id")
    assert res_404.status_code == 404


def test_get_venue_by_id_includes_busyness_fields(monkeypatch):
    def fake_get_busyness_predictions(venue_ids, hour=None, day_type=None):
        return {
            "osm_296568074": {
                "busyness_score": 32,
                "busyness_label": "Low"
            }
        }

    monkeypatch.setattr(
        main_module,
        "get_busyness_predictions",
        fake_get_busyness_predictions
    )

    response = client.get("/api/venues/osm_296568074")

    assert response.status_code == 200
    assert response.json()["busyness_score"] == 32
    assert response.json()["busyness_label"] == "Low"


def test_get_venue_availability_returns_real_slots():
    response = client.get("/api/venues/osm_296568074/availability")

    assert response.status_code == 200
    data = response.json()
    assert data["venue_id"] == "osm_296568074"
    assert data["available_slots"] == [
        {
            "slot_id": 1,
            "date": "2026-06-15",
            "start_time": "2026-06-15T09:00:00",
            "end_time": "2026-06-15T12:00:00",
            "available": True,
            "available_seats": 5
        }
    ]


def test_get_venue_availability_marks_unavailable_and_full_slots():
    db = TestingSessionLocal()
    try:
        unavailable_slot = AvailabilitySlot(
            id=20,
            venue_id="osm_296568074",
            date=date(2026, 6, 16),
            start_time=time(9, 0, 0),
            end_time=time(10, 0, 0),
            available=False,
            available_seats=3
        )
        full_slot = AvailabilitySlot(
            id=21,
            venue_id="osm_296568074",
            date=date(2026, 6, 16),
            start_time=time(10, 0, 0),
            end_time=time(11, 0, 0),
            available=True,
            available_seats=0
        )
        db.add_all([unavailable_slot, full_slot])
        db.commit()
    finally:
        db.close()

    response = client.get("/api/venues/osm_296568074/availability")

    assert response.status_code == 200
    slots = response.json()["available_slots"]
    assert slots[1] == {
        "slot_id": 20,
        "date": "2026-06-16",
        "start_time": "2026-06-16T09:00:00",
        "end_time": "2026-06-16T10:00:00",
        "available": False,
        "available_seats": 3
    }
    assert slots[2] == {
        "slot_id": 21,
        "date": "2026-06-16",
        "start_time": "2026-06-16T10:00:00",
        "end_time": "2026-06-16T11:00:00",
        "available": False,
        "available_seats": 0
    }


def test_get_venue_availability_returns_404_for_missing_venue():
    response = client.get("/api/venues/missing-venue/availability")

    assert response.status_code == 404
    assert response.json()["detail"] == "Venue not found"


def test_venue_survey_metrics_aggregate_verified_completed_reviews():
    db = TestingSessionLocal()
    try:
        db.query(PostBookingReview).delete()
        db.query(Booking).delete()

        bookings = [
            Booking(
                id=50,
                user_id=1,
                venue_id="osm_296568074",
                booking_date=date(2026, 6, 15),
                start_time=time(9, 0),
                end_time=time(10, 0),
                seats_reserved=1,
                status="completed",
                order_id="ORD-survey-1",
                payment_status="paid"
            ),
            Booking(
                id=51,
                user_id=1,
                venue_id="osm_296568074",
                booking_date=date(2026, 6, 15),
                start_time=time(10, 0),
                end_time=time(11, 0),
                seats_reserved=1,
                status="completed",
                order_id="ORD-survey-2",
                payment_status="paid"
            ),
            Booking(
                id=52,
                user_id=1,
                venue_id="osm_296568074",
                booking_date=date(2026, 6, 15),
                start_time=time(11, 0),
                end_time=time(12, 0),
                seats_reserved=1,
                status="completed",
                order_id="ORD-survey-3",
                payment_status="paid"
            ),
            Booking(
                id=53,
                user_id=1,
                venue_id="osm_296568074",
                booking_date=date(2026, 6, 15),
                start_time=time(12, 0),
                end_time=time(13, 0),
                seats_reserved=1,
                status="completed",
                order_id="ORD-survey-unverified",
                payment_status="paid"
            ),
            Booking(
                id=54,
                user_id=1,
                venue_id="osm_296568074",
                booking_date=date(2026, 6, 15),
                start_time=time(13, 0),
                end_time=time(14, 0),
                seats_reserved=1,
                status="confirmed",
                order_id="ORD-survey-not-completed",
                payment_status="paid"
            )
        ]
        reviews = [
            PostBookingReview(
                id=50,
                booking_id=50,
                user_id=1,
                venue_id="osm_296568074",
                wifi_score=3,
                plug_score=4,
                quietness_score=2,
                verified=True
            ),
            PostBookingReview(
                id=51,
                booking_id=51,
                user_id=1,
                venue_id="osm_296568074",
                wifi_score=4,
                plug_score=5,
                quietness_score=3,
                verified=True
            ),
            PostBookingReview(
                id=52,
                booking_id=52,
                user_id=1,
                venue_id="osm_296568074",
                wifi_score=5,
                plug_score=None,
                quietness_score=4,
                verified=True
            ),
            PostBookingReview(
                id=53,
                booking_id=53,
                user_id=1,
                venue_id="osm_296568074",
                wifi_score=1,
                plug_score=1,
                quietness_score=1,
                verified=False
            ),
            PostBookingReview(
                id=54,
                booking_id=54,
                user_id=1,
                venue_id="osm_296568074",
                wifi_score=1,
                plug_score=1,
                quietness_score=1,
                verified=True
            )
        ]
        db.add_all(bookings + reviews)
        db.commit()
    finally:
        db.close()

    response = client.get("/api/venues/osm_296568074/survey-metrics")

    assert response.status_code == 200
    assert response.json() == {
        "venue_id": "osm_296568074",
        "wifi_score": 4.0,
        "plug_score": "Too few ratings",
        "quietness_score": 3.0
    }


def test_venue_survey_metrics_returns_404_for_missing_venue():
    response = client.get("/api/venues/ghost_venue_id/survey-metrics")
    assert response.status_code == 404


def test_create_review_requires_authentication():
    response = client.post(
        "/api/reviews",
        json={
            "booking_id": 1,
            "wifi_score": 4,
            "plug_score": 4,
            "quietness_score": 4
        }
    )

    assert response.status_code == 401


def test_create_review_updates_venue_rating_and_api_payloads():
    login_response = client.post(
        "/api/auth/login",
        json={"email": "test2@example.com", "password": "00000000"}
    )
    headers = {
        "Authorization": f"Bearer {login_response.json()['access_token']}"
    }

    db = TestingSessionLocal()
    try:
        db.query(PostBookingReview).delete()
        db.query(Booking).delete()

        venue = db.query(Venue).filter(
            Venue.venue_id == "osm_296568074"
        ).one()
        venue.rating = 2.5

        completed_booking = Booking(
            id=70,
            user_id=1,
            venue_id="osm_296568074",
            booking_date=date(2026, 6, 15),
            start_time=time(9, 0),
            end_time=time(10, 0),
            seats_reserved=1,
            status="completed",
            order_id="ORD-review-completed",
            payment_status="paid"
        )
        previous_booking = Booking(
            id=71,
            user_id=1,
            venue_id="osm_296568074",
            booking_date=date(2026, 6, 14),
            start_time=time(9, 0),
            end_time=time(10, 0),
            seats_reserved=1,
            status="completed",
            order_id="ORD-review-previous",
            payment_status="paid"
        )
        previous_review = PostBookingReview(
            id=71,
            booking_id=71,
            user_id=1,
            venue_id="osm_296568074",
            wifi_score=3,
            plug_score=3,
            quietness_score=3,
            verified=True
        )

        db.add_all(
            [
                completed_booking,
                previous_booking,
                previous_review
            ]
        )
        db.commit()
    finally:
        db.close()

    response = client.post(
        "/api/reviews",
        headers=headers,
        json={
            "booking_id": 70,
            "wifi_score": 5,
            "plug_score": 4,
            "quietness_score": 3
        }
    )

    assert response.status_code == 200
    data = response.json()
    assert data["booking_id"] == 70
    assert data["verified"] is True
    assert data["venue_rating"] == 3.5

    venue_list_response = client.get("/api/venues?borough=Dublin South")
    assert venue_list_response.status_code == 200
    venue_list_items = venue_list_response.json()["items"]
    updated_venue = next(
        item
        for item in venue_list_items
        if item["venue_id"] == "osm_296568074"
    )
    assert updated_venue["rating"] == 3.5

    venue_detail_response = client.get("/api/venues/osm_296568074")
    assert venue_detail_response.status_code == 200
    assert venue_detail_response.json()["rating"] == 3.5


def test_create_review_rejects_non_owner_booking():
    login_response = client.post(
        "/api/auth/login",
        json={"email": "test2@example.com", "password": "00000000"}
    )
    headers = {
        "Authorization": f"Bearer {login_response.json()['access_token']}"
    }

    db = TestingSessionLocal()
    try:
        other_user = User(
            id=2,
            full_name="Other Reviewer",
            email="other-reviewer@example.com",
            password_hash=hash_password("00000000")
        )
        other_booking = Booking(
            id=72,
            user_id=2,
            venue_id="osm_296568074",
            booking_date=date(2026, 6, 15),
            start_time=time(9, 0),
            end_time=time(10, 0),
            seats_reserved=1,
            status="completed",
            order_id="ORD-review-other",
            payment_status="paid"
        )
        db.add_all([other_user, other_booking])
        db.commit()
    finally:
        db.close()

    response = client.post(
        "/api/reviews",
        headers=headers,
        json={
            "booking_id": 72,
            "wifi_score": 5,
            "plug_score": 5,
            "quietness_score": 5
        }
    )

    assert response.status_code == 404


def test_create_review_rejects_incomplete_and_duplicate_reviews():
    login_response = client.post(
        "/api/auth/login",
        json={"email": "test2@example.com", "password": "00000000"}
    )
    headers = {
        "Authorization": f"Bearer {login_response.json()['access_token']}"
    }

    db = TestingSessionLocal()
    try:
        db.query(PostBookingReview).delete()
        db.query(Booking).delete()

        incomplete_booking = Booking(
            id=73,
            user_id=1,
            venue_id="osm_296568074",
            booking_date=date(2026, 6, 15),
            start_time=time(9, 0),
            end_time=time(10, 0),
            seats_reserved=1,
            status="confirmed",
            order_id="ORD-review-incomplete",
            payment_status="paid"
        )
        completed_booking = Booking(
            id=74,
            user_id=1,
            venue_id="osm_296568074",
            booking_date=date(2026, 6, 15),
            start_time=time(10, 0),
            end_time=time(11, 0),
            seats_reserved=1,
            status="completed",
            order_id="ORD-review-duplicate",
            payment_status="paid"
        )
        existing_review = PostBookingReview(
            id=74,
            booking_id=74,
            user_id=1,
            venue_id="osm_296568074",
            wifi_score=4,
            plug_score=4,
            quietness_score=4,
            verified=True
        )
        db.add_all(
            [
                incomplete_booking,
                completed_booking,
                existing_review
            ]
        )
        db.commit()
    finally:
        db.close()

    incomplete_response = client.post(
        "/api/reviews",
        headers=headers,
        json={
            "booking_id": 73,
            "wifi_score": 5,
            "plug_score": 5,
            "quietness_score": 5
        }
    )
    assert incomplete_response.status_code == 409
    assert incomplete_response.json()["detail"] == (
        "Only completed bookings can be reviewed"
    )

    duplicate_response = client.post(
        "/api/reviews",
        headers=headers,
        json={
            "booking_id": 74,
            "wifi_score": 5,
            "plug_score": 5,
            "quietness_score": 5
        }
    )
    assert duplicate_response.status_code == 409
    assert duplicate_response.json()["detail"] == (
        "Review already exists for this booking"
    )


# Deep integration test for seat optimization limits and overbooking blockades
def test_booking_edge_cases():
    # Attempting to book 10 seats when the capacity limit is 5
    bad_payload = {
        "venue_id": "osm_296568074", "booking_date": "2026-06-15",
        "start_time": "09:00:00", "end_time": "10:00:00", "seats_reserved": 10
    }
    res_bad = client.post(
        "/api/bookings",
        json=bad_payload,
        headers=get_test_user_headers()
    )
    assert res_bad.status_code == 409
    assert res_bad.json()["detail"] == "Venue capacity exceeded for the requested time"


def test_booking_capacity_allows_overlap_until_seat_limit():
    first_payload = {
        "venue_id": "osm_296568074",
        "booking_date": "2026-06-15",
        "start_time": "10:00:00",
        "end_time": "11:00:00",
        "seats_reserved": 2
    }
    headers = get_test_user_headers()
    first_response = client.post(
        "/api/bookings",
        json=first_payload,
        headers=headers
    )
    assert first_response.status_code == 200

    second_payload = {
        **first_payload,
        "seats_reserved": 2
    }
    second_response = client.post(
        "/api/bookings",
        json=second_payload,
        headers=headers
    )
    assert second_response.status_code == 409
    assert second_response.json()["detail"] == (
        "Venue capacity exceeded for the requested time"
    )

    db = TestingSessionLocal()
    try:
        slot = db.query(AvailabilitySlot).filter(
            AvailabilitySlot.id == 1
        ).one()
        assert slot.available_seats == 5
    finally:
        db.close()


def test_booking_rejects_non_positive_seat_count():
    response = client.post(
        "/api/bookings",
        json={
            "venue_id": "osm_296568074",
            "booking_date": "2026-06-15",
            "start_time": "10:00:00",
            "end_time": "11:00:00",
            "seats_reserved": 0
        },
        headers=get_test_user_headers()
    )
    assert response.status_code == 422

# Verification of API firewall guards protecting user data endpoints
def test_get_me_unauthorized():
    # Unauthenticated requests to private profile routes must return HTTP 401
    response = client.get("/api/users/me")
    assert response.status_code == 401


def test_get_user_bookings_requires_authentication():
    response = client.get("/api/users/me/bookings")
    assert response.status_code == 401


def test_create_favorite_requires_authentication():
    response = client.post("/api/favorites/osm_296568074")
    assert response.status_code == 401


def test_create_favorite_adds_current_user_favorite():
    login_response = client.post(
        "/api/auth/login",
        json={"email": "test2@example.com", "password": "00000000"}
    )
    headers = {"Authorization": f"Bearer {login_response.json()['access_token']}"}

    response = client.post("/api/favorites/osm_296568074", headers=headers)
    assert response.status_code == 201
    assert response.json() == {
        "user_id": 1,
        "venue_id": "osm_296568074",
        "message": "Favorite created successfully"
    }

    db = TestingSessionLocal()
    try:
        favorite = db.query(Favorite).filter(
            Favorite.user_id == 1,
            Favorite.venue_id == "osm_296568074"
        ).first()
        assert favorite is not None
    finally:
        db.close()


def test_create_favorite_returns_404_for_missing_venue():
    login_response = client.post(
        "/api/auth/login",
        json={"email": "test2@example.com", "password": "00000000"}
    )
    headers = {"Authorization": f"Bearer {login_response.json()['access_token']}"}

    response = client.post("/api/favorites/missing-venue", headers=headers)
    assert response.status_code == 404
    assert response.json()["detail"] == "Venue not found"


def test_create_favorite_returns_409_for_duplicate_favorite():
    login_response = client.post(
        "/api/auth/login",
        json={"email": "test2@example.com", "password": "00000000"}
    )
    headers = {"Authorization": f"Bearer {login_response.json()['access_token']}"}

    db = TestingSessionLocal()
    try:
        favorite = Favorite(
            id=1,
            user_id=1,
            venue_id="osm_296568074"
        )
        db.add(favorite)
        db.commit()
    finally:
        db.close()

    response = client.post("/api/favorites/osm_296568074", headers=headers)
    assert response.status_code == 409
    assert response.json()["detail"] == "Favorite already exists"


def test_delete_favorite_requires_authentication():
    response = client.delete("/api/favorites/osm_296568074")
    assert response.status_code == 401


def test_delete_favorite_removes_current_user_favorite():
    login_response = client.post(
        "/api/auth/login",
        json={"email": "test2@example.com", "password": "00000000"}
    )
    headers = {"Authorization": f"Bearer {login_response.json()['access_token']}"}

    db = TestingSessionLocal()
    try:
        favorite = Favorite(
            id=1,
            user_id=1,
            venue_id="osm_296568074"
        )
        db.add(favorite)
        db.commit()
    finally:
        db.close()

    response = client.delete("/api/favorites/osm_296568074", headers=headers)
    assert response.status_code == 200
    assert response.json()["message"] == "Favorite removed successfully"

    db = TestingSessionLocal()
    try:
        deleted_favorite = db.query(Favorite).filter(
            Favorite.user_id == 1,
            Favorite.venue_id == "osm_296568074"
        ).first()
        assert deleted_favorite is None
    finally:
        db.close()


def test_delete_favorite_returns_404_for_missing_or_other_user_favorite():
    login_response = client.post(
        "/api/auth/login",
        json={"email": "test2@example.com", "password": "00000000"}
    )
    headers = {"Authorization": f"Bearer {login_response.json()['access_token']}"}

    db = TestingSessionLocal()
    try:
        other_user = User(
            id=2,
            full_name="Other User",
            email="other-fav@example.com",
            password_hash=hash_password("00000000")
        )
        other_favorite = Favorite(
            id=2,
            user_id=2,
            venue_id="osm_296568075"
        )
        db.add_all([other_user, other_favorite])
        db.commit()
    finally:
        db.close()

    missing_response = client.delete("/api/favorites/osm_296568074", headers=headers)
    assert missing_response.status_code == 404

    other_user_response = client.delete("/api/favorites/osm_296568075", headers=headers)
    assert other_user_response.status_code == 404

    db = TestingSessionLocal()
    try:
        protected_favorite = db.query(Favorite).filter(
            Favorite.user_id == 2,
            Favorite.venue_id == "osm_296568075"
        ).first()
        assert protected_favorite is not None
    finally:
        db.close()


def test_get_user_bookings_groups_sorts_and_isolates_users():
    login_response = client.post(
        "/api/auth/login",
        json={"email": "test2@example.com", "password": "00000000"}
    )
    access_token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}

    db = TestingSessionLocal()
    try:
        db.query(Booking).delete()
        other_user = User(
            id=2,
            full_name="Other User",
            email="other@example.com",
            password_hash=hash_password("00000000")
        )
        db.add(other_user)

        today = date.today()
        bookings = [
            Booking(
                id=10,
                user_id=1,
                venue_id="osm_296568074",
                booking_date=today + timedelta(days=2),
                start_time=time(10, 0),
                end_time=time(11, 0),
                seats_reserved=2,
                status="confirmed",
                order_id="ORD-upcoming-later",
                payment_status="paid"
            ),
            Booking(
                id=11,
                user_id=1,
                venue_id="osm_296568075",
                booking_date=today + timedelta(days=1),
                start_time=time(9, 0),
                end_time=time(10, 0),
                seats_reserved=1,
                status="confirmed",
                order_id="ORD-upcoming-sooner",
                payment_status="paid"
            ),
            Booking(
                id=12,
                user_id=1,
                venue_id="osm_296568074",
                booking_date=today - timedelta(days=2),
                start_time=time(9, 0),
                end_time=time(10, 0),
                seats_reserved=1,
                status="confirmed",
                order_id="ORD-completed-older",
                payment_status="paid"
            ),
            Booking(
                id=13,
                user_id=1,
                venue_id="osm_296568075",
                booking_date=today - timedelta(days=1),
                start_time=time(9, 0),
                end_time=time(10, 0),
                seats_reserved=1,
                status="completed",
                order_id="ORD-completed-recent",
                payment_status="paid"
            ),
            Booking(
                id=14,
                user_id=1,
                venue_id="osm_296568074",
                booking_date=today + timedelta(days=3),
                start_time=time(9, 0),
                end_time=time(10, 0),
                seats_reserved=1,
                status="canceled",
                order_id="ORD-cancelled",
                payment_status="refunded"
            ),
            Booking(
                id=15,
                user_id=2,
                venue_id="osm_296568074",
                booking_date=today + timedelta(days=1),
                start_time=time(9, 0),
                end_time=time(10, 0),
                seats_reserved=1,
                status="confirmed",
                order_id="ORD-other-user",
                payment_status="paid"
            )
        ]
        db.add_all(bookings)
        db.commit()
    finally:
        db.close()

    response = client.get("/api/users/me/bookings", headers=headers)
    assert response.status_code == 200
    data = response.json()

    assert [item["booking_id"] for item in data["upcoming"]] == [11, 10]
    assert [item["booking_id"] for item in data["completed"]] == [13, 12]
    assert [item["booking_id"] for item in data["cancelled"]] == [14]
    assert data["upcoming"][0]["venue_name"] == "UCD Village Study Hub"
    assert data["upcoming"][0]["lat"] == 53.3069
    assert data["upcoming"][0]["lon"] == -6.2218
    assert data["cancelled"][0]["status"] == "cancelled"


def test_cancel_booking_requires_authentication():
    response = client.patch("/api/bookings/1/cancel")
    assert response.status_code == 401


def test_cancel_booking_restores_inventory_and_allows_rebooking():
    login_response = client.post(
        "/api/auth/login",
        json={"email": "test2@example.com", "password": "00000000"}
    )
    headers = {
        "Authorization": f"Bearer {login_response.json()['access_token']}"
    }
    booking_start = (
        datetime.now() + timedelta(days=2)
    ).replace(microsecond=0)
    booking_end = booking_start + timedelta(hours=1)

    db = TestingSessionLocal()
    try:
        slot = AvailabilitySlot(
            id=10,
            venue_id="osm_296568074",
            date=booking_start.date(),
            start_time=booking_start.time(),
            end_time=booking_end.time(),
            available=True,
            available_seats=5
        )
        booking = Booking(
            id=10,
            user_id=1,
            venue_id="osm_296568074",
            booking_date=booking_start.date(),
            start_time=booking_start.time(),
            end_time=booking_end.time(),
            seats_reserved=2,
            status="confirmed",
            order_id="ORD-cancel-test",
            payment_status="paid"
        )
        db.add_all([slot, booking])
        db.commit()
    finally:
        db.close()

    response = client.patch("/api/bookings/10/cancel", headers=headers)
    assert response.status_code == 200
    assert response.json() == {
        "booking_id": 10,
        "status": "cancelled",
        "payment_status": "refund_pending",
        "released_seats": 2,
        "message": "Booking cancelled successfully"
    }

    db = TestingSessionLocal()
    try:
        restored_slot = db.query(AvailabilitySlot).filter(
            AvailabilitySlot.id == 10
        ).one()
        assert restored_slot.available_seats == 5
        assert restored_slot.available is True
    finally:
        db.close()

    second_response = client.patch("/api/bookings/10/cancel", headers=headers)
    assert second_response.status_code == 409

    rebooking_response = client.post(
        "/api/bookings",
        json={
            "venue_id": "osm_296568074",
            "booking_date": booking_start.date().isoformat(),
            "start_time": booking_start.time().isoformat(),
            "end_time": booking_end.time().isoformat(),
            "seats_reserved": 2
        },
        headers=headers
    )
    assert rebooking_response.status_code == 200


def test_cancel_booking_enforces_owner_and_deadline():
    login_response = client.post(
        "/api/auth/login",
        json={"email": "test2@example.com", "password": "00000000"}
    )
    headers = {
        "Authorization": f"Bearer {login_response.json()['access_token']}"
    }
    booking_start = (
        datetime.now() + timedelta(hours=23)
    ).replace(microsecond=0)
    booking_end = booking_start + timedelta(hours=1)

    db = TestingSessionLocal()
    try:
        other_user = User(
            id=2,
            full_name="Other User",
            email="other@example.com",
            password_hash=hash_password("00000000")
        )
        slot = AvailabilitySlot(
            id=11,
            venue_id="osm_296568075",
            date=booking_start.date(),
            start_time=booking_start.time(),
            end_time=booking_end.time(),
            available=True,
            available_seats=1
        )
        own_booking = Booking(
            id=11,
            user_id=1,
            venue_id="osm_296568075",
            booking_date=booking_start.date(),
            start_time=booking_start.time(),
            end_time=booking_end.time(),
            seats_reserved=1,
            status="confirmed",
            order_id="ORD-deadline-test",
            payment_status="paid"
        )
        other_booking = Booking(
            id=12,
            user_id=2,
            venue_id="osm_296568075",
            booking_date=booking_start.date(),
            start_time=booking_start.time(),
            end_time=booking_end.time(),
            seats_reserved=1,
            status="confirmed",
            order_id="ORD-owner-test",
            payment_status="paid"
        )
        db.add_all([other_user, slot, own_booking, other_booking])
        db.commit()
    finally:
        db.close()

    deadline_response = client.patch("/api/bookings/11/cancel", headers=headers)
    assert deadline_response.status_code == 409

    ownership_response = client.patch("/api/bookings/12/cancel", headers=headers)
    assert ownership_response.status_code == 404


@pytest.mark.parametrize(
    ("remember_me", "expected_days"),
    [(False, 7), (True, 30)]
)
def test_login_creates_hashed_refresh_session(remember_me, expected_days):
    response = client.post(
        "/api/auth/login",
        json={
            "email": "test2@example.com",
            "password": "00000000",
            "remember_me": remember_me
        }
    )
    assert response.status_code == 200

    refresh_token = response.json()["refresh_token"]
    db = TestingSessionLocal()
    try:
        session = db.query(RefreshSession).filter(
            RefreshSession.token_hash == hash_refresh_token(refresh_token)
        ).one()
        lifetime = session.expires_at - session.created_at
        assert session.token_hash != refresh_token
        assert len(session.token_hash) == 64
        assert lifetime == timedelta(days=expected_days)
    finally:
        db.close()


def test_refresh_token_rotation_and_reuse_detection():
    login_response = client.post(
        "/api/auth/login",
        json={"email": "test2@example.com", "password": "00000000"}
    )
    first_token = login_response.json()["refresh_token"]

    refresh_response = client.post(
        "/api/auth/refresh",
        json={"refresh_token": first_token}
    )
    assert refresh_response.status_code == 200
    assert (
        verify_access_token(
            refresh_response.json()["access_token"]
        )["role"]
        == "user"
    )
    second_token = refresh_response.json()["refresh_token"]
    assert second_token != first_token

    db = TestingSessionLocal()
    try:
        first_session = db.query(RefreshSession).filter(
            RefreshSession.token_hash == hash_refresh_token(first_token)
        ).one()
        second_session = db.query(RefreshSession).filter(
            RefreshSession.token_hash == hash_refresh_token(second_token)
        ).one()
        assert first_session.revoked_at is not None
        assert first_session.replaced_by_token_hash == second_session.token_hash
        assert first_session.family_id == second_session.family_id
        assert first_session.expires_at == second_session.expires_at
    finally:
        db.close()

    reuse_response = client.post(
        "/api/auth/refresh",
        json={"refresh_token": first_token}
    )
    assert reuse_response.status_code == 401
    assert reuse_response.json()["detail"] == "Refresh token reuse detected"

    family_response = client.post(
        "/api/auth/refresh",
        json={"refresh_token": second_token}
    )
    assert family_response.status_code == 401


def test_logout_revokes_refresh_token_family():
    login_response = client.post(
        "/api/auth/login",
        json={"email": "test2@example.com", "password": "00000000"}
    )
    refresh_token = login_response.json()["refresh_token"]

    logout_response = client.post(
        "/api/auth/logout",
        json={"refresh_token": refresh_token}
    )
    assert logout_response.status_code == 200

    refresh_response = client.post(
        "/api/auth/refresh",
        json={"refresh_token": refresh_token}
    )
    assert refresh_response.status_code == 401


def test_expired_refresh_token_is_rejected():
    login_response = client.post(
        "/api/auth/login",
        json={"email": "test2@example.com", "password": "00000000"}
    )
    refresh_token = login_response.json()["refresh_token"]

    db = TestingSessionLocal()
    try:
        session = db.query(RefreshSession).filter(
            RefreshSession.token_hash == hash_refresh_token(refresh_token)
        ).one()
        session.expires_at = datetime.utcnow() - timedelta(seconds=1)
        db.commit()
    finally:
        db.close()

    response = client.post(
        "/api/auth/refresh",
        json={"refresh_token": refresh_token}
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Refresh token has expired"
