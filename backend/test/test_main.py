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
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import Base, build_engine_options, get_db
from app.models import User, Venue, AvailabilitySlot, Booking
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

def test_get_venues_geospatial_sorting_and_radius():
    response = client.get(
        "/api/venues?borough=Dublin South&lat=53.3078&lon=-6.2230&radius=1"
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 2
    assert data["items"][0]["name"] == "UCD Library Shared Space"
    assert data["items"][0]["distance_km"] == 0
    assert data["items"][1]["distance_km"] > data["items"][0]["distance_km"]

    narrow_response = client.get(
        "/api/venues?borough=Dublin South&lat=53.3078&lon=-6.2230&radius=0.05"
    )
    assert narrow_response.status_code == 200
    narrow_data = narrow_response.json()
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
    me_response = client.get(
        "/api/users/me",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    assert me_response.status_code == 200
    assert me_response.json()["role"] == "provider"


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


def test_get_user_bookings_requires_authentication():
    response = client.get("/api/users/me/bookings")
    assert response.status_code == 401


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
            available=False,
            available_seats=3
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
            "user_id": 1,
            "venue_id": "osm_296568074",
            "booking_date": booking_start.date().isoformat(),
            "start_time": booking_start.time().isoformat(),
            "end_time": booking_end.time().isoformat(),
            "seats_reserved": 2
        }
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
