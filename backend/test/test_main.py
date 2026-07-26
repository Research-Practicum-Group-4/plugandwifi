import os
import sys
from datetime import date, datetime, time, timedelta, timezone

# Environment isolation and path alignment
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["SECRET_KEY"] = "secret_key_for_testing"
os.environ["ALGORITHM"] = "HS256"
os.environ["ACCESS_TOKEN_EXPIRE_MINUTES"] = "60"
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import httpx
import pytest
from fastapi import Depends, HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import main as main_module
from app.auth import create_access_token, hash_password, verify_access_token
from app.database import Base, build_engine_options, get_db
from app.main import app
from app.models import (
    AvailabilitySlot,
    Booking,
    Favorite,
    PostBookingReview,
    RefreshSession,
    User,
    Venue,
)
from app.rbac import require_roles
from app.refresh_tokens import hash_refresh_token

# SQLite test database configuration
TEST_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    TEST_DATABASE_URL, connect_args={"check_same_thread": False}, poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@app.get("/_test/provider-only")
def provider_only_route(current_user: User = Depends(require_roles("provider"))):
    return {"user_id": current_user.id}


client = TestClient(app)


def get_test_user_headers():
    login_response = client.post(
        "/api/auth/login", json={"email": "test2@example.com", "password": "00000000"}
    )
    return {"Authorization": f"Bearer {login_response.json()['access_token']}"}


def get_current_local_naive_datetime():
    return datetime.now(main_module.NYC_TIMEZONE).replace(tzinfo=None)


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
        "DB_KEEPALIVES_COUNT",
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
        "keepalives_count": 5,
    }


def test_get_busyness_predictions_uses_zone_model_contract(monkeypatch):
    main_module.BUSYNESS_PREDICTION_CACHE.clear()

    call_count = {"predict_many": 0}

    class FakeZonePredictor:
        def predict_many(self, venues, date, hour):
            call_count["predict_many"] += 1
            assert list(venues["zone_id"]) == [101]
            assert str(date) == "2026-07-22"
            assert hour == 14

            return [
                {
                    "venue_id": "osm_296568074",
                    "busyness_score": 72,
                    "busyness_label": "High",
                }
            ]

    pd = __import__("pandas")
    venue_rows = pd.DataFrame(
        [
            {
                "venue_id": "osm_296568074",
                "zone_id": 101,
                "name": "UCD Library Shared Space",
            },
            {
                "venue_id": "osm_296568075",
                "zone_id": 101,
                "name": "UCD Village Study Hub",
            },
            {
                "venue_id": "osm_296568076",
                "zone_id": 102,
                "name": "UCD Business Lounge",
            },
        ]
    )

    monkeypatch.setattr(
        main_module, "get_zone_busyness_predictor", lambda: FakeZonePredictor()
    )
    monkeypatch.setattr(
        main_module, "get_busyness_venues_dataframe", lambda: venue_rows
    )

    predictions = main_module.get_busyness_predictions(
        ["osm_296568074", "osm_296568075"], hour=14, prediction_date="2026-07-22"
    )

    assert predictions == {
        "osm_296568074": {
            "busyness_score": 72,
            "busyness_label": "High",
            "busyness_predicted_for": "2026-07-22T14:00:00",
        },
        "osm_296568075": {
            "busyness_score": 72,
            "busyness_label": "High",
            "busyness_predicted_for": "2026-07-22T14:00:00",
        },
    }
    assert call_count["predict_many"] == 1

    cached_predictions = main_module.get_busyness_predictions(
        ["osm_296568074", "osm_296568075"], hour=14, prediction_date="2026-07-22"
    )

    assert cached_predictions == predictions
    assert call_count["predict_many"] == 1

    main_module.BUSYNESS_PREDICTION_CACHE.clear()


def test_busyness_predictions_infer_zone_for_provider_venue(monkeypatch):
    main_module.BUSYNESS_PREDICTION_CACHE.clear()

    class FakeZonePredictor:
        def predict_many(self, venues, date, hour):
            assert list(venues["venue_id"]) == ["provider-test-zone"]
            assert list(venues["zone_id"]) == [101]
            return [
                {
                    "venue_id": "provider-test-zone",
                    "busyness_score": 44,
                    "busyness_label": "Medium",
                }
            ]

    pd = __import__("pandas")
    venue_rows = pd.DataFrame(
        [
            {"venue_id": "osm-near", "lat": 40.7501, "lon": -73.9901, "zone_id": 101},
            {"venue_id": "osm-far", "lat": 40.6, "lon": -73.8, "zone_id": 202},
        ]
    )

    monkeypatch.setattr(
        main_module, "get_zone_busyness_predictor", lambda: FakeZonePredictor()
    )
    monkeypatch.setattr(
        main_module, "get_busyness_venues_dataframe", lambda: venue_rows
    )

    predictions = main_module.get_busyness_predictions(
        ["provider-test-zone"],
        selected_date="2026-08-03",
        selected_time=time(9, 0),
        venue_locations={"provider-test-zone": (40.7502, -73.9902)},
    )

    assert predictions["provider-test-zone"]["busyness_score"] == 44
    assert predictions["provider-test-zone"]["busyness_label"] == "Medium"

    main_module.BUSYNESS_PREDICTION_CACHE.clear()


def test_busyness_diagnostics_reports_ready_with_sample_prediction(
    monkeypatch, tmp_path
):
    main_module.BUSYNESS_PREDICTION_CACHE.clear()

    model_path = tmp_path / "zone_busyness_model.joblib"
    venues_csv_path = tmp_path / "nyc_venues.csv"
    model_path.write_text("placeholder")
    venues_csv_path.write_text("placeholder")

    class FakeZonePredictor:
        def predict_many(self, venues, date, hour):
            return [
                {
                    "venue_id": venue["venue_id"],
                    "busyness_score": 64,
                    "busyness_label": "Medium",
                }
                for _, venue in venues.iterrows()
            ]

    pd = __import__("pandas")
    venue_rows = pd.DataFrame([{"venue_id": "osm_296568074", "zone_id": 101}])

    monkeypatch.setenv("BUSYNESS_MODEL_PATH", str(model_path))
    monkeypatch.setenv("BUSYNESS_VENUES_CSV", str(venues_csv_path))
    monkeypatch.setattr(
        main_module, "get_zone_busyness_predictor", lambda: FakeZonePredictor()
    )
    monkeypatch.setattr(
        main_module, "get_busyness_venues_dataframe", lambda: venue_rows
    )

    response = client.get("/api/diagnostics/busyness?sample_venue_id=osm_296568074")
    data = response.json()

    assert response.status_code == 200
    assert data["status"] == "ready"
    assert data["model_exists"] is True
    assert data["venues_csv_exists"] is True
    assert data["predictor_loaded"] is True
    assert data["venues_csv_loaded"] is True
    assert data["missing_columns"] == []
    assert data["sample"]["zone_id"] == 101
    assert data["sample"]["prediction_ready"] is True
    assert data["sample"]["prediction"]["busyness_score"] == 64
    assert data["sample"]["prediction"]["busyness_label"] == "Medium"

    main_module.BUSYNESS_PREDICTION_CACHE.clear()


def test_busyness_diagnostics_reports_not_ready_when_artifacts_missing(
    monkeypatch, tmp_path
):
    missing_model_path = tmp_path / "missing_model.joblib"
    missing_venues_csv_path = tmp_path / "missing_venues.csv"

    monkeypatch.setenv("BUSYNESS_MODEL_PATH", str(missing_model_path))
    monkeypatch.setenv("BUSYNESS_VENUES_CSV", str(missing_venues_csv_path))
    monkeypatch.setattr(main_module, "get_zone_busyness_predictor", lambda: None)
    monkeypatch.setattr(main_module, "get_busyness_venues_dataframe", lambda: None)

    response = client.get("/api/diagnostics/busyness")
    data = response.json()

    assert response.status_code == 200
    assert data["status"] == "not_ready"
    assert data["model_exists"] is False
    assert data["venues_csv_exists"] is False
    assert data["predictor_loaded"] is False
    assert data["venues_csv_loaded"] is False
    assert data["missing_columns"] == ["venue_id", "zone_id"]


def test_chatbot_recommend_returns_real_venue_suggestions(monkeypatch):
    def fake_get_busyness_predictions(
        venue_ids,
        hour=None,
        day_type=None,
        prediction_date=None,
        selected_date=None,
        selected_time=None,
    ):
        return {"osm_296568074": {"busyness_score": 32, "busyness_label": "Low"}}

    monkeypatch.setattr(
        main_module, "call_gemini_search_parameter_extraction", lambda message: None
    )
    monkeypatch.setattr(
        main_module, "get_busyness_predictions", fake_get_busyness_predictions
    )
    monkeypatch.setenv("GEMINI_MODEL", "gemini-test-model")

    response = client.post(
        "/api/chatbot/recommend",
        json={
                "message": "Find me a library with Wi-Fi and plug access near UCD that is not too busy."
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["model"] == "gemini-test-model"
    assert data["search_parameters"]["location"] == "UCD"
    assert data["search_parameters"]["venue_name"] is None
    assert data["search_parameters"]["venue_type"] == "library"
    assert data["search_parameters"]["wifi"] is True
    assert data["search_parameters"]["plug_access"] == 1
    assert data["search_parameters"]["busyness"] == "low"
    assert data["search_parameters"]["time"] is None
    assert data["venues"][0]["venue_id"] == "osm_296568074"
    assert data["venues"][0]["busyness_label"] == "Low"
    assert "Top matches:" in data["response"]
    assert data["follow_up_question"] is None


def test_chatbot_recommend_uses_extracted_radius_and_location(monkeypatch):
    monkeypatch.setattr(
        main_module,
        "call_gemini_search_parameter_extraction",
        lambda message: {
            "location": "UCD Library",
            "radius_km": 0.1,
            "venue_type": "library",
            "date": None,
            "start_time": None,
            "wifi": True,
            "plug_access": 1,
            "busyness": None,
            "time": None,
        },
    )
    monkeypatch.setattr(
        main_module,
        "get_busyness_predictions",
        lambda venue_ids, hour=None, day_type=None, prediction_date=None, selected_date=None, selected_time=None: {},
    )

    response = client.post(
        "/api/chatbot/recommend",
        json={"message": "Find a Wi-Fi workspace within 0.1km of UCD Library."},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["search_parameters"]["location"] == "UCD Library"
    assert data["search_parameters"]["radius_km"] == 0.1
    assert [venue["venue_id"] for venue in data["venues"]] == ["osm_296568074"]


def test_chatbot_recommend_applies_default_radius_for_near_location(monkeypatch):
    monkeypatch.setattr(
        main_module,
        "call_gemini_search_parameter_extraction",
        lambda message: {
            "location": "Times Square",
            "radius_km": None,
            "venue_type": "cafe",
            "date": None,
            "start_time": None,
            "wifi": True,
            "plug_access": 1,
            "busyness": None,
            "time": None,
        },
    )

    search_parameters = main_module.infer_chatbot_search_parameters(
        "I want something near Times Square with Wi-Fi"
    )

    assert search_parameters.location == "Times Square"
    assert search_parameters.radius_km == main_module.CHATBOT_DEFAULT_LOCATION_RADIUS_KM


def test_chatbot_recommend_applies_advanced_filters(monkeypatch):
    monkeypatch.setattr(
        main_module,
        "call_gemini_search_parameter_extraction",
        lambda message: {
            "location": None,
            "radius_km": None,
            "venue_type": "library",
            "date": "2026-06-15",
            "start_time": "09:30",
            "wifi": True,
            "plug_access": 1,
            "accessibility_friendly": True,
            "calls_allowed": True,
            "bcorp_certified": True,
            "busyness": None,
            "time": None,
        },
    )
    monkeypatch.setattr(
        main_module,
        "get_busyness_predictions",
        lambda venue_ids, hour=None, day_type=None, prediction_date=None, selected_date=None, selected_time=None: {
            venue_id: {
                "busyness_score": 20,
                "busyness_label": "Low",
                    "busyness_predicted_for": "2026-06-15T09:00:00",
            }
            for venue_id in venue_ids
        },
    )

    response = client.post(
        "/api/chatbot/recommend",
        json={
                "message": "Find an accessible B Corp venue with Wi-Fi, plugs and calls allowed on June 15 at 9:30am."
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data["venues"]) <= 3
    assert [venue["venue_id"] for venue in data["venues"]] == ["osm_296568074"]
    assert data["search_parameters"]["date"] == "2026-06-15"
    assert data["search_parameters"]["start_time"] == "09:30:00"
    assert data["search_parameters"]["plug_access"] == 1
    assert data["search_parameters"]["accessibility_friendly"] is True
    assert data["search_parameters"]["calls_allowed"] is True
    assert data["search_parameters"]["bcorp_certified"] is True


def test_default_gemini_model_uses_flash_lite(monkeypatch):
    monkeypatch.delenv("GEMINI_MODEL", raising=False)

    assert main_module.get_gemini_model() == "gemini-3.1-flash-lite"


def test_chatbot_recommend_uses_gemini_for_general_chat_without_search_intent(
    monkeypatch,
):
    monkeypatch.setattr(
        main_module, "call_gemini_search_parameter_extraction", lambda message: None
    )
    monkeypatch.setattr(
        main_module,
        "call_gemini_chatbot",
        lambda message, chat_history=None: "Hi! I can help you find a workspace. What area are you looking at?",
    )

    response = client.post(
        "/api/chatbot/recommend", json={"message": "Can you help me?"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["venues"] == []
    assert data["follow_up_question"] is None
    assert data["response"] == (
        "Hi! I can help you find a workspace. What area are you looking at?"
    )


def test_chatbot_recommend_location_alone_does_not_ask_for_preferences(monkeypatch):
    monkeypatch.setattr(
        main_module,
        "call_gemini_search_parameter_extraction",
        lambda message: {
            "location": "Times Square",
            "radius_km": None,
            "venue_type": None,
            "wifi": None,
            "plug_access": None,
            "time": None,
        },
    )

    response = client.post(
        "/api/chatbot/recommend",
        json={"message": "Find me recommendations near Times Square."},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["venues"] == []
    assert data["follow_up_question"] is None
    assert data["conversation_context"]["clarification_asked"] is False


def test_chatbot_recommend_does_not_repeat_preference_follow_up_after_partial_reply(
    monkeypatch,
):
    monkeypatch.setattr(
        main_module,
        "call_gemini_search_parameter_extraction",
        lambda message, chat_history=None: {
            "location": None,
            "radius_km": None,
            "venue_type": None,
            "wifi": True,
            "plug_access": 1,
            "time": None,
        },
    )
    monkeypatch.setattr(
        main_module,
        "search_venues_for_chatbot",
        lambda search_parameters, db, limit=3, **kwargs: ([], True),
    )

    response = client.post(
        "/api/chatbot/recommend",
        json={
            "message": "I need Wifi and plugs",
            "chat_history": [
                {
                    "role": "user",
                    "message": "I am near Times Square, give me some recommendations venue",
                },
                {
                    "role": "assistant",
                    "message": "Before I recommend venues, tell me your venue type, Wi-Fi, and plug access.",
                },
            ],
            "conversation_context": {
                "active_search_parameters": {
                    "location": "Times Square",
                    "radius_km": 3,
                },
                "last_recommended_venue_ids": [],
                "clarification_asked": True,
                "last_intent": "new_search",
            },
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["follow_up_question"] is None
    assert data["search_parameters"]["location"] == "Times Square"
    assert data["search_parameters"]["venue_name"] is None
    assert data["search_parameters"]["wifi"] is True
    assert data["search_parameters"]["plug_access"] == 1


def test_infer_chatbot_search_parameters_inherits_location_from_structured_context():
    search_parameters = main_module.infer_chatbot_search_parameters(
        "a cafe would be nice",
        [],
        main_module.ChatbotConversationContext(
            active_search_parameters=main_module.ChatbotSearchParameters(
                location="Times Square",
                radius_km=3,
                wifi=True,
                plug_access=1,
            ),
            last_intent=main_module.ChatbotIntent.NEW_SEARCH,
        ),
    )

    assert search_parameters.location == "Times Square"
    assert search_parameters.venue_name is None
    assert search_parameters.venue_type == "cafe"
    assert search_parameters.wifi is True
    assert search_parameters.plug_access == 1


def test_chatbot_recommend_returns_useful_no_result(monkeypatch):
    monkeypatch.setattr(
        main_module,
        "call_gemini_search_parameter_extraction",
        lambda message: {
            "location": None,
            "radius_km": None,
            "venue_type": "restaurant",
            "wifi": False,
            "plug_access": 0,
            "busyness": None,
            "time": None,
        },
    )

    response = client.post(
        "/api/chatbot/recommend", json={"message": "Find a restaurant without Wi-Fi."}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["venues"] == []
    assert data["follow_up_question"] is None
    assert data["response"] == (
        "I could not find matching venues. Try increasing the radius or relaxing one of the filters."
    )


def test_chatbot_recommend_treats_unanchored_location_as_venue_name(monkeypatch):
    monkeypatch.setattr(
        main_module,
        "call_gemini_search_parameter_extraction",
        lambda message: {
            "venue_name": None,
            "location": "Blue Bottle",
            "radius_km": None,
            "venue_type": None,
            "date": None,
            "start_time": None,
            "wifi": None,
            "plug_access": None,
            "busyness": None,
            "time": None,
        },
    )
    monkeypatch.setattr(
        main_module,
        "get_busyness_predictions",
        lambda venue_ids, hour=None, day_type=None, prediction_date=None, selected_date=None, selected_time=None: {
            venue_id: {} for venue_id in venue_ids
        },
    )

    response = client.post(
        "/api/chatbot/recommend", json={"message": "Recommend a Blue Bottle venue."}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["search_parameters"]["venue_name"] == "Blue Bottle"
    assert data["search_parameters"]["location"] is None


def test_chatbot_recommend_returns_specific_venue_lookup_response(monkeypatch):
    monkeypatch.setattr(
        main_module,
        "call_gemini_search_parameter_extraction",
        lambda message: {
            "venue_name": "UCD Library",
            "location": None,
            "radius_km": None,
            "venue_type": None,
            "date": None,
            "start_time": None,
            "wifi": None,
            "plug_access": None,
            "busyness": None,
            "time": None,
        },
    )
    monkeypatch.setattr(
        main_module,
        "get_busyness_predictions",
        lambda venue_ids, hour=None, day_type=None, prediction_date=None, selected_date=None, selected_time=None: {
            venue_id: {} for venue_id in venue_ids
        },
    )

    response = client.post(
        "/api/chatbot/recommend", json={"message": "Recommend UCD Library."}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["venues"][0]["venue_id"] == "osm_296568074"
    assert data["response"].startswith("I found UCD Library")
    assert "Top matches:" not in data["response"]


def test_chatbot_recommend_returns_specific_venue_address_response(monkeypatch):
    monkeypatch.setattr(
        main_module,
        "call_gemini_search_parameter_extraction",
        lambda message, chat_history=None: {
            "venue_name": "UCD Library Shared Space",
            "location": None,
            "radius_km": None,
            "venue_type": None,
            "date": None,
            "start_time": None,
            "wifi": None,
            "plug_access": None,
            "accessibility_friendly": None,
            "calls_allowed": None,
            "wbe_certified": None,
            "mbe_certified": None,
            "vbe_certified": None,
            "bcorp_certified": None,
            "lgbt_friendly": None,
            "busyness": None,
            "time": None,
        },
    )
    monkeypatch.setattr(
        main_module,
        "get_busyness_predictions",
        lambda venue_ids, hour=None, day_type=None, prediction_date=None, selected_date=None, selected_time=None: {
            venue_id: {} for venue_id in venue_ids
        },
    )

    response = client.post(
        "/api/chatbot/recommend",
        json={"message": "What is the address of UCD Library Shared Space?"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["venues"][0]["venue_id"] == "osm_296568074"
    assert data["response"] == (
        "The address of UCD Library Shared Space is 12, Library Road, Dublin South, D04A1B2."
    )
    assert "Top matches:" not in data["response"]


def test_chatbot_recommend_passes_recent_history_to_extractor(monkeypatch):
    captured = {}

    def fake_extractor(message, chat_history=None):
        captured["message"] = message
        captured["chat_history"] = chat_history
        return {
            "venue_name": None,
            "location": "UCD",
            "radius_km": None,
            "venue_type": "library",
            "date": None,
            "start_time": None,
            "wifi": True,
            "plug_access": 1,
            "busyness": "low",
            "time": "now",
        }

    monkeypatch.setattr(
        main_module, "call_gemini_search_parameter_extraction", fake_extractor
    )
    monkeypatch.setattr(
        main_module,
        "get_busyness_predictions",
        lambda venue_ids, hour=None, day_type=None, prediction_date=None, selected_date=None, selected_time=None: {},
    )

    response = client.post(
        "/api/chatbot/recommend",
        json={
            "message": "What about something quieter?",
            "chat_history": [
                {"role": "user", "message": "Find me a library near UCD."},
                {"role": "assistant", "message": "I found a few libraries near UCD."},
            ],
        },
    )

    assert response.status_code == 200
    assert captured["message"] == "What about something quieter?"
    assert len(captured["chat_history"]) == 2
    assert captured["chat_history"][0].message == "Find me a library near UCD."
    assert captured["chat_history"][1].role == "assistant"


def test_chatbot_recommend_compares_previous_candidates_by_distance(monkeypatch):
    monkeypatch.setattr(
        main_module,
        "call_gemini_search_parameter_extraction",
        lambda message, chat_history=None: {
            "venue_name": "Times Square",
            "location": None,
            "radius_km": None,
            "venue_type": None,
            "date": None,
            "start_time": None,
            "wifi": None,
            "plug_access": None,
            "accessibility_friendly": None,
            "calls_allowed": None,
            "wbe_certified": None,
            "mbe_certified": None,
            "vbe_certified": None,
            "bcorp_certified": None,
            "lgbt_friendly": None,
            "busyness": None,
            "time": None,
        },
    )
    monkeypatch.setattr(
        main_module,
        "get_busyness_predictions",
        lambda venue_ids, hour=None, day_type=None, prediction_date=None, selected_date=None, selected_time=None: {
            venue_id: {} for venue_id in venue_ids
        },
    )

    response = client.post(
        "/api/chatbot/recommend",
        json={
            "message": "which one is closer to UCD Library",
            "chat_history": [
                {
                    "role": "assistant",
                    "message": (
                        "Here are three strong default picks based on suitability, lower busyness, and rating.\n\n"
                        "• UCD Library Shared Space (Dublin South)\n"
                        "• UCD Village Study Hub (Dublin South)"
                    ),
                }
            ],
            "conversation_context": {
                "active_search_parameters": {},
                "last_recommended_venue_ids": [
                    "osm_296568074",
                    "osm_296568075",
                ],
                "clarification_asked": False,
                "last_intent": "new_search",
            },
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["search_parameters"]["location"] == "UCD Library"
    assert data["search_parameters"]["venue_name"] is None
    assert data["search_parameters"]["candidate_venue_names"] == []
    assert data["search_parameters"]["sort_by_distance"] is True
    assert data["venues"][0]["name"] == "UCD Library Shared Space"
    assert data["response"].startswith("Among your previous options,")
    assert {venue["name"] for venue in data["venues"]}.issubset(
        {"UCD Library Shared Space", "UCD Village Study Hub"}
    )


def test_chatbot_distance_follow_up_prefers_exact_candidate_names(monkeypatch):
    db = TestingSessionLocal()
    try:
        db.add_all(
            [
                Venue(
                    venue_id="osm_test_frederick",
                    name="The Frederick Hotel",
                    borough="Manhattan",
                    osm_type="hotel",
                    cuisine_type="hotel",
                    has_wifi=True,
                    accessibility_friendly=True,
                    calls_allowed=True,
                    wbe_certified=False,
                    mbe_certified=False,
                    vbe_certified=False,
                    bcorp_certified=False,
                    lgbt_friendly=True,
                    noise_level="moderate",
                    hourly_price=8.99,
                    opening_hours="Mo-Su 00:00-23:59",
                    lat=40.715575,
                    lon=-74.008857,
                    noise_score=0.3,
                    rating=4.5,
                    plug_access=1,
                    wifi_norm=1.0,
                    plug_norm=1.0,
                    rating_norm=0.9,
                    bus_norm=0.5,
                    train_norm=0.5,
                ),
                Venue(
                    venue_id="osm_test_modernhaus",
                    name="Modernhaus SoHo",
                    borough="Manhattan",
                    osm_type="hotel",
                    cuisine_type="hotel",
                    has_wifi=True,
                    accessibility_friendly=True,
                    calls_allowed=True,
                    wbe_certified=False,
                    mbe_certified=False,
                    vbe_certified=False,
                    bcorp_certified=False,
                    lgbt_friendly=True,
                    noise_level="moderate",
                    hourly_price=15.16,
                    opening_hours="Mo-Su 00:00-23:59",
                    lat=40.7226301,
                    lon=-74.0048444,
                    noise_score=0.3,
                    rating=5.0,
                    plug_access=1,
                    wifi_norm=1.0,
                    plug_norm=1.0,
                    rating_norm=1.0,
                    bus_norm=0.5,
                    train_norm=0.5,
                ),
                Venue(
                    venue_id="osm_test_renaissance",
                    name="Renaissance",
                    borough="Manhattan",
                    osm_type="hotel",
                    cuisine_type="hotel",
                    has_wifi=True,
                    accessibility_friendly=True,
                    calls_allowed=True,
                    wbe_certified=False,
                    mbe_certified=False,
                    vbe_certified=False,
                    bcorp_certified=False,
                    lgbt_friendly=True,
                    noise_level="moderate",
                    hourly_price=7.99,
                    opening_hours="Mo-Su 00:00-23:59",
                    lat=40.7517323,
                    lon=-73.9910643,
                    noise_score=0.3,
                    rating=5.0,
                    plug_access=1,
                    wifi_norm=1.0,
                    plug_norm=1.0,
                    rating_norm=1.0,
                    bus_norm=0.5,
                    train_norm=0.5,
                ),
                Venue(
                    venue_id="osm_test_renaissance_times_square",
                    name="Renaissance New York Times Square Hotel",
                    borough="Manhattan",
                    osm_type="hotel",
                    cuisine_type="hotel",
                    has_wifi=True,
                    accessibility_friendly=True,
                    calls_allowed=True,
                    wbe_certified=False,
                    mbe_certified=False,
                    vbe_certified=False,
                    bcorp_certified=False,
                    lgbt_friendly=True,
                    noise_level="moderate",
                    hourly_price=9.34,
                    opening_hours="Mo-Su 00:00-23:59",
                    lat=40.7597371,
                    lon=-73.9845837,
                    noise_score=0.3,
                    rating=2.4,
                    plug_access=0,
                    wifi_norm=1.0,
                    plug_norm=0.0,
                    rating_norm=0.4,
                    bus_norm=0.5,
                    train_norm=0.5,
                ),
            ]
        )
        db.commit()
    finally:
        db.close()

    monkeypatch.setattr(
        main_module,
        "call_gemini_search_parameter_extraction",
        lambda message, chat_history=None: {
            "venue_name": None,
            "location": None,
            "radius_km": None,
            "venue_type": None,
            "date": None,
            "start_time": None,
            "wifi": None,
            "plug_access": None,
            "accessibility_friendly": None,
            "calls_allowed": None,
            "wbe_certified": None,
            "mbe_certified": None,
            "vbe_certified": None,
            "bcorp_certified": None,
            "lgbt_friendly": None,
            "busyness": None,
            "time": None,
        },
    )
    monkeypatch.setattr(
        main_module,
        "get_busyness_predictions",
        lambda venue_ids, hour=None, day_type=None, prediction_date=None, selected_date=None, selected_time=None: {
            venue_id: {} for venue_id in venue_ids
        },
    )
    monkeypatch.setattr(
        main_module,
        "resolve_chatbot_location",
        lambda location, db: type(
            "ResolvedLocation", (), {"lat": 40.7580, "lon": -73.9855}
        )(),
    )

    response = client.post(
        "/api/chatbot/recommend",
        json={
            "message": "which one is closer to times square?",
            "chat_history": [
                {"role": "user", "message": "give me a venue"},
                {
                    "role": "assistant",
                    "message": (
                        "Here are three strong default picks based on suitability, lower busyness, and rating.\n\n"
                        "??The Frederick Hotel (Manhattan)\n"
                        "??Modernhaus SoHo (Manhattan)\n"
                        "??Renaissance (Manhattan)"
                    ),
                },
            ],
            "conversation_context": {
                "active_search_parameters": {},
                "last_recommended_venue_ids": [
                    "osm_test_frederick",
                    "osm_test_modernhaus",
                    "osm_test_renaissance",
                ],
                "clarification_asked": False,
                "last_intent": "new_search",
            },
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["search_parameters"]["candidate_venue_names"] == []
    assert data["response"].startswith("Among your previous options,")
    assert {venue["name"] for venue in data["venues"]}.issubset(
        {"The Frederick Hotel", "Modernhaus SoHo", "Renaissance"}
    )


def test_chatbot_recommend_asks_once_then_uses_defaults_for_generic_request(
    monkeypatch,
):
    monkeypatch.setattr(
        main_module, "call_gemini_search_parameter_extraction", lambda message: None
    )
    monkeypatch.setattr(
        main_module,
        "get_busyness_predictions",
        lambda venue_ids, hour=None, day_type=None, prediction_date=None, selected_date=None, selected_time=None: {
            venue_id: {"busyness_score": 20, "busyness_label": "Low"}
            for venue_id in venue_ids
        },
    )

    response = client.post(
        "/api/chatbot/recommend",
        json={"message": "Give me 3 venue recommendations"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["venues"] == []
    assert data["conversation_context"]["clarification_asked"] is True

    follow_up_response = client.post(
        "/api/chatbot/recommend",
        json={
            "message": "Okay",
            "conversation_context": data["conversation_context"],
        },
    )
    follow_up_data = follow_up_response.json()
    assert follow_up_response.status_code == 200
    assert 1 <= len(follow_up_data["venues"]) <= 3
    assert follow_up_data["follow_up_question"] is None


def test_normalize_chatbot_history_enforces_window_limits():
    oversized_message = "x" * 500
    chat_history = [
        main_module.ChatbotHistoryMessage(role="user", message=f"old-{index}")
        for index in range(10)
    ] + [main_module.ChatbotHistoryMessage(role="assistant", message=oversized_message)]

    normalized_history = main_module.normalize_chatbot_history(chat_history)

    assert len(normalized_history) <= main_module.CHATBOT_HISTORY_MAX_MESSAGES
    assert (
        normalized_history[-1].message
        == oversized_message[: main_module.CHATBOT_HISTORY_MAX_MESSAGE_CHARS]
    )
    assert (
        sum(len(item.message) for item in normalized_history)
        <= main_module.CHATBOT_HISTORY_MAX_TOTAL_CHARS
    )
    assert normalized_history[0].message.startswith("old-")


def test_chatbot_recommend_requires_message():
    response = client.post("/api/chatbot/recommend", json={"message": ""})

    assert response.status_code == 422


def test_call_gemini_chatbot_requires_api_key(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)

    with pytest.raises(HTTPException) as exc_info:
        main_module.call_gemini_chatbot("Find a workspace.")

    assert exc_info.value.status_code == 503
    assert exc_info.value.detail == "Gemini API key is not configured"


def test_call_gemini_chatbot_handles_api_failure(monkeypatch):
    def fake_post(*args, **kwargs):
        raise httpx.HTTPError("Gemini is unavailable")

    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    monkeypatch.setattr(main_module.httpx, "post", fake_post)

    with pytest.raises(HTTPException) as exc_info:
        main_module.call_gemini_chatbot("Find a workspace.")

    assert exc_info.value.status_code == 503
    assert exc_info.value.detail == "Gemini is temporarily unavailable"


@pytest.mark.parametrize(
    ("message", "expected_wifi"),
    [
        ("I need Wi-Fi", True),
        ("No Wi-Fi needed", False),
        ("Without wi-fi", False),
        ("Wireless is required", True),
    ],
)
def test_parse_wifi_preference_is_negative_first(message, expected_wifi):
    assert main_module.parse_wifi_preference(message) is expected_wifi


@pytest.mark.parametrize(
    ("message", "expected_plugs"),
    [
        ("I need plugs", 1),
        ("No plugs needed", 0),
        ("Without plug access", 0),
        ("A power outlet is required", 1),
    ],
)
def test_parse_plug_preference_is_negative_first(message, expected_plugs):
    assert main_module.parse_plug_preference(message) == expected_plugs


def test_explicit_false_preferences_override_structured_context(monkeypatch):
    monkeypatch.setattr(
        main_module, "call_gemini_search_parameter_extraction", lambda *args: None
    )
    context = main_module.ChatbotConversationContext(
        active_search_parameters=main_module.ChatbotSearchParameters(
            location="Times Square", radius_km=3, wifi=True, plug_access=1
        ),
        last_intent=main_module.ChatbotIntent.NEW_SEARCH,
    )

    _, parameters = main_module.interpret_chatbot_turn(
        "I also do not need wifi and need no plugs", [], context
    )

    assert parameters.location == "Times Square"
    assert parameters.wifi is False
    assert parameters.plug_access == 0


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        ("low", "low"),
        ("medium", "medium"),
        ("moderate", "medium"),
        ("Medium", "medium"),
        ("high", "high"),
        ("invalid", None),
    ],
)
def test_normalize_busyness_uses_canonical_vocabulary(value, expected):
    assert main_module.normalize_busyness_preference(value) == expected


@pytest.mark.parametrize(
    "payload",
    [
        {"message": "x" * 501},
        {
            "message": "valid",
            "chat_history": [
                {"role": "user", "message": f"message-{index}"}
                for index in range(13)
            ],
        },
        {
            "message": "valid",
            "chat_history": [{"role": "user", "message": "x" * 1001}],
        },
        {
            "message": "valid",
            "conversation_context": {
                "active_search_parameters": {"radius_km": 21},
                "last_recommended_venue_ids": [],
            },
        },
        {
            "message": "valid",
            "conversation_context": {
                "active_search_parameters": None,
                "last_recommended_venue_ids": [f"venue-{index}" for index in range(11)],
            },
        },
    ],
)
def test_chatbot_request_bounds_return_validation_error(payload):
    response = client.post("/api/chatbot/recommend", json=payload)
    assert response.status_code == 422


def test_normalize_chatbot_history_drops_oldest_messages_for_total_budget():
    history = [
        main_module.ChatbotHistoryMessage(
            role="user" if index % 2 == 0 else "assistant",
            message=f"{index}-" + ("x" * 998),
        )
        for index in range(8)
    ]

    normalized = main_module.normalize_chatbot_history(history)

    assert len(normalized) == 6
    assert normalized[0].message.startswith("2-")
    assert normalized[-1].message.startswith("7-")
    assert sum(len(item.message) for item in normalized) <= 6000


def test_gemini_extraction_rejects_non_object_and_invalid_values(monkeypatch):
    class FakeResponse:
        def __init__(self, text):
            self.text = text

        def raise_for_status(self):
            return None

        def json(self):
            return {
                "candidates": [
                    {"content": {"parts": [{"text": self.text}]}}
                ]
            }

    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    monkeypatch.setattr(
        main_module.httpx, "post", lambda *args, **kwargs: FakeResponse("[]")
    )
    assert main_module.call_gemini_search_parameter_extraction("test") is None

    monkeypatch.setattr(
        main_module.httpx,
        "post",
        lambda *args, **kwargs: FakeResponse(
            '{"location":"SoHo","busyness":"extreme","unknown":"ignored"}'
        ),
    )
    assert main_module.call_gemini_search_parameter_extraction("test") is None

    monkeypatch.setattr(
        main_module.httpx,
        "post",
        lambda *args, **kwargs: FakeResponse(
            '```json\n{"location":"SoHo","busyness":"moderate","unknown":"ignored"}\n```'
        ),
    )
    extracted = main_module.call_gemini_search_parameter_extraction("test")
    assert extracted["location"] == "SoHo"
    assert extracted["busyness"] == "moderate"
    assert "unknown" not in extracted


def test_chatbot_no_preference_returns_baseline_recommendations(monkeypatch):
    monkeypatch.setattr(
        main_module, "call_gemini_search_parameter_extraction", lambda *args: None
    )
    monkeypatch.setattr(
        main_module,
        "get_busyness_predictions",
        lambda venue_ids, **kwargs: {
            venue_id: {"busyness_score": 20, "busyness_label": "Low"}
            for venue_id in venue_ids
        },
    )

    response = client.post(
        "/api/chatbot/recommend", json={"message": "No preference"}
    )
    data = response.json()

    assert response.status_code == 200
    assert data["follow_up_question"] is None
    assert data["venues"]
    assert data["search_parameters"]["no_preference"] is True


def test_new_search_does_not_reuse_previous_venue_ids(monkeypatch):
    monkeypatch.setattr(
        main_module, "call_gemini_search_parameter_extraction", lambda *args: None
    )
    monkeypatch.setattr(
        main_module,
        "get_busyness_predictions",
        lambda venue_ids, **kwargs: {venue_id: {} for venue_id in venue_ids},
    )
    context = {
        "active_search_parameters": {"venue_type": "library"},
        "last_recommended_venue_ids": ["osm_296568074"],
        "clarification_asked": False,
        "last_intent": "new_search",
    }

    response = client.post(
        "/api/chatbot/recommend",
        json={
            "message": "Now find cafes near UCD instead",
            "conversation_context": context,
        },
    )
    data = response.json()

    assert response.status_code == 200
    assert data["search_parameters"]["location"] == "UCD", data
    assert data["search_parameters"]["venue_type"] == "cafe", data
    assert [venue["venue_id"] for venue in data["venues"]] == [
        "osm_296568075"
    ], data
    assert data["conversation_context"]["last_intent"] == "new_search"


def test_comparison_revalidates_client_ids_and_excludes_suspended_venues(monkeypatch):
    monkeypatch.setattr(
        main_module, "call_gemini_search_parameter_extraction", lambda *args: None
    )
    db = TestingSessionLocal()
    try:
        venue = db.query(Venue).filter(Venue.venue_id == "osm_296568074").one()
        venue.state = "Suspended"
        db.commit()
    finally:
        db.close()

    response = client.post(
        "/api/chatbot/recommend",
        json={
            "message": "Which one is least busy?",
            "conversation_context": {
                "active_search_parameters": {},
                "last_recommended_venue_ids": [
                    "osm_296568074",
                    "client-invented-id",
                ],
                "clarification_asked": False,
                "last_intent": "new_search",
            },
        },
    )

    assert response.status_code == 200, response.text
    assert response.json()["venues"] == []


def test_venue_detail_resolves_returned_name_against_active_context_ids(monkeypatch):
    monkeypatch.setattr(
        main_module, "call_gemini_search_parameter_extraction", lambda *args: None
    )
    monkeypatch.setattr(
        main_module,
        "get_busyness_predictions",
        lambda venue_ids, **kwargs: {venue_id: {} for venue_id in venue_ids},
    )

    response = client.post(
        "/api/chatbot/recommend",
        json={
            "message": "Tell me more about UCD Village Study Hub",
            "conversation_context": {
                "active_search_parameters": {},
                "last_recommended_venue_ids": [
                    "osm_296568074",
                    "osm_296568075",
                ],
                "clarification_asked": False,
                "last_intent": "new_search",
            },
        },
    )
    data = response.json()

    assert response.status_code == 200
    assert [venue["venue_id"] for venue in data["venues"]] == [
        "osm_296568075"
    ], data
    assert data["conversation_context"]["last_intent"] == "venue_detail"


def test_candidate_venue_name_extractor_has_one_supported_implementation():
    names = main_module.extract_chatbot_candidate_venue_names(
        [
            main_module.ChatbotHistoryMessage(
                role="assistant",
                message="• First Workspace (Manhattan)\n- Second Workspace (SoHo)",
            )
        ]
    )

    assert names == ["First Workspace", "Second Workspace"]


def test_chatbot_date_and_time_require_real_availability(monkeypatch):
    monkeypatch.setattr(
        main_module, "call_gemini_search_parameter_extraction", lambda *args: None
    )
    monkeypatch.setattr(
        main_module,
        "get_busyness_predictions",
        lambda venue_ids, **kwargs: {venue_id: {} for venue_id in venue_ids},
    )
    db = TestingSessionLocal()
    try:
        second_slot = (
            db.query(AvailabilitySlot)
            .filter(AvailabilitySlot.venue_id == "osm_296568075")
            .one()
        )
        second_slot.available = False
        db.commit()
    finally:
        db.close()

    context = {
        "active_search_parameters": {
            "date": "2026-06-15",
            "start_time": "09:30:00",
            "wifi": True,
        },
        "last_recommended_venue_ids": [],
        "clarification_asked": False,
        "last_intent": "new_search",
    }
    response = client.post(
        "/api/chatbot/recommend",
        json={
            "message": "Show me those options",
            "conversation_context": context,
        },
    )
    data = response.json()

    assert response.status_code == 200
    assert [venue["venue_id"] for venue in data["venues"]] == ["osm_296568074"]
    assert "available slot" in data["response"]


def test_reset_clears_filters_and_previous_venue_ids():
    response = client.post(
        "/api/chatbot/recommend",
        json={
            "message": "Start over",
            "conversation_context": {
                "active_search_parameters": {"wifi": True},
                "last_recommended_venue_ids": ["osm_296568074"],
                "clarification_asked": True,
                "last_intent": "new_search",
            },
        },
    )
    context = response.json()["conversation_context"]

    assert response.status_code == 200
    assert context["active_search_parameters"] is None
    assert context["last_recommended_venue_ids"] == []
    assert context["clarification_asked"] is False
    assert context["last_intent"] == "reset"


def test_known_landmarks_resolve_without_database_lookup():
    db = TestingSessionLocal()
    try:
        resolved = main_module.resolve_chatbot_location("Times Square", db)
    finally:
        db.close()

    assert resolved == (40.758, -73.9855)


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
            password_hash=hash_password("00000000"),
        )
        db.add(test_user)

        # B. Seed test venue with all required schema attributes
        test_venue = Venue(
            venue_id="osm_296568074",
            name="UCD Library Shared Space",
            borough="Dublin South",
            osm_type="bakery",
            cuisine_type="library",
            phone="+35315551234",
            website="https://ucdlibrary.example",
            building_number="12",
            street="Library Road",
            zipcode="D04A1B2",
            has_wifi=True,
            accessibility_friendly=True,
            calls_allowed=True,
            wbe_certified=False,
            mbe_certified=False,
            vbe_certified=False,
            bcorp_certified=True,
            lgbt_friendly=True,
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
            train_norm=0.7,
        )
        db.add(test_venue)

        second_venue = Venue(
            venue_id="osm_296568075",
            name="UCD Village Study Hub",
            borough="Dublin South",
            osm_type="cafe",
            cuisine_type="cafe",
            building_number="5",
            street="Campus Drive",
            zipcode="D04C3D4",
            has_wifi=True,
            accessibility_friendly=False,
            calls_allowed=False,
            wbe_certified=True,
            mbe_certified=False,
            vbe_certified=False,
            bcorp_certified=False,
            lgbt_friendly=True,
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
            train_norm=0.3,
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
            available_seats=5,
        )
        db.add(test_slot)

        second_slot = AvailabilitySlot(
            id=2,
            venue_id="osm_296568075",
            date=date(2026, 6, 15),
            start_time=time(9, 0, 0),
            end_time=time(12, 0, 0),
            available=True,
            available_seats=2,
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
            payment_status="paid",
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
        "plug_access",
        "hourly_price",
        "availability_window",
        "opening_hours_summary",
        "distance_km",
        "accessibility_friendly",
        "calls_allowed",
        "wbe_certified",
        "mbe_certified",
        "vbe_certified",
        "bcorp_certified",
        "lgbt_friendly",
    }
    assert required_fields.issubset(data["items"][0].keys())
    assert data["items"][0]["plug_access"] == 1
    assert data["items"][0]["hourly_price"] == 3.5
    assert data["items"][0]["opening_hours_summary"] == "Mo-Fr 09:00-17:00"
    assert "noise_level" not in data["items"][0]
    assert "noise_score" not in data["items"][0]
    assert "plugs_available" not in data["items"][0]
    assert "hourly_fee" not in data["items"][0]
    for field in (
        "accessibility_friendly",
        "calls_allowed",
        "wbe_certified",
        "mbe_certified",
        "vbe_certified",
        "bcorp_certified",
        "lgbt_friendly",
    ):
        assert isinstance(data["items"][0][field], bool)


def test_get_venues_includes_busyness_fields(monkeypatch):
    def fake_get_busyness_predictions(
        venue_ids,
        hour=None,
        day_type=None,
        prediction_date=None,
        selected_date=None,
        selected_time=None,
    ):
        return {
            "osm_296568074": {"busyness_score": 32, "busyness_label": "Low"},
            "osm_296568075": {"busyness_score": 85, "busyness_label": "High"},
        }

    monkeypatch.setattr(
        main_module, "get_busyness_predictions", fake_get_busyness_predictions
    )

    response = client.get("/api/venues?borough=Dublin South")

    assert response.status_code == 200
    data = response.json()
    assert data["items"][0]["busyness_score"] == 32
    assert data["items"][0]["busyness_label"] == "Low"
    assert data["items"][1]["busyness_score"] == 85
    assert data["items"][1]["busyness_label"] == "High"


def test_get_venues_busyness_uses_selected_date_time(monkeypatch):
    def fake_get_busyness_predictions(
        venue_ids,
        hour=None,
        day_type=None,
        prediction_date=None,
        selected_date=None,
        selected_time=None,
    ):
        assert selected_date == date(2026, 7, 24)
        assert selected_time == time(14, 30)

        return {
            "osm_296568074": {
                "busyness_score": 72,
                "busyness_label": "High",
                "busyness_predicted_for": "2026-07-24T14:00:00",
            }
        }

    monkeypatch.setattr(
        main_module, "get_busyness_predictions", fake_get_busyness_predictions
    )

    response = client.get(
        "/api/venues?borough=Dublin South&date=2026-07-24&start_time=14:30:00"
    )

    assert response.status_code == 200
    data = response.json()
    venue = next(item for item in data["items"] if item["venue_id"] == "osm_296568074")
    assert venue["busyness_score"] == 72
    assert venue["busyness_label"] == "High"
    assert venue["busyness_predicted_for"] == "2026-07-24T14:00:00"


def test_get_venues_includes_suitability_score():
    response = client.get("/api/venues?borough=Dublin South")

    assert response.status_code == 200
    data = response.json()
    assert data["items"][0]["suitability_score"] == 74.31
    assert data["items"][1]["suitability_score"] == 46.0


def test_get_venues_filters_by_advanced_filter_fields():
    response = client.get(
        "/api/venues?borough=Dublin South"
        "&wifi=true"
        "&plug_access=1"
        "&accessibility_friendly=true"
        "&calls_allowed=true"
        "&bcorp_certified=true"
        "&lgbt_friendly=true"
    )

    assert response.status_code == 200
    data = response.json()
    assert [item["venue_id"] for item in data["items"]] == ["osm_296568074"]


def test_get_venues_filters_by_multiple_venue_types_with_or_behaviour():
    response = client.get(
        "/api/venues?borough=Dublin South&venue_type=bakery&venue_type=cafe"
    )

    assert response.status_code == 200
    data = response.json()
    assert {item["venue_id"] for item in data["items"]} == {
        "osm_296568074",
        "osm_296568075",
    }

    bakery_response = client.get("/api/venues?borough=Dublin South&venue_type=bakery")

    assert bakery_response.status_code == 200
    assert [item["venue_id"] for item in bakery_response.json()["items"]] == [
        "osm_296568074"
    ]


def test_get_venues_filters_by_name_with_other_filters():
    response = client.get(
        "/api/venues?name=library&wifi=true&accessibility_friendly=true"
    )

    assert response.status_code == 200
    assert [item["venue_id"] for item in response.json()["items"]] == ["osm_296568074"]


def test_get_venues_can_sort_by_suitability():
    db = TestingSessionLocal()
    try:
        venue = db.query(Venue).filter(Venue.venue_id == "osm_296568075").one()
        venue.wifi_norm = 1.0
        venue.plug_norm = 1.0
        venue.rating_norm = 1.0
        venue.bus_norm = 1.0
        venue.train_norm = 1.0
        db.commit()
    finally:
        db.close()

    response = client.get("/api/venues?borough=Dublin South&sort=suitability")

    assert response.status_code == 200
    data = response.json()
    assert [item["venue_id"] for item in data["items"]] == [
        "osm_296568075",
        "osm_296568074",
    ]
    assert data["total_items"] == 2
    assert data["total_pages"] == 1


def test_get_venues_recommended_sort_uses_time_based_busyness(monkeypatch):
    db = TestingSessionLocal()
    try:
        for venue in (
            db.query(Venue)
            .filter(Venue.venue_id.in_(["osm_296568074", "osm_296568075"]))
            .all()
        ):
            venue.wifi_norm = 1.0
            venue.plug_norm = 1.0
            venue.rating_norm = 1.0
            venue.bus_norm = 1.0
            venue.train_norm = 1.0
        db.commit()
    finally:
        db.close()

    def fake_get_busyness_predictions(
        venue_ids,
        hour=None,
        day_type=None,
        prediction_date=None,
        selected_date=None,
        selected_time=None,
    ):
        assert selected_date == date(2026, 7, 24)
        assert selected_time == time(14, 30)

        return {
            "osm_296568074": {
                "busyness_score": 95,
                "busyness_label": "High",
                "busyness_predicted_for": "2026-07-24T14:00:00",
            },
            "osm_296568075": {
                "busyness_score": 5,
                "busyness_label": "Low",
                "busyness_predicted_for": "2026-07-24T14:00:00",
            },
        }

    monkeypatch.setattr(
        main_module, "get_busyness_predictions", fake_get_busyness_predictions
    )

    response = client.get(
        "/api/venues?borough=Dublin South&date=2026-07-24&start_time=14:30:00&sort=recommended"
    )

    assert response.status_code == 200
    data = response.json()
    assert [item["venue_id"] for item in data["items"]] == [
        "osm_296568075",
        "osm_296568074",
    ]
    assert data["items"][0]["suitability_score"] > data["items"][1]["suitability_score"]


def test_get_venues_radius_search_can_sort_by_suitability():
    db = TestingSessionLocal()
    try:
        venue = db.query(Venue).filter(Venue.venue_id == "osm_296568075").one()
        venue.wifi_norm = 1.0
        venue.plug_norm = 1.0
        venue.rating_norm = 1.0
        venue.bus_norm = 1.0
        venue.train_norm = 1.0
        db.commit()
    finally:
        db.close()

    response = client.get(
        "/api/venues?borough=Dublin South&lat=53.3078&lon=-6.2230&radius=1&sort=recommended"
    )

    assert response.status_code == 200
    data = response.json()
    assert [item["venue_id"] for item in data["items"]] == [
        "osm_296568075",
        "osm_296568074",
    ]
    assert data["items"][0]["distance_km"] is not None


def test_get_venues_suitability_score_handles_null_fields():
    db = TestingSessionLocal()
    try:
        venue = db.query(Venue).filter(Venue.venue_id == "osm_296568074").one()
        venue.wifi_norm = None
        venue.plug_norm = None
        venue.rating_norm = None
        venue.bus_norm = None
        venue.train_norm = None
        db.commit()
    finally:
        db.close()

    response = client.get("/api/venues?borough=Dublin South&sort=suitability")

    assert response.status_code == 200
    data = response.json()
    null_field_venue = next(
        item for item in data["items"] if item["venue_id"] == "osm_296568074"
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
                "type": "venue",
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
        venue = db.query(Venue).filter(Venue.venue_id == "osm_296568074").one()
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
    missing_date = client.get("/api/venues?start_time=09:00:00&duration_hours=1")
    assert missing_date.status_code == 400

    missing_start_time = client.get("/api/venues?date=2026-06-15&duration_hours=1")
    assert missing_start_time.status_code == 400


def test_create_booking_requires_authentication():
    booking_payload = {
        "venue_id": "osm_296568074",
        "booking_date": "2026-06-15",
        "start_time": "09:00:00",
        "end_time": "10:00:00",
        "seats_reserved": 2,
    }
    response = client.post("/api/bookings", json=booking_payload)
    assert response.status_code == 401


def test_create_booking_success():
    booking_payload = {
        "venue_id": "osm_296568074",
        "booking_date": "2026-06-15",
        "start_time": "09:00:00",
        "end_time": "10:00:00",
        "seats_reserved": 2,
    }
    response = client.post(
        "/api/bookings", json=booking_payload, headers=get_test_user_headers()
    )
    assert response.status_code == 200
    assert response.json()["user_id"] == 1
    assert response.json()["status"] == "pending_payment"
    assert response.json()["payment_status"] == "pending"


def test_create_booking_ignores_client_user_id():
    db = TestingSessionLocal()
    try:
        other_user = User(
            id=2,
            full_name="Other Booking User",
            email="other-booking@example.com",
            password_hash=hash_password("00000000"),
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
        "seats_reserved": 1,
    }
    response = client.post(
        "/api/bookings", json=booking_payload, headers=get_test_user_headers()
    )

    assert response.status_code == 200
    assert response.json()["user_id"] == 1


def test_mock_payment_confirm_success_marks_booking_paid():
    booking_response = client.post(
        "/api/bookings",
        json={
            "venue_id": "osm_296568074",
            "booking_date": "2026-06-15",
            "start_time": "09:00:00",
            "end_time": "10:00:00",
            "seats_reserved": 1,
        },
        headers=get_test_user_headers(),
    )
    booking_id = booking_response.json()["id"]

    response = client.post(
        "/api/payments/mock-confirm",
        json={"booking_id": booking_id, "card_number": "4242 4242 4242 4242"},
        headers=get_test_user_headers(),
    )

    assert response.status_code == 200
    data = response.json()
    assert data["booking_id"] == booking_id
    assert data["status"] == "confirmed"
    assert data["payment_status"] == "paid"


def test_mock_payment_confirm_failure_marks_booking_failed():
    booking_response = client.post(
        "/api/bookings",
        json={
            "venue_id": "osm_296568074",
            "booking_date": "2026-06-15",
            "start_time": "09:00:00",
            "end_time": "10:00:00",
            "seats_reserved": 1,
        },
        headers=get_test_user_headers(),
    )
    booking_id = booking_response.json()["id"]

    response = client.post(
        "/api/payments/mock-confirm",
        json={"booking_id": booking_id, "card_number": "4000 0000 0000 0002"},
        headers=get_test_user_headers(),
    )

    assert response.status_code == 200
    data = response.json()
    assert data["booking_id"] == booking_id
    assert data["status"] == "payment_failed"
    assert data["payment_status"] == "failed"


def test_register_flow():
    payload = {
        "full_name": "New Student",
        "email": "new@ucd.ie",
        "password": "password123",
    }
    # First registration attempt should succeed
    res1 = client.post("/api/auth/register", json=payload)
    assert res1.status_code == 200

    # Second registration with the same email should fail (Duplicate handling)
    res2 = client.post("/api/auth/register", json=payload)
    assert res2.status_code == 400
    assert res2.json()["detail"] == "Email already exists"

    login_response = client.post(
        "/api/auth/login",
        json={"email": payload["email"], "password": payload["password"]},
    )
    assert login_response.status_code == 200
    assert login_response.json()["user"]["role"] == "user"


def test_provider_registration_flow():
    payload = {
        "full_name": "New Provider",
        "email": "provider@ucd.ie",
        "password": "password123",
        "role": "provider",
    }

    register_response = client.post("/api/auth/register", json=payload)
    assert register_response.status_code == 200

    login_response = client.post(
        "/api/auth/login",
        json={"email": payload["email"], "password": payload["password"]},
    )
    assert login_response.status_code == 200
    assert login_response.json()["user"]["role"] == "provider"

    access_token = login_response.json()["access_token"]
    assert verify_access_token(access_token)["role"] == "provider"
    me_response = client.get(
        "/api/users/me", headers={"Authorization": f"Bearer {access_token}"}
    )
    assert me_response.status_code == 200
    assert me_response.json()["role"] == "provider"

    provider_response = client.get(
        "/_test/provider-only", headers={"Authorization": f"Bearer {access_token}"}
    )
    assert provider_response.status_code == 200
    assert provider_response.json()["user_id"] is not None


def test_provider_route_rejects_standard_user():
    login_response = client.post(
        "/api/auth/login", json={"email": "test2@example.com", "password": "00000000"}
    )
    access_token = login_response.json()["access_token"]

    response = client.get(
        "/_test/provider-only", headers={"Authorization": f"Bearer {access_token}"}
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "Insufficient permissions"


def test_provider_route_rejects_token_without_role():
    access_token = create_access_token({"user_id": 1, "email": "test2@example.com"})

    response = client.get(
        "/_test/provider-only", headers={"Authorization": f"Bearer {access_token}"}
    )

    assert response.status_code == 403


def test_provider_route_rejects_role_changed_after_token_issue():
    access_token = create_access_token(
        {"user_id": 1, "email": "test2@example.com", "role": "provider"}
    )

    response = client.get(
        "/_test/provider-only", headers={"Authorization": f"Bearer {access_token}"}
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
            "seat_capacity": 12,
        },
    )

    assert response.status_code == 401


def test_create_venue_rejects_standard_user():
    login_response = client.post(
        "/api/auth/login", json={"email": "test2@example.com", "password": "00000000"}
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
            "seat_capacity": 12,
        },
    )

    assert response.status_code == 403


def test_provider_created_pending_venue_stays_hidden_until_admin_activation():
    provider_payload = {
        "full_name": "Venue Creator",
        "email": "venue-creator@ucd.ie",
        "password": "password123",
        "role": "provider",
    }
    register_response = client.post("/api/auth/register", json=provider_payload)
    assert register_response.status_code == 200

    login_response = client.post(
        "/api/auth/login",
        json={
            "email": provider_payload["email"],
            "password": provider_payload["password"],
        },
    )
    headers = {"Authorization": f"Bearer {login_response.json()['access_token']}"}

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
        "hourly_price": 5.5,
    }

    response = client.post("/api/venues", headers=headers, json=create_payload)

    assert response.status_code == 200
    data = response.json()
    assert data["venue_id"].startswith("provider-")
    assert data["name"] == "Provider Study Room"
    assert data["state"] == "Pending Approval"
    assert data["seat_capacity"] == 12
    assert data["amenity_tags"] == ["wifi", "plugs", "quiet"]

    db = TestingSessionLocal()
    try:
        created_venue = db.query(Venue).filter(Venue.venue_id == data["venue_id"]).one()
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
                available_seats=12,
            )
        )
        db.add(
            User(
                id=93,
                full_name="Venue Approval Admin",
                email="venue-approval-admin@example.com",
                password_hash=hash_password("00000000"),
                role="admin",
            )
        )
        db.commit()
    finally:
        db.close()

    venues_response = client.get("/api/venues?borough=Dublin South")
    assert venues_response.status_code == 200
    venue_ids = [item["venue_id"] for item in venues_response.json()["items"]]
    assert data["venue_id"] not in venue_ids

    radius_response = client.get(
        "/api/venues?borough=Dublin South&lat=53.31&lon=-6.22&radius=1"
    )
    assert radius_response.status_code == 200
    radius_venue_ids = [item["venue_id"] for item in radius_response.json()["items"]]
    assert data["venue_id"] not in radius_venue_ids

    availability_response = client.get(
        "/api/venues?borough=Dublin South&date=2026-06-15&start_time=09:00:00&duration_hours=3&seats_required=1"
    )
    assert availability_response.status_code == 200
    availability_venue_ids = [
        item["venue_id"] for item in availability_response.json()["items"]
    ]
    assert data["venue_id"] not in availability_venue_ids

    suggestions_response = client.get("/api/venues/suggestions?q=provider")
    assert suggestions_response.status_code == 200
    suggestion_venue_ids = [
        item["venue_id"] for item in suggestions_response.json()["items"]
    ]
    assert data["venue_id"] not in suggestion_venue_ids

    admin_login_response = client.post(
        "/api/auth/login",
        json={"email": "venue-approval-admin@example.com", "password": "00000000"},
    )
    admin_headers = {
        "Authorization": f"Bearer {admin_login_response.json()['access_token']}"
    }

    activation_response = client.patch(
        f"/api/admin/venues/{data['venue_id']}/suspension",
        headers=admin_headers,
        json={"state": "Active"},
    )
    assert activation_response.status_code == 200
    assert activation_response.json() == {
        "venue_id": data["venue_id"],
        "state": "Active",
        "cancelled_bookings": 0,
        "released_seats": 0,
        "message": "Venue activated successfully",
    }

    activated_response = client.get("/api/venues?borough=Dublin South")
    assert activated_response.status_code == 200
    activated_venue_ids = [
        item["venue_id"] for item in activated_response.json()["items"]
    ]
    assert data["venue_id"] in activated_venue_ids


def test_create_venue_rejects_invalid_payload():
    provider_payload = {
        "full_name": "Invalid Venue Provider",
        "email": "invalid-venue-provider@ucd.ie",
        "password": "password123",
        "role": "provider",
    }
    register_response = client.post("/api/auth/register", json=provider_payload)
    assert register_response.status_code == 200

    login_response = client.post(
        "/api/auth/login",
        json={
            "email": provider_payload["email"],
            "password": provider_payload["password"],
        },
    )
    headers = {"Authorization": f"Bearer {login_response.json()['access_token']}"}

    response = client.post(
        "/api/venues",
        headers=headers,
        json={
            "name": "",
            "lat": 100,
            "lon": -6.2,
            "borough": "Dublin South",
            "seat_capacity": 0,
        },
    )

    assert response.status_code == 422


def test_provider_submission_admin_review_and_public_search_flow(monkeypatch):
    monkeypatch.setattr(main_module, "get_current_local_date", lambda: date(2026, 8, 3))
    provider_payload = {
        "full_name": "End To End Provider",
        "email": "end-to-end-provider@ucd.ie",
        "password": "password123",
        "role": "provider",
    }
    assert client.post("/api/auth/register", json=provider_payload).status_code == 200
    provider_login = client.post(
        "/api/auth/login",
        json={
            "email": provider_payload["email"],
            "password": provider_payload["password"],
        },
    )
    provider_headers = {
        "Authorization": f"Bearer {provider_login.json()['access_token']}"
    }

    create_response = client.post(
        "/api/venues",
        headers=provider_headers,
        json={
            "name": "Approval Flow Workspace",
            "osm_type": "cafe",
            "street": "350 5th Avenue",
            "zipcode": "NY 10001",
            "lat": 40.7484,
            "lon": -73.9857,
            "borough": "Manhattan",
            "opening_hours": "Mon, Wed, Fri 09:00-17:00",
            "seat_capacity": 8,
            "amenity_tags": ["wifi", "power outlets"],
            "rules_text": "Keep calls brief.",
            "has_wifi": True,
            "plug_access": 8,
            "hourly_price": 4.5,
            "accessibility_friendly": True,
            "wbe_certified": True,
            "availability_days": [0, 2, 4],
            "availability_start_time": "09:00:00",
            "availability_end_time": "17:00:00",
        },
    )
    assert create_response.status_code == 200
    venue_id = create_response.json()["venue_id"]
    assert create_response.json()["state"] == "Pending Approval"

    provider_venues = client.get("/api/provider/venues", headers=provider_headers)
    assert provider_venues.status_code == 200
    assert venue_id in [item["venue_id"] for item in provider_venues.json()["items"]]

    db = TestingSessionLocal()
    try:
        slots = (
            db.query(AvailabilitySlot)
            .filter(AvailabilitySlot.venue_id == venue_id)
            .order_by(AvailabilitySlot.date)
            .all()
        )
        assert len(slots) == 13
        assert slots[0].date == date(2026, 8, 3)
        assert slots[1].date == date(2026, 8, 5)
        assert slots[2].date == date(2026, 8, 7)
        assert {slot.start_time for slot in slots} == {time(9, 0)}
        assert {slot.end_time for slot in slots} == {time(17, 0)}
        assert {slot.available_seats for slot in slots} == {8}
    finally:
        db.close()

    hidden_search = client.get("/api/venues?name=Approval Flow Workspace")
    assert hidden_search.status_code == 200
    assert venue_id not in [item["venue_id"] for item in hidden_search.json()["items"]]

    admin_payload = {
        "full_name": "End To End Admin",
        "email": "end-to-end-admin@ucd.ie",
        "password": "password123",
        "role": "user",
    }
    assert client.post("/api/auth/register", json=admin_payload).status_code == 200
    db = TestingSessionLocal()
    try:
        admin = db.query(User).filter(User.email == admin_payload["email"]).one()
        admin.role = "admin"
        db.commit()
    finally:
        db.close()
    admin_login = client.post(
        "/api/auth/login",
        json={"email": admin_payload["email"], "password": admin_payload["password"]},
    )
    admin_headers = {
        "Authorization": f"Bearer {admin_login.json()['access_token']}"
    }

    pending_response = client.get(
        "/api/admin/venues/pending", headers=admin_headers
    )
    assert pending_response.status_code == 200
    pending_item = next(
        item for item in pending_response.json()["items"] if item["venue_id"] == venue_id
    )
    assert pending_item["provider_email"] == provider_payload["email"]
    assert pending_item["availability_date"] == "2026-08-03"
    assert pending_item["availability_start_time"] == "09:00:00"

    review_response = client.patch(
        f"/api/admin/venues/{venue_id}/review",
        headers=admin_headers,
        json={"decision": "approve"},
    )
    assert review_response.status_code == 200
    assert review_response.json()["state"] == "Active"

    visible_search = client.get(
        "/api/venues?name=Approval Flow Workspace"
        "&date=2026-08-03&start_time=09:00:00&duration_hours=2&seats_required=1"
    )
    assert visible_search.status_code == 200
    assert venue_id in [item["venue_id"] for item in visible_search.json()["items"]]


def test_provider_dashboard_kpis_requires_authentication():
    response = client.get("/api/provider/dashboard/kpis")
    assert response.status_code == 401


def test_provider_dashboard_kpis_rejects_standard_user():
    login_response = client.post(
        "/api/auth/login", json={"email": "test2@example.com", "password": "00000000"}
    )
    access_token = login_response.json()["access_token"]

    response = client.get(
        "/api/provider/dashboard/kpis",
        headers={"Authorization": f"Bearer {access_token}"},
    )

    assert response.status_code == 403


def test_provider_dashboard_kpis_returns_window_metrics_and_deltas():
    provider_payload = {
        "full_name": "KPI Provider",
        "email": "kpi-provider@ucd.ie",
        "password": "password123",
        "role": "provider",
    }
    register_response = client.post("/api/auth/register", json=provider_payload)
    assert register_response.status_code == 200

    login_response = client.post(
        "/api/auth/login",
        json={
            "email": provider_payload["email"],
            "password": provider_payload["password"],
        },
    )
    headers = {"Authorization": f"Bearer {login_response.json()['access_token']}"}

    today = datetime.now(timezone.utc).date()
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
                    available_seats=5,
                ),
                AvailabilitySlot(
                    id=21,
                    venue_id="osm_296568075",
                    date=current_booking_date,
                    start_time=time(9, 0),
                    end_time=time(12, 0),
                    available=True,
                    available_seats=5,
                ),
                AvailabilitySlot(
                    id=22,
                    venue_id="osm_296568074",
                    date=previous_booking_date,
                    start_time=time(9, 0),
                    end_time=time(12, 0),
                    available=True,
                    available_seats=5,
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
                    payment_status="paid",
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
                    payment_status="paid",
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
                    payment_status="paid",
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
                    payment_status="refund_pending",
                ),
            ]
        )
        db.commit()
    finally:
        db.close()

    response = client.get("/api/provider/dashboard/kpis", headers=headers)

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
        "/api/auth/login", json={"email": "test2@example.com", "password": "00000000"}
    )
    access_token = login_response.json()["access_token"]

    response = client.get(
        "/api/admin/dashboard/overview",
        headers={"Authorization": f"Bearer {access_token}"},
    )

    assert response.status_code == 403


def test_admin_dashboard_overview_rejects_provider_user():
    provider_payload = {
        "full_name": "Admin Blocked Provider",
        "email": "admin-blocked-provider@ucd.ie",
        "password": "password123",
        "role": "provider",
    }
    register_response = client.post("/api/auth/register", json=provider_payload)
    assert register_response.status_code == 200

    login_response = client.post(
        "/api/auth/login",
        json={
            "email": provider_payload["email"],
            "password": provider_payload["password"],
        },
    )
    access_token = login_response.json()["access_token"]

    response = client.get(
        "/api/admin/dashboard/overview",
        headers={"Authorization": f"Bearer {access_token}"},
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
            role="admin",
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
                    available_seats=5,
                ),
                AvailabilitySlot(
                    id=61,
                    venue_id="osm_296568075",
                    date=date(2026, 7, 1),
                    start_time=time(9, 0),
                    end_time=time(12, 0),
                    available=True,
                    available_seats=5,
                ),
                AvailabilitySlot(
                    id=62,
                    venue_id="osm_296568075",
                    date=date(2026, 7, 2),
                    start_time=time(9, 0),
                    end_time=time(12, 0),
                    available=False,
                    available_seats=0,
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
                    payment_status="paid",
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
                    payment_status="paid",
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
                    payment_status="refund_pending",
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
                    payment_status="paid",
                ),
            ]
        )
        db.commit()
    finally:
        db.close()

    login_response = client.post(
        "/api/auth/login", json={"email": "admin@example.com", "password": "00000000"}
    )
    headers = {"Authorization": f"Bearer {login_response.json()['access_token']}"}

    response = client.get("/api/admin/dashboard/overview", headers=headers)

    assert response.status_code == 200
    data = response.json()
    assert data["global_active_properties"] == 2
    assert data["total_completed_checkout_revenues"] == pytest.approx(18.0)
    assert data["system_incident_counts"] == {
        "cancelled_bookings": 2,
        "refund_pending_bookings": 1,
        "unavailable_slots": 1,
    }


def test_admin_venue_suspension_requires_authentication():
    response = client.patch(
        "/api/admin/venues/osm_296568074/suspension", json={"state": "Suspended"}
    )

    assert response.status_code == 401


def test_admin_venue_suspension_rejects_non_admin_user():
    login_response = client.post(
        "/api/auth/login", json={"email": "test2@example.com", "password": "00000000"}
    )
    access_token = login_response.json()["access_token"]

    response = client.patch(
        "/api/admin/venues/osm_296568074/suspension",
        headers={"Authorization": f"Bearer {access_token}"},
        json={"state": "Suspended"},
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
            role="admin",
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
            payment_status="paid",
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
            payment_status="paid",
        )
        db.add_all([active_booking, completed_booking])
        db.commit()
    finally:
        db.close()

    login_response = client.post(
        "/api/auth/login",
        json={"email": "suspension-admin@example.com", "password": "00000000"},
    )
    headers = {"Authorization": f"Bearer {login_response.json()['access_token']}"}

    response = client.patch(
        "/api/admin/venues/osm_296568074/suspension",
        headers=headers,
        json={"state": "Suspended"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "venue_id": "osm_296568074",
        "state": "Suspended",
        "cancelled_bookings": 1,
        "released_seats": 2,
        "message": "Venue suspended successfully",
    }

    db = TestingSessionLocal()
    try:
        venue = db.query(Venue).filter(Venue.venue_id == "osm_296568074").one()
        cancelled_booking = db.query(Booking).filter(Booking.id == 80).one()
        completed_booking = db.query(Booking).filter(Booking.id == 81).one()

        assert venue.state == "Suspended"
        assert cancelled_booking.status == "cancelled"
        assert cancelled_booking.payment_status == "refund_pending"
        assert completed_booking.status == "completed"
        assert completed_booking.payment_status == "paid"
    finally:
        db.close()

    venues_response = client.get("/api/venues?borough=Dublin South")
    assert venues_response.status_code == 200
    venue_ids = [item["venue_id"] for item in venues_response.json()["items"]]
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
            role="admin",
        )
        db.add(admin_user)
        db.commit()
    finally:
        db.close()

    login_response = client.post(
        "/api/auth/login",
        json={"email": "missing-venue-admin@example.com", "password": "00000000"},
    )
    headers = {"Authorization": f"Bearer {login_response.json()['access_token']}"}

    response = client.patch(
        "/api/admin/venues/ghost_venue_id/suspension",
        headers=headers,
        json={"state": "Suspended"},
    )

    assert response.status_code == 404


def test_provider_dashboard_arrivals_requires_authentication():
    response = client.get("/api/provider/dashboard/arrivals")
    assert response.status_code == 401


def test_provider_dashboard_arrivals_rejects_standard_user():
    login_response = client.post(
        "/api/auth/login", json={"email": "test2@example.com", "password": "00000000"}
    )
    access_token = login_response.json()["access_token"]

    response = client.get(
        "/api/provider/dashboard/arrivals",
        headers={"Authorization": f"Bearer {access_token}"},
    )

    assert response.status_code == 403


def test_provider_dashboard_arrivals_returns_upcoming_feed_in_chronological_order():
    provider_payload = {
        "full_name": "Arrival Provider",
        "email": "arrival-provider@ucd.ie",
        "password": "password123",
        "role": "provider",
    }
    register_response = client.post("/api/auth/register", json=provider_payload)
    assert register_response.status_code == 200

    login_response = client.post(
        "/api/auth/login",
        json={
            "email": provider_payload["email"],
            "password": provider_payload["password"],
        },
    )
    headers = {"Authorization": f"Bearer {login_response.json()['access_token']}"}

    soon_start = (datetime.now(timezone.utc) + timedelta(days=1)).replace(microsecond=0)
    soon_end = soon_start + timedelta(hours=1)
    later_start = (datetime.now(timezone.utc) + timedelta(days=2)).replace(
        microsecond=0
    )
    later_end = later_start + timedelta(hours=1)
    past_start = (datetime.now(timezone.utc) - timedelta(days=1)).replace(microsecond=0)
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
                    payment_status="paid",
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
                    payment_status="paid",
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
                    payment_status="refund_pending",
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
                    payment_status="paid",
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
                    payment_status="paid",
                ),
            ]
        )
        db.commit()
    finally:
        db.close()

    response = client.get("/api/provider/dashboard/arrivals", headers=headers)

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
        "/api/provider/dashboard/arrivals?limit=1", headers=headers
    )
    assert limited_response.status_code == 200
    assert len(limited_response.json()["items"]) == 1
    assert limited_response.json()["items"][0]["booking_id"] == 31


def test_deactivate_slot_requires_authentication():
    response = client.delete("/api/venues/osm_296568074/slots/1")
    assert response.status_code == 401


def test_deactivate_slot_rejects_standard_user():
    login_response = client.post(
        "/api/auth/login", json={"email": "test2@example.com", "password": "00000000"}
    )
    access_token = login_response.json()["access_token"]

    response = client.delete(
        "/api/venues/osm_296568074/slots/1",
        headers={"Authorization": f"Bearer {access_token}"},
    )

    assert response.status_code == 403


def test_deactivate_slot_returns_404_for_missing_slot():
    provider_payload = {
        "full_name": "Slot Provider",
        "email": "slot-provider-404@ucd.ie",
        "password": "password123",
        "role": "provider",
    }
    client.post("/api/auth/register", json=provider_payload)
    login_response = client.post(
        "/api/auth/login",
        json={
            "email": provider_payload["email"],
            "password": provider_payload["password"],
        },
    )
    headers = {"Authorization": f"Bearer {login_response.json()['access_token']}"}

    response = client.delete("/api/venues/osm_296568074/slots/999", headers=headers)

    assert response.status_code == 404


def test_deactivate_slot_blocks_when_active_booking_overlaps():
    provider_payload = {
        "full_name": "Slot Provider",
        "email": "slot-provider-conflict@ucd.ie",
        "password": "password123",
        "role": "provider",
    }
    client.post("/api/auth/register", json=provider_payload)
    login_response = client.post(
        "/api/auth/login",
        json={
            "email": provider_payload["email"],
            "password": provider_payload["password"],
        },
    )
    headers = {"Authorization": f"Bearer {login_response.json()['access_token']}"}
    slot_date = datetime.now(timezone.utc).date() + timedelta(days=3)

    db = TestingSessionLocal()
    try:
        slot = AvailabilitySlot(
            id=40,
            venue_id="osm_296568074",
            date=slot_date,
            start_time=time(9, 0),
            end_time=time(12, 0),
            available=True,
            available_seats=5,
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
            payment_status="paid",
        )
        db.add_all([slot, booking])
        db.commit()
    finally:
        db.close()

    response = client.delete("/api/venues/osm_296568074/slots/40", headers=headers)

    assert response.status_code == 409
    assert response.json()["detail"] == ("An active booking exists during this time.")

    db = TestingSessionLocal()
    try:
        unchanged_slot = (
            db.query(AvailabilitySlot).filter(AvailabilitySlot.id == 40).one()
        )
        assert unchanged_slot.available is True
        assert unchanged_slot.available_seats == 5
    finally:
        db.close()


def test_deactivate_slot_allows_when_only_inactive_bookings_overlap():
    provider_payload = {
        "full_name": "Slot Provider",
        "email": "slot-provider-success@ucd.ie",
        "password": "password123",
        "role": "provider",
    }
    client.post("/api/auth/register", json=provider_payload)
    login_response = client.post(
        "/api/auth/login",
        json={
            "email": provider_payload["email"],
            "password": provider_payload["password"],
        },
    )
    headers = {"Authorization": f"Bearer {login_response.json()['access_token']}"}
    slot_date = datetime.now(timezone.utc).date() + timedelta(days=4)

    db = TestingSessionLocal()
    try:
        slot = AvailabilitySlot(
            id=41,
            venue_id="osm_296568075",
            date=slot_date,
            start_time=time(9, 0),
            end_time=time(12, 0),
            available=True,
            available_seats=4,
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
            payment_status="refund_pending",
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
            payment_status="paid",
        )
        db.add_all([slot, cancelled_booking, completed_booking])
        db.commit()
    finally:
        db.close()

    response = client.delete("/api/venues/osm_296568075/slots/41", headers=headers)

    assert response.status_code == 200
    assert response.json() == {
        "slot_id": 41,
        "venue_id": "osm_296568075",
        "available": False,
        "available_seats": 0,
        "message": "Slot deactivated successfully",
    }

    db = TestingSessionLocal()
    try:
        deactivated_slot = (
            db.query(AvailabilitySlot).filter(AvailabilitySlot.id == 41).one()
        )
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
            "role": "admin",
        },
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


def test_get_venue_by_id_uses_aligned_detail_contract():
    list_response = client.get("/api/venues?borough=Dublin South")
    assert list_response.status_code == 200
    list_item = next(
        item
        for item in list_response.json()["items"]
        if item["venue_id"] == "osm_296568074"
    )

    detail_response = client.get("/api/venues/osm_296568074")
    assert detail_response.status_code == 200
    detail = detail_response.json()

    assert detail["suitability_score"] == list_item["suitability_score"]
    assert isinstance(detail["suitability_score"], float)
    assert detail["seat_capacity"] == 1
    assert isinstance(detail["seat_capacity"], int)
    assert detail["amenity_tags"] == []
    assert isinstance(detail["rules_text"], str)
    assert "noise_level" not in detail
    assert "noise_score" not in detail

    for field in (
        "accessibility_friendly",
        "calls_allowed",
        "wbe_certified",
        "mbe_certified",
        "vbe_certified",
        "bcorp_certified",
        "lgbt_friendly",
    ):
        assert field in list_item
        assert field in detail
        assert isinstance(list_item[field], bool)
        assert isinstance(detail[field], bool)


def test_get_venue_by_id_includes_busyness_fields(monkeypatch):
    def fake_get_busyness_predictions(
        venue_ids,
        hour=None,
        day_type=None,
        prediction_date=None,
        selected_date=None,
        selected_time=None,
    ):
        return {"osm_296568074": {"busyness_score": 32, "busyness_label": "Low"}}

    monkeypatch.setattr(
        main_module, "get_busyness_predictions", fake_get_busyness_predictions
    )

    response = client.get("/api/venues/osm_296568074")

    assert response.status_code == 200
    assert response.json()["busyness_score"] == 32
    assert response.json()["busyness_label"] == "Low"


def test_get_venue_by_id_busyness_uses_selected_date_time(monkeypatch):
    def fake_get_busyness_predictions(
        venue_ids,
        hour=None,
        day_type=None,
        prediction_date=None,
        selected_date=None,
        selected_time=None,
    ):
        assert venue_ids == ["osm_296568074"]
        assert selected_date == date(2026, 7, 24)
        assert selected_time == time(14, 30)

        return {
            "osm_296568074": {
                "busyness_score": 72,
                "busyness_label": "High",
                "busyness_predicted_for": "2026-07-24T14:00:00",
            }
        }

    monkeypatch.setattr(
        main_module, "get_busyness_predictions", fake_get_busyness_predictions
    )

    response = client.get(
        "/api/venues/osm_296568074?date=2026-07-24&start_time=14:30:00"
    )

    assert response.status_code == 200
    data = response.json()
    assert data["busyness_score"] == 72
    assert data["busyness_label"] == "High"
    assert data["busyness_predicted_for"] == "2026-07-24T14:00:00"


def test_get_venue_by_id_suitability_matches_list_for_selected_busyness(monkeypatch):
    def fake_get_busyness_predictions(
        venue_ids,
        hour=None,
        day_type=None,
        prediction_date=None,
        selected_date=None,
        selected_time=None,
    ):
        return {
            venue_id: {
                "busyness_score": 72,
                "busyness_label": "High",
                "busyness_predicted_for": "2026-07-24T14:00:00",
            }
            for venue_id in venue_ids
        }

    monkeypatch.setattr(
        main_module, "get_busyness_predictions", fake_get_busyness_predictions
    )

    list_response = client.get(
        "/api/venues?borough=Dublin South&date=2026-07-24&start_time=14:30:00"
    )
    detail_response = client.get(
        "/api/venues/osm_296568074?date=2026-07-24&start_time=14:30:00"
    )

    assert list_response.status_code == 200
    assert detail_response.status_code == 200

    list_item = next(
        item
        for item in list_response.json()["items"]
        if item["venue_id"] == "osm_296568074"
    )
    detail = detail_response.json()

    assert detail["suitability_score"] == list_item["suitability_score"]
    assert detail["busyness_predicted_for"] == list_item["busyness_predicted_for"]


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
            "available_seats": 5,
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
            available_seats=3,
        )
        full_slot = AvailabilitySlot(
            id=21,
            venue_id="osm_296568074",
            date=date(2026, 6, 16),
            start_time=time(10, 0, 0),
            end_time=time(11, 0, 0),
            available=True,
            available_seats=0,
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
        "available_seats": 3,
    }
    assert slots[2] == {
        "slot_id": 21,
        "date": "2026-06-16",
        "start_time": "2026-06-16T10:00:00",
        "end_time": "2026-06-16T11:00:00",
        "available": False,
        "available_seats": 0,
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
                payment_status="paid",
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
                payment_status="paid",
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
                payment_status="paid",
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
                payment_status="paid",
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
                payment_status="paid",
            ),
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
                verified=True,
            ),
            PostBookingReview(
                id=51,
                booking_id=51,
                user_id=1,
                venue_id="osm_296568074",
                wifi_score=4,
                plug_score=5,
                quietness_score=3,
                verified=True,
            ),
            PostBookingReview(
                id=52,
                booking_id=52,
                user_id=1,
                venue_id="osm_296568074",
                wifi_score=5,
                plug_score=None,
                quietness_score=4,
                verified=True,
            ),
            PostBookingReview(
                id=53,
                booking_id=53,
                user_id=1,
                venue_id="osm_296568074",
                wifi_score=1,
                plug_score=1,
                quietness_score=1,
                verified=False,
            ),
            PostBookingReview(
                id=54,
                booking_id=54,
                user_id=1,
                venue_id="osm_296568074",
                wifi_score=1,
                plug_score=1,
                quietness_score=1,
                verified=True,
            ),
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
        "quietness_score": 3.0,
    }


def test_venue_survey_metrics_returns_404_for_missing_venue():
    response = client.get("/api/venues/ghost_venue_id/survey-metrics")
    assert response.status_code == 404


def test_create_review_requires_authentication():
    response = client.post(
        "/api/reviews",
        json={"booking_id": 1, "wifi_score": 4, "plug_score": 4, "quietness_score": 4},
    )

    assert response.status_code == 401


def test_create_review_updates_venue_rating_and_api_payloads():
    login_response = client.post(
        "/api/auth/login", json={"email": "test2@example.com", "password": "00000000"}
    )
    headers = {"Authorization": f"Bearer {login_response.json()['access_token']}"}

    db = TestingSessionLocal()
    try:
        db.query(PostBookingReview).delete()
        db.query(Booking).delete()

        venue = db.query(Venue).filter(Venue.venue_id == "osm_296568074").one()
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
            payment_status="paid",
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
            payment_status="paid",
        )
        previous_review = PostBookingReview(
            id=71,
            booking_id=71,
            user_id=1,
            venue_id="osm_296568074",
            wifi_score=3,
            plug_score=3,
            quietness_score=3,
            verified=True,
        )

        db.add_all([completed_booking, previous_booking, previous_review])
        db.commit()
    finally:
        db.close()

    response = client.post(
        "/api/reviews",
        headers=headers,
        json={"booking_id": 70, "wifi_score": 5, "plug_score": 4, "quietness_score": 3},
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
        item for item in venue_list_items if item["venue_id"] == "osm_296568074"
    )
    assert updated_venue["rating"] == 3.5

    venue_detail_response = client.get("/api/venues/osm_296568074")
    assert venue_detail_response.status_code == 200
    assert venue_detail_response.json()["rating"] == 3.5


def test_create_review_rejects_non_owner_booking():
    login_response = client.post(
        "/api/auth/login", json={"email": "test2@example.com", "password": "00000000"}
    )
    headers = {"Authorization": f"Bearer {login_response.json()['access_token']}"}

    db = TestingSessionLocal()
    try:
        other_user = User(
            id=2,
            full_name="Other Reviewer",
            email="other-reviewer@example.com",
            password_hash=hash_password("00000000"),
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
            payment_status="paid",
        )
        db.add_all([other_user, other_booking])
        db.commit()
    finally:
        db.close()

    response = client.post(
        "/api/reviews",
        headers=headers,
        json={"booking_id": 72, "wifi_score": 5, "plug_score": 5, "quietness_score": 5},
    )

    assert response.status_code == 404


def test_create_review_rejects_incomplete_and_duplicate_reviews():
    login_response = client.post(
        "/api/auth/login", json={"email": "test2@example.com", "password": "00000000"}
    )
    headers = {"Authorization": f"Bearer {login_response.json()['access_token']}"}

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
            payment_status="paid",
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
            payment_status="paid",
        )
        existing_review = PostBookingReview(
            id=74,
            booking_id=74,
            user_id=1,
            venue_id="osm_296568074",
            wifi_score=4,
            plug_score=4,
            quietness_score=4,
            verified=True,
        )
        db.add_all([incomplete_booking, completed_booking, existing_review])
        db.commit()
    finally:
        db.close()

    incomplete_response = client.post(
        "/api/reviews",
        headers=headers,
        json={"booking_id": 73, "wifi_score": 5, "plug_score": 5, "quietness_score": 5},
    )
    assert incomplete_response.status_code == 409
    assert incomplete_response.json()["detail"] == (
        "Only completed bookings can be reviewed"
    )

    duplicate_response = client.post(
        "/api/reviews",
        headers=headers,
        json={"booking_id": 74, "wifi_score": 5, "plug_score": 5, "quietness_score": 5},
    )
    assert duplicate_response.status_code == 409
    assert duplicate_response.json()["detail"] == (
        "Review already exists for this booking"
    )


# Deep integration test for seat optimization limits and overbooking blockades
def test_booking_edge_cases():
    # Attempting to book 10 seats when the capacity limit is 5
    bad_payload = {
        "venue_id": "osm_296568074",
        "booking_date": "2026-06-15",
        "start_time": "09:00:00",
        "end_time": "10:00:00",
        "seats_reserved": 10,
    }
    res_bad = client.post(
        "/api/bookings", json=bad_payload, headers=get_test_user_headers()
    )
    assert res_bad.status_code == 409
    assert res_bad.json()["detail"] == "Venue capacity exceeded for the requested time"


def test_booking_capacity_allows_overlap_until_seat_limit():
    first_payload = {
        "venue_id": "osm_296568074",
        "booking_date": "2026-06-15",
        "start_time": "10:00:00",
        "end_time": "11:00:00",
        "seats_reserved": 2,
    }
    headers = get_test_user_headers()
    first_response = client.post("/api/bookings", json=first_payload, headers=headers)
    assert first_response.status_code == 200

    second_payload = {**first_payload, "seats_reserved": 2}
    second_response = client.post("/api/bookings", json=second_payload, headers=headers)
    assert second_response.status_code == 409
    assert second_response.json()["detail"] == (
        "Venue capacity exceeded for the requested time"
    )

    db = TestingSessionLocal()
    try:
        slot = db.query(AvailabilitySlot).filter(AvailabilitySlot.id == 1).one()
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
            "seats_reserved": 0,
        },
        headers=get_test_user_headers(),
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
        "/api/auth/login", json={"email": "test2@example.com", "password": "00000000"}
    )
    headers = {"Authorization": f"Bearer {login_response.json()['access_token']}"}

    response = client.post("/api/favorites/osm_296568074", headers=headers)
    assert response.status_code == 201
    assert response.json() == {
        "user_id": 1,
        "venue_id": "osm_296568074",
        "message": "Favorite created successfully",
    }

    db = TestingSessionLocal()
    try:
        favorite = (
            db.query(Favorite)
            .filter(Favorite.user_id == 1, Favorite.venue_id == "osm_296568074")
            .first()
        )
        assert favorite is not None
    finally:
        db.close()


def test_create_favorite_returns_404_for_missing_venue():
    login_response = client.post(
        "/api/auth/login", json={"email": "test2@example.com", "password": "00000000"}
    )
    headers = {"Authorization": f"Bearer {login_response.json()['access_token']}"}

    response = client.post("/api/favorites/missing-venue", headers=headers)
    assert response.status_code == 404
    assert response.json()["detail"] == "Venue not found"


def test_create_favorite_returns_409_for_duplicate_favorite():
    login_response = client.post(
        "/api/auth/login", json={"email": "test2@example.com", "password": "00000000"}
    )
    headers = {"Authorization": f"Bearer {login_response.json()['access_token']}"}

    db = TestingSessionLocal()
    try:
        favorite = Favorite(id=1, user_id=1, venue_id="osm_296568074")
        db.add(favorite)
        db.commit()
    finally:
        db.close()

    response = client.post("/api/favorites/osm_296568074", headers=headers)
    assert response.status_code == 409
    assert response.json()["detail"] == "Favorite already exists"


def test_get_my_favorites_requires_authentication():
    response = client.get("/api/favorites/me")
    assert response.status_code == 401


def test_get_my_favorites_returns_only_current_user_favorites():
    login_response = client.post(
        "/api/auth/login", json={"email": "test2@example.com", "password": "00000000"}
    )
    headers = {"Authorization": f"Bearer {login_response.json()['access_token']}"}

    db = TestingSessionLocal()
    try:
        other_user = User(
            id=2,
            full_name="Other User",
            email="other-fav@example.com",
            password_hash=hash_password("00000000"),
        )
        db.add(other_user)
        db.add_all(
            [
                Favorite(id=1, user_id=1, venue_id="osm_296568074"),
                Favorite(id=2, user_id=1, venue_id="osm_296568075"),
                Favorite(id=3, user_id=2, venue_id="osm_296568076"),
            ]
        )
        db.commit()
    finally:
        db.close()

    response = client.get("/api/favorites/me", headers=headers)
    assert response.status_code == 200
    assert response.json() == {
        "venue_ids": ["osm_296568074", "osm_296568075"],
    }


def test_delete_favorite_requires_authentication():
    response = client.delete("/api/favorites/osm_296568074")
    assert response.status_code == 401


def test_delete_favorite_removes_current_user_favorite():
    login_response = client.post(
        "/api/auth/login", json={"email": "test2@example.com", "password": "00000000"}
    )
    headers = {"Authorization": f"Bearer {login_response.json()['access_token']}"}

    db = TestingSessionLocal()
    try:
        favorite = Favorite(id=1, user_id=1, venue_id="osm_296568074")
        db.add(favorite)
        db.commit()
    finally:
        db.close()

    response = client.delete("/api/favorites/osm_296568074", headers=headers)
    assert response.status_code == 200
    assert response.json()["message"] == "Favorite removed successfully"

    db = TestingSessionLocal()
    try:
        deleted_favorite = (
            db.query(Favorite)
            .filter(Favorite.user_id == 1, Favorite.venue_id == "osm_296568074")
            .first()
        )
        assert deleted_favorite is None
    finally:
        db.close()


def test_delete_favorite_returns_404_for_missing_or_other_user_favorite():
    login_response = client.post(
        "/api/auth/login", json={"email": "test2@example.com", "password": "00000000"}
    )
    headers = {"Authorization": f"Bearer {login_response.json()['access_token']}"}

    db = TestingSessionLocal()
    try:
        other_user = User(
            id=2,
            full_name="Other User",
            email="other-fav@example.com",
            password_hash=hash_password("00000000"),
        )
        other_favorite = Favorite(id=2, user_id=2, venue_id="osm_296568075")
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
        protected_favorite = (
            db.query(Favorite)
            .filter(Favorite.user_id == 2, Favorite.venue_id == "osm_296568075")
            .first()
        )
        assert protected_favorite is not None
    finally:
        db.close()


def test_get_user_bookings_groups_sorts_and_isolates_users():
    login_response = client.post(
        "/api/auth/login", json={"email": "test2@example.com", "password": "00000000"}
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
            password_hash=hash_password("00000000"),
        )
        db.add(other_user)

        today = datetime.now(timezone.utc).date()
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
                payment_status="paid",
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
                payment_status="paid",
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
                payment_status="paid",
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
                payment_status="paid",
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
                payment_status="refunded",
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
                payment_status="paid",
            ),
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
        "/api/auth/login", json={"email": "test2@example.com", "password": "00000000"}
    )
    headers = {"Authorization": f"Bearer {login_response.json()['access_token']}"}
    booking_start = (datetime.now(timezone.utc) + timedelta(days=2)).replace(
        microsecond=0
    )
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
            available_seats=5,
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
            payment_status="paid",
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
        "message": "Booking cancelled successfully",
    }

    db = TestingSessionLocal()
    try:
        restored_slot = (
            db.query(AvailabilitySlot).filter(AvailabilitySlot.id == 10).one()
        )
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
            "seats_reserved": 2,
        },
        headers=headers,
    )
    assert rebooking_response.status_code == 200


def test_cancel_booking_enforces_owner_and_deadline():
    login_response = client.post(
        "/api/auth/login", json={"email": "test2@example.com", "password": "00000000"}
    )
    headers = {"Authorization": f"Bearer {login_response.json()['access_token']}"}
    booking_start = (get_current_local_naive_datetime() + timedelta(hours=23)).replace(
        microsecond=0
    )
    booking_end = booking_start + timedelta(hours=1)

    db = TestingSessionLocal()
    try:
        other_user = User(
            id=2,
            full_name="Other User",
            email="other@example.com",
            password_hash=hash_password("00000000"),
        )
        slot = AvailabilitySlot(
            id=11,
            venue_id="osm_296568075",
            date=booking_start.date(),
            start_time=booking_start.time(),
            end_time=booking_end.time(),
            available=True,
            available_seats=1,
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
            payment_status="paid",
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
            payment_status="paid",
        )
        db.add_all([other_user, slot, own_booking, other_booking])
        db.commit()
    finally:
        db.close()

    deadline_response = client.patch("/api/bookings/11/cancel", headers=headers)
    assert deadline_response.status_code == 409

    ownership_response = client.patch("/api/bookings/12/cancel", headers=headers)
    assert ownership_response.status_code == 404


@pytest.mark.parametrize(("remember_me", "expected_days"), [(False, 7), (True, 30)])
def test_login_creates_hashed_refresh_session(remember_me, expected_days):
    response = client.post(
        "/api/auth/login",
        json={
            "email": "test2@example.com",
            "password": "00000000",
            "remember_me": remember_me,
        },
    )
    assert response.status_code == 200

    refresh_token = response.json()["refresh_token"]
    db = TestingSessionLocal()
    try:
        session = (
            db.query(RefreshSession)
            .filter(RefreshSession.token_hash == hash_refresh_token(refresh_token))
            .one()
        )
        lifetime = session.expires_at - session.created_at
        assert session.token_hash != refresh_token
        assert len(session.token_hash) == 64
        assert lifetime == timedelta(days=expected_days)
    finally:
        db.close()


def test_refresh_token_rotation_and_reuse_detection():
    login_response = client.post(
        "/api/auth/login", json={"email": "test2@example.com", "password": "00000000"}
    )
    first_token = login_response.json()["refresh_token"]

    refresh_response = client.post(
        "/api/auth/refresh", json={"refresh_token": first_token}
    )
    assert refresh_response.status_code == 200
    assert (
        verify_access_token(refresh_response.json()["access_token"])["role"] == "user"
    )
    second_token = refresh_response.json()["refresh_token"]
    assert second_token != first_token

    db = TestingSessionLocal()
    try:
        first_session = (
            db.query(RefreshSession)
            .filter(RefreshSession.token_hash == hash_refresh_token(first_token))
            .one()
        )
        second_session = (
            db.query(RefreshSession)
            .filter(RefreshSession.token_hash == hash_refresh_token(second_token))
            .one()
        )
        assert first_session.revoked_at is not None
        assert first_session.replaced_by_token_hash == second_session.token_hash
        assert first_session.family_id == second_session.family_id
        assert first_session.expires_at == second_session.expires_at
    finally:
        db.close()

    reuse_response = client.post(
        "/api/auth/refresh", json={"refresh_token": first_token}
    )
    assert reuse_response.status_code == 401
    assert reuse_response.json()["detail"] == "Refresh token reuse detected"

    family_response = client.post(
        "/api/auth/refresh", json={"refresh_token": second_token}
    )
    assert family_response.status_code == 401


def test_logout_revokes_refresh_token_family():
    login_response = client.post(
        "/api/auth/login", json={"email": "test2@example.com", "password": "00000000"}
    )
    refresh_token = login_response.json()["refresh_token"]

    logout_response = client.post(
        "/api/auth/logout", json={"refresh_token": refresh_token}
    )
    assert logout_response.status_code == 200

    refresh_response = client.post(
        "/api/auth/refresh", json={"refresh_token": refresh_token}
    )
    assert refresh_response.status_code == 401


def test_expired_refresh_token_is_rejected():
    login_response = client.post(
        "/api/auth/login", json={"email": "test2@example.com", "password": "00000000"}
    )
    refresh_token = login_response.json()["refresh_token"]

    db = TestingSessionLocal()
    try:
        session = (
            db.query(RefreshSession)
            .filter(RefreshSession.token_hash == hash_refresh_token(refresh_token))
            .one()
        )
        session.expires_at = (
            datetime.now(timezone.utc) - timedelta(seconds=1)
        ).replace(tzinfo=None)
        db.commit()
    finally:
        db.close()

    response = client.post("/api/auth/refresh", json={"refresh_token": refresh_token})
    assert response.status_code == 401
    assert response.json()["detail"] == "Refresh token has expired"
