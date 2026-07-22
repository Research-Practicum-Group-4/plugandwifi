from fastapi import (
    FastAPI ,
    Depends,
    HTTPException,
    Query
)
from .database import (
    engine, 
    Base , 
    get_db
)
from .models import (
    User,
    Venue,
    AvailabilitySlot,
    Booking,
    RefreshSession,
    Favorite,
    PostBookingReview
)
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from .schemas import (
    UserRegister,
    UserLogin,
    ChatbotRecommendRequest,
    ChatbotRecommendResponse,
    ChatbotSearchParameters,
    VenueListResponse,
    VenueSuggestionsResponse,
    VenueCreate,
    VenueCreateResponse,
    VenueDetailResponse,
    VenueAvailabilityResponse,
    BookingCreate,
    BookingResponse,
    ReviewCreate,
    ReviewResponse,
    UserBookingsResponse,
    BookingCancellationResponse,
    FavoriteResponse,
    SlotDeactivationResponse,
    RefreshTokenRequest,
    LogoutRequest,
    ProviderDashboardKPIsResponse,
    ProviderArrivalsResponse,
    VenueSurveyMetricsResponse,
    AdminDashboardOverviewResponse,
    VenueSuspensionRequest,
    VenueSuspensionResponse
)
from .auth import (
    hash_password, 
    verify_password,
    create_access_token
)
from .rbac import get_current_user, require_roles
from .refresh_tokens import (
    hash_refresh_token,
    issue_refresh_session
)
from datetime import date, datetime, time, timedelta
from math import asin, cos, radians, sin, sqrt

from fastapi.middleware.cors import CORSMiddleware

import httpx
import json
import os
import re
import sys
import uuid
from pathlib import Path


def get_free_cancellation_hours():
    raw_value = os.getenv("FREE_CANCELLATION_HOURS", "24")

    try:
        hours = int(raw_value)
    except ValueError as exc:
        raise RuntimeError(
            "FREE_CANCELLATION_HOURS must be an integer."
        ) from exc

    if hours < 0:
        raise RuntimeError(
            "FREE_CANCELLATION_HOURS must be at least 0."
        )

    return hours


FREE_CANCELLATION_HOURS = get_free_cancellation_hours()

Base.metadata.create_all(bind=engine)

app = FastAPI()


GEMINI_SYSTEM_INSTRUCTION = (
    "You are the Plug & Wifi workspace discovery assistant. "
    "Help users find suitable venues for working or studying. "
    "Focus on workspace needs such as location, Wi-Fi, plug access, "
    "noise level, price, availability, group size, and study or work style. "
    "Do not act as a general-purpose assistant. If the user asks for an "
    "unrelated topic, briefly redirect them back to venue discovery."
)


def get_gemini_model():
    return os.getenv(
        "GEMINI_MODEL",
        "gemini-2.0-flash"
    )


def get_busyness_model_path():
    return os.getenv(
        "BUSYNESS_MODEL_PATH",
        "data-ml/models/busyness_predictor.joblib"
    )


def get_busyness_venues_csv_path():
    return os.getenv(
        "BUSYNESS_VENUES_CSV",
        "data/processed/nyc_venues.csv"
    )


def get_default_day_type():
    if date.today().weekday() >= 5:
        return "weekend"

    return "weekday"


SUITABILITY_WEIGHTS = {
    "wifi": 0.35,
    "plug": 0.30,
    "hourly_profile": 0.25,
    "rating": 0.10,
    "bus": 0.10,
    "train": 0.20
}


def clamp_normalized_score(value):
    if value is None:
        return 0.0

    try:
        numeric_value = float(value)
    except (TypeError, ValueError):
        return 0.0

    return max(
        0.0,
        min(
            1.0,
            numeric_value
        )
    )


def get_hourly_profile_suitability_score(
    venue: Venue,
    hour: int | None = None
):
    selected_hour = str(
        hour if hour is not None else datetime.now().hour
    )

    if venue.hourly_profile:
        try:
            profile = json.loads(
                venue.hourly_profile
            )
            hourly_score = (
                profile
                .get(selected_hour, {})
                .get("score")
            )

            if hourly_score is not None:
                return 1 - clamp_normalized_score(
                    hourly_score
                )
        except (TypeError, ValueError, json.JSONDecodeError):
            pass

    return 0.0


def calculate_suitability_score(
    venue: Venue,
    hour: int | None = None
):
    components = {
        "wifi": clamp_normalized_score(venue.wifi_norm),
        "plug": clamp_normalized_score(venue.plug_norm),
        "hourly_profile": get_hourly_profile_suitability_score(
            venue,
            hour
        ),
        "rating": clamp_normalized_score(venue.rating_norm),
        "bus": clamp_normalized_score(venue.bus_norm),
        "train": clamp_normalized_score(venue.train_norm)
    }
    total_weight = sum(
        SUITABILITY_WEIGHTS.values()
    )

    if total_weight == 0:
        return None

    score = sum(
        components[name] * weight / total_weight
        for name, weight in SUITABILITY_WEIGHTS.items()
    )

    return round(
        score * 100,
        2
    )


def get_busyness_predictions(
    venue_ids: list[str],
    hour: int | None = None,
    day_type: str | None = None
):
    if not venue_ids:
        return {}

    model_path = Path(get_busyness_model_path())
    venues_csv_path = Path(get_busyness_venues_csv_path())
    data_ml_src_path = Path("data-ml/src")

    if (
        not model_path.exists()
        or not venues_csv_path.exists()
        or not data_ml_src_path.exists()
    ):
        return {}

    if str(data_ml_src_path) not in sys.path:
        sys.path.append(str(data_ml_src_path))

    try:
        import pandas as pd
        from busyness_predictor import load_busyness_predictor

        predictor = load_busyness_predictor(
            str(model_path)
        )
        venues = pd.read_csv(
            venues_csv_path
        )
        selected_venues = venues[
            venues["venue_id"].isin(venue_ids)
        ]

        if selected_venues.empty:
            return {}

        prediction_results = predictor.predict_many(
            selected_venues,
            hour=hour if hour is not None else datetime.now().hour,
            day_type=day_type or get_default_day_type()
        )
    except Exception:
        return {}

    return {
        result["venue_id"]: {
            "busyness_score": result.get("busyness_score"),
            "busyness_label": result.get("busyness_label")
        }
        for result in prediction_results
    }


def build_venue_response(
    venue: Venue,
    distance_km=None,
    busyness=None,
    suitability_score=None
):
    busyness = busyness or {}

    return {
        "venue_id": venue.venue_id,
        "name": venue.name,
        "state": venue.state,
        "lat": venue.lat,
        "lon": venue.lon,
        "borough": venue.borough,
        "cuisine_type": venue.cuisine_type,
        "has_wifi": venue.has_wifi,
        "accessibility_friendly": bool(venue.accessibility_friendly),
        "calls_allowed": bool(venue.calls_allowed),
        "wbe_certified": bool(venue.wbe_certified),
        "mbe_certified": bool(venue.mbe_certified),
        "vbe_certified": bool(venue.vbe_certified),
        "bcorp_certified": bool(venue.bcorp_certified),
        "lgbt_friendly": bool(venue.lgbt_friendly),
        "rating": venue.rating,
        "plug_access": venue.plug_access,
        "hourly_price": venue.hourly_price,
        "availability_window": None,
        "opening_hours_summary": venue.opening_hours,
        "distance_km": distance_km,
        "busyness_score": busyness.get("busyness_score"),
        "busyness_label": busyness.get("busyness_label"),
        "suitability_score": (
            suitability_score
            if suitability_score is not None
            else calculate_suitability_score(venue)
        )
    }


def build_venue_detail_response(
    venue: Venue,
    busyness=None
):
    busyness = busyness or {}

    return {
        "venue_id": venue.venue_id,
        "name": venue.name,
        "state": venue.state,
        "osm_type": venue.osm_type,
        "cuisine_type": venue.cuisine_type,
        "cuisine_detail": venue.cuisine_detail,
        "phone": venue.phone,
        "website": venue.website,
        "building_number": venue.building_number,
        "street": venue.street,
        "zipcode": venue.zipcode,
        "lat": venue.lat,
        "lon": venue.lon,
        "opening_hours": venue.opening_hours,
        "has_wifi": venue.has_wifi,
        "accessibility_friendly": bool(venue.accessibility_friendly),
        "calls_allowed": bool(venue.calls_allowed),
        "wbe_certified": bool(venue.wbe_certified),
        "mbe_certified": bool(venue.mbe_certified),
        "vbe_certified": bool(venue.vbe_certified),
        "bcorp_certified": bool(venue.bcorp_certified),
        "lgbt_friendly": bool(venue.lgbt_friendly),
        "best_hours_for_work": venue.best_hours_for_work,
        "hourly_profile": venue.hourly_profile,
        "partner": venue.partner,
        "borough": venue.borough,
        "inferred_wifi": venue.inferred_wifi,
        "wifi_user_reported": venue.wifi_user_reported,
        "nearest_subway": venue.nearest_subway,
        "nearest_subway_m": venue.nearest_subway_m,
        "nearest_bus": venue.nearest_bus,
        "nearest_bus_m": venue.nearest_bus_m,
        "plug_access": venue.plug_access,
        "plug_user_reported": venue.plug_user_reported,
        "rating": venue.rating,
        "rating_user_reported": venue.rating_user_reported,
        "hourly_price": venue.hourly_price,
        "actual_hourly_price": venue.actual_hourly_price,
        "busyness_score": busyness.get("busyness_score"),
        "busyness_label": busyness.get("busyness_label"),
        "suitability_score": calculate_suitability_score(venue),
        "seat_capacity": venue.seat_capacity or 1,
        "amenity_tags": deserialize_amenity_tags(
            venue.amenity_tags
        ),
        "rules_text": venue.rules_text or ""
    }


def extract_json_object(text_value: str):
    try:
        return json.loads(text_value)
    except json.JSONDecodeError:
        pass

    match = re.search(
        r"\{.*\}",
        text_value,
        re.DOTALL
    )

    if not match:
        return None

    try:
        return json.loads(
            match.group(0)
        )
    except json.JSONDecodeError:
        return None


def call_gemini_search_parameter_extraction(
    message: str
):
    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        return None

    model = get_gemini_model()
    url = (
        "https://generativelanguage.googleapis.com/"
        f"v1beta/models/{model}:generateContent"
    )
    prompt = (
        "Extract venue search parameters from the user message. "
        "Return only JSON with these keys: location, radius_km, "
        "venue_type, wifi, busyness, time. Use null when unknown. "
        "busyness must be one of low, moderate, high, or null. "
        f"User message: {message}"
    )

    try:
        response = httpx.post(
            url,
            params={
                "key": api_key
            },
            json={
                "contents": [
                    {
                        "role": "user",
                        "parts": [
                            {
                                "text": prompt
                            }
                        ]
                    }
                ],
                "generationConfig": {
                    "temperature": 0.1,
                    "maxOutputTokens": 256
                }
            },
            timeout=15
        )
        response.raise_for_status()
        data = response.json()
    except httpx.HTTPError:
        return None

    candidates = data.get("candidates") or []
    parts = (
        candidates[0]
        .get("content", {})
        .get("parts", [])
        if candidates else []
    )
    text_parts = [
        part.get("text", "")
        for part in parts
        if part.get("text")
    ]

    return extract_json_object(
        "\n".join(text_parts).strip()
    )


def normalize_busyness_preference(
    value
):
    if value is None:
        return None

    lowered_value = str(value).strip().lower()

    if lowered_value in {"low", "quiet", "not busy", "less busy"}:
        return "low"

    if lowered_value in {"moderate", "medium"}:
        return "moderate"

    if lowered_value in {"high", "busy", "crowded"}:
        return "high"

    return None


def infer_chatbot_search_parameters(
    message: str
):
    extracted = call_gemini_search_parameter_extraction(
        message
    ) or {}
    message_lower = message.lower()

    radius_match = re.search(
        r"(?:within|under|up to|inside)\s+(\d+(?:\.\d+)?)\s*(?:km|kilometer|kilometers)",
        message_lower
    )
    radius_km = extracted.get("radius_km")

    if radius_km is None and radius_match:
        radius_km = float(
            radius_match.group(1)
        )

    venue_type = extracted.get("venue_type")

    for candidate in ("cafe", "library", "restaurant", "workspace", "study"):
        if venue_type is None and candidate in message_lower:
            venue_type = candidate

    wifi = extracted.get("wifi")

    if wifi is None:
        if any(term in message_lower for term in ("wi-fi", "wifi", "wireless")):
            wifi = True
        elif "without wifi" in message_lower or "no wifi" in message_lower:
            wifi = False

    busyness = normalize_busyness_preference(
        extracted.get("busyness")
    )

    if busyness is None:
        if any(term in message_lower for term in ("not too busy", "less busy", "low busyness", "not crowded")):
            busyness = "low"
        elif "moderate" in message_lower:
            busyness = "moderate"
        elif "busy" in message_lower or "crowded" in message_lower:
            busyness = "high"

    requested_time = extracted.get("time")

    if requested_time is None and any(term in message_lower for term in ("now", "current", "currently")):
        requested_time = "now"

    location = extracted.get("location")

    if not location:
        location_match = re.search(
            r"(?:within\s+\d+(?:\.\d+)?\s*(?:km|kilometer|kilometers)\s+of|near|around|close to|in)\s+(.+?)(?:\s+that|\s+with|\s+and|\s+for|\s+where|\s+now|$)",
            message,
            re.IGNORECASE
        )

        if location_match:
            location = location_match.group(1).strip(" .,!?:;")

    return ChatbotSearchParameters(
        location=location,
        radius_km=radius_km,
        venue_type=venue_type,
        wifi=wifi,
        busyness=busyness,
        time=requested_time
    )


def has_chatbot_search_signal(
    search_parameters: ChatbotSearchParameters
):
    return any(
        value is not None
        for value in (
            search_parameters.location,
            search_parameters.radius_km,
            search_parameters.venue_type,
            search_parameters.wifi,
            search_parameters.busyness,
            search_parameters.time
        )
    )


def is_suitability_sort(sort: str | None):
    return sort in {
        "recommended",
        "suitability"
    }


def public_discovery_state_filter():
    return func.coalesce(
        Venue.state,
        "Active"
    ) == "Active"


def resolve_chatbot_location(
    location: str | None,
    db: Session
):
    if not location:
        return None

    search_term = location.strip().lower()

    if not search_term:
        return None

    return (
        db.query(Venue)
        .filter(
            public_discovery_state_filter()
        )
        .filter(
            (
                func.lower(Venue.name).like(f"%{search_term}%")
            )
            |
            (
                func.lower(Venue.borough).like(f"%{search_term}%")
            )
        )
        .order_by(Venue.venue_id)
        .first()
    )


def search_venues_for_chatbot(
    search_parameters: ChatbotSearchParameters,
    db: Session,
    limit: int = 5
):
    query = db.query(Venue).filter(
        public_discovery_state_filter()
    )

    if search_parameters.wifi is not None:
        query = query.filter(
            Venue.has_wifi == search_parameters.wifi
        )

    if search_parameters.venue_type:
        venue_type = search_parameters.venue_type.lower()
        query = query.filter(
            (
                func.lower(Venue.name).like(f"%{venue_type}%")
            )
            |
            (
                func.lower(Venue.cuisine_type).like(f"%{venue_type}%")
            )
            |
            (
                func.lower(Venue.cuisine_detail).like(f"%{venue_type}%")
            )
        )

    resolved_location = resolve_chatbot_location(
        search_parameters.location,
        db
    )

    if search_parameters.location and resolved_location is None:
        return [], False

    venues_with_distance = []
    venues = query.all()

    for venue in venues:
        distance_km = None

        if resolved_location is not None:
            if venue.lat is None or venue.lon is None:
                continue

            distance_km = calculate_distance_km(
                resolved_location.lat,
                resolved_location.lon,
                venue.lat,
                venue.lon
            )

            if (
                search_parameters.radius_km is not None
                and distance_km > search_parameters.radius_km
            ):
                continue

        venues_with_distance.append(
            (
                venue,
                distance_km
            )
        )

    if resolved_location is not None:
        venues_with_distance.sort(
            key=lambda venue_with_distance: venue_with_distance[1]
        )
    else:
        venues_with_distance.sort(
            key=lambda venue_with_distance: venue_with_distance[0].venue_id
        )

    candidate_venues = [
        venue
        for venue, _ in venues_with_distance
    ]
    busyness_predictions = get_busyness_predictions(
        [
            venue.venue_id
            for venue in candidate_venues
        ]
    )

    if search_parameters.busyness:
        venues_with_distance = [
            (
                venue,
                distance_km
            )
            for venue, distance_km in venues_with_distance
            if (
                busyness_predictions.get(
                    venue.venue_id,
                    {}
                ).get("busyness_label", "").lower()
                == search_parameters.busyness.lower()
            )
        ]

    selected_venues = venues_with_distance[:limit]

    return [
        build_venue_response(
            venue,
            distance_km,
            busyness_predictions.get(venue.venue_id)
        )
        for venue, distance_km in selected_venues
    ], True


def build_chatbot_venue_response(
    search_parameters: ChatbotSearchParameters,
    venues: list[dict],
    location_resolved: bool
):
    if not has_chatbot_search_signal(search_parameters):
        return (
            "Could you share the area, venue type, or workspace features you need?",
            "Could you share the area, venue type, or workspace features you need?"
        )

    if not location_resolved:
        return (
            "I could not identify that location from the current venue data. Could you try a nearby venue name or borough?",
            "Could you try a nearby venue name or borough?"
        )

    if not venues:
        return (
            "I could not find matching venues. Try increasing the radius or relaxing one of the filters.",
            None
        )

    venue_names = ", ".join(
        venue["name"]
        for venue in venues[:3]
    )

    return (
        f"I found {len(venues)} matching venue suggestion(s): {venue_names}.",
        None
    )


def call_gemini_chatbot(
    message: str
):
    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="Gemini API key is not configured"
        )

    model = get_gemini_model()
    url = (
        "https://generativelanguage.googleapis.com/"
        f"v1beta/models/{model}:generateContent"
    )
    payload = {
        "systemInstruction": {
            "parts": [
                {
                    "text": GEMINI_SYSTEM_INSTRUCTION
                }
            ]
        },
        "contents": [
            {
                "role": "user",
                "parts": [
                    {
                        "text": message
                    }
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.4,
            "maxOutputTokens": 512
        }
    }

    try:
        response = httpx.post(
            url,
            params={
                "key": api_key
            },
            json=payload,
            timeout=15
        )
        response.raise_for_status()
        data = response.json()
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=502,
            detail="Gemini API request failed"
        ) from exc

    candidates = data.get("candidates") or []
    parts = (
        candidates[0]
        .get("content", {})
        .get("parts", [])
        if candidates else []
    )
    text_parts = [
        part.get("text", "")
        for part in parts
        if part.get("text")
    ]
    chatbot_response = "\n".join(text_parts).strip()

    if not chatbot_response:
        raise HTTPException(
            status_code=502,
            detail="Gemini API returned an empty response"
        )

    return chatbot_response


def calculate_distance_km(
    origin_lat: float,
    origin_lon: float,
    venue_lat: float,
    venue_lon: float
):
    earth_radius_km = 6371.0

    lat_delta = radians(
        venue_lat - origin_lat
    )
    lon_delta = radians(
        venue_lon - origin_lon
    )

    origin_lat_rad = radians(
        origin_lat
    )
    venue_lat_rad = radians(
        venue_lat
    )

    haversine_value = (
        sin(
            lat_delta / 2
        ) ** 2
        + cos(
            origin_lat_rad
        )
        * cos(
            venue_lat_rad
        )
        * sin(
            lon_delta / 2
        ) ** 2
    )

    return 2 * earth_radius_km * asin(
        sqrt(
            haversine_value
        )
    )

def add_duration_to_time(
    start_time_value: time,
    duration_hours: float
):
    start_datetime = datetime.combine(
        date.today(),
        start_time_value
    )

    end_datetime = start_datetime + timedelta(
        hours=duration_hours
    )

    return end_datetime.time()


def get_booking_category(
    booking: Booking,
    current_datetime: datetime
):
    status = (booking.status or "").lower()

    if status in {"cancelled", "canceled"}:
        return "cancelled"

    booking_end = datetime.combine(
        booking.booking_date,
        booking.end_time
    )

    if status == "completed" or booking_end < current_datetime:
        return "completed"

    return "upcoming"


def serialize_amenity_tags(tags: list[str]):
    return ",".join(
        tag.strip()
        for tag in tags
        if tag.strip()
    )


def deserialize_amenity_tags(tags: str | None):
    if not tags:
        return []

    return [
        tag.strip()
        for tag in tags.split(",")
        if tag.strip()
    ]


def serialize_created_venue(venue: Venue):
    return {
        "venue_id": venue.venue_id,
        "name": venue.name,
        "state": venue.state,
        "lat": venue.lat,
        "lon": venue.lon,
        "borough": venue.borough,
        "opening_hours": venue.opening_hours,
        "seat_capacity": venue.seat_capacity,
        "amenity_tags": deserialize_amenity_tags(
            venue.amenity_tags
        ),
        "rules_text": venue.rules_text,
        "has_wifi": venue.has_wifi,
        "plug_access": venue.plug_access,
        "hourly_price": venue.hourly_price
    }


def booking_datetime(booking: Booking):
    return datetime.combine(
        booking.booking_date,
        booking.start_time
    )


def serialize_user_booking(booking: Booking, venue: Venue | None, status: str):
    return {
        "booking_id": booking.id,
        "venue_id": booking.venue_id,
        "venue_name": venue.name if venue else None,
        "booking_date": booking.booking_date,
        "start_time": booking.start_time,
        "end_time": booking.end_time,
        "seats_reserved": booking.seats_reserved,
        "status": status,
        "order_id": booking.order_id,
        "payment_status": booking.payment_status,
        "lat": venue.lat if venue else None,
        "lon": venue.lon if venue else None
    }


def calculate_percentage_delta(
    current_value: int | float,
    previous_value: int | float
):
    if previous_value == 0:
        return None

    return round(
        ((current_value - previous_value) / previous_value) * 100,
        2
    )


def calculate_booking_duration_hours(booking: Booking):
    start_datetime = datetime.combine(
        booking.booking_date,
        booking.start_time
    )
    end_datetime = datetime.combine(
        booking.booking_date,
        booking.end_time
    )

    if end_datetime < start_datetime:
        end_datetime = end_datetime + timedelta(days=1)

    return (
        end_datetime - start_datetime
    ).total_seconds() / 3600


def calculate_booking_revenue(booking: Booking, venue: Venue | None):
    if venue is None or venue.hourly_price is None:
        return 0

    return (
        venue.hourly_price
        * calculate_booking_duration_hours(booking)
        * booking.seats_reserved
    )


def get_dashboard_kpi_values(
    db: Session,
    window_start: date,
    window_end: date
):
    booking_rows = (
        db.query(Booking, Venue)
        .outerjoin(
            Venue,
            Booking.venue_id == Venue.venue_id
        )
        .filter(Booking.booking_date >= window_start)
        .filter(Booking.booking_date < window_end)
        .filter(
            func.coalesce(
                func.lower(Booking.status),
                "confirmed"
            ).notin_({"cancelled", "canceled"})
        )
        .all()
    )

    active_venue_ids = [
        venue_id
        for venue_id, in (
            db.query(AvailabilitySlot.venue_id)
            .filter(AvailabilitySlot.date >= window_start)
            .filter(AvailabilitySlot.date < window_end)
            .filter(AvailabilitySlot.available.is_(True))
            .distinct()
            .all()
        )
    ]

    average_rating = None

    if active_venue_ids:
        average_rating = (
            db.query(func.avg(Venue.rating))
            .filter(Venue.venue_id.in_(active_venue_ids))
            .filter(Venue.rating.isnot(None))
            .scalar()
        )

    return {
        "total_reservations": len(booking_rows),
        "monthly_revenue": round(
            sum(
                calculate_booking_revenue(
                    booking,
                    venue
                )
                for booking, venue in booking_rows
            ),
            2
        ),
        "active_properties_count": len(active_venue_ids),
        "average_user_rating": (
            round(
                average_rating,
                2
            )
            if average_rating is not None
            else 0
        )
    }


def build_kpi_metric(
    current_value: int | float,
    previous_value: int | float
):
    return {
        "value": current_value,
        "delta_percent": calculate_percentage_delta(
            current_value,
            previous_value
        )
    }


def get_admin_completed_checkout_revenues(db: Session):
    booking_rows = (
        db.query(Booking, Venue)
        .outerjoin(
            Venue,
            Booking.venue_id == Venue.venue_id
        )
        .filter(
            func.coalesce(
                func.lower(Booking.payment_status),
                ""
            ) == "paid"
        )
        .filter(
            func.coalesce(
                func.lower(Booking.status),
                "confirmed"
            ).notin_(["cancelled", "canceled"])
        )
        .all()
    )

    return round(
        sum(
            calculate_booking_revenue(
                booking,
                venue
            )
            for booking, venue in booking_rows
        ),
        2
    )


def get_admin_incident_counts(db: Session):
    cancelled_bookings = (
        db.query(func.count(Booking.id))
        .filter(
            func.coalesce(
                func.lower(Booking.status),
                "confirmed"
            ).in_(["cancelled", "canceled"])
        )
        .scalar()
        or 0
    )
    refund_pending_bookings = (
        db.query(func.count(Booking.id))
        .filter(
            func.coalesce(
                func.lower(Booking.payment_status),
                ""
            ) == "refund_pending"
        )
        .scalar()
        or 0
    )
    unavailable_slots = (
        db.query(func.count(AvailabilitySlot.id))
        .filter(AvailabilitySlot.available.is_(False))
        .scalar()
        or 0
    )

    return {
        "cancelled_bookings": cancelled_bookings,
        "refund_pending_bookings": refund_pending_bookings,
        "unavailable_slots": unavailable_slots
    }


def serialize_provider_arrival(
    booking: Booking,
    user: User,
    venue: Venue | None
):
    return {
        "booking_id": booking.id,
        "client_full_name": user.full_name,
        "venue_id": booking.venue_id,
        "venue_name": venue.name if venue else None,
        "confirmation_status": booking.status,
        "booking_date": booking.booking_date,
        "start_time": booking.start_time,
        "end_time": booking.end_time,
        "seats_reserved": booking.seats_reserved,
        "space_label": venue.name if venue else None,
        "fee_estimate": round(
            calculate_booking_revenue(
                booking,
                venue
            ),
            2
        )
    }


def slot_has_active_booking(
    db: Session,
    slot: AvailabilitySlot
):
    return (
        db.query(Booking)
        .filter(Booking.venue_id == slot.venue_id)
        .filter(Booking.booking_date == slot.date)
        .filter(Booking.start_time < slot.end_time)
        .filter(Booking.end_time > slot.start_time)
        .filter(
            func.coalesce(
                func.lower(Booking.status),
                "confirmed"
            ).notin_({"cancelled", "canceled", "completed"})
        )
        .first()
        is not None
    )


def is_active_booking_status(status: str | None):
    return (
        status
        or "confirmed"
    ).lower() not in {
        "cancelled",
        "canceled",
        "completed"
    }


def get_verified_survey_metric(
    db: Session,
    venue_id: str,
    metric_column
):
    metric_values = (
        db.query(metric_column)
        .join(
            Booking,
            PostBookingReview.booking_id == Booking.id
        )
        .filter(PostBookingReview.venue_id == venue_id)
        .filter(PostBookingReview.verified.is_(True))
        .filter(func.lower(Booking.status) == "completed")
        .filter(metric_column.isnot(None))
        .all()
    )

    values = [
        value
        for value, in metric_values
    ]

    if len(values) < 3:
        return "Too few ratings"

    return round(
        sum(values) / len(values),
        2
    )


def calculate_review_star_rating(review: PostBookingReview):
    score_values = [
        score
        for score in (
            review.wifi_score,
            review.plug_score,
            review.quietness_score
        )
        if score is not None
    ]

    if not score_values:
        return None

    return sum(score_values) / len(score_values)


def refresh_venue_rating(
    db: Session,
    venue_id: str
):
    review_rows = (
        db.query(PostBookingReview)
        .join(
            Booking,
            PostBookingReview.booking_id == Booking.id
        )
        .filter(PostBookingReview.venue_id == venue_id)
        .filter(PostBookingReview.verified.is_(True))
        .filter(func.lower(Booking.status) == "completed")
        .all()
    )

    review_ratings = [
        rating
        for rating in (
            calculate_review_star_rating(review)
            for review in review_rows
        )
        if rating is not None
    ]

    aggregate_rating = (
        round(
            sum(review_ratings) / len(review_ratings),
            2
        )
        if review_ratings
        else None
    )

    venue = (
        db.query(Venue)
        .filter(Venue.venue_id == venue_id)
        .with_for_update()
        .first()
    )

    if venue is not None:
        venue.rating = aggregate_rating

    return aggregate_rating


def has_required_contiguous_seats(
    db: Session,
    venue_id: str,
    requested_date: date,
    requested_start_time: time,
    requested_end_time: time,
    seats_required: int
):
    slots = (
        db.query(AvailabilitySlot)
        .filter(
            AvailabilitySlot.venue_id == venue_id
        )
        .filter(
            AvailabilitySlot.date == requested_date
        )
        .filter(
            AvailabilitySlot.available.is_(True)
        )
        .filter(
            AvailabilitySlot.end_time > requested_start_time
        )
        .filter(
            AvailabilitySlot.start_time < requested_end_time
        )
        .all()
    )

    bookings = (
        db.query(Booking)
        .filter(
            Booking.venue_id == venue_id
        )
        .filter(
            Booking.booking_date == requested_date
        )
        .filter(
            Booking.end_time > requested_start_time
        )
        .filter(
            Booking.start_time < requested_end_time
        )
        .filter(
            func.coalesce(
                func.lower(Booking.status),
                "confirmed"
            ).notin_({"cancelled", "canceled"})
        )
        .all()
    )

    boundaries = {
        requested_start_time,
        requested_end_time
    }

    for slot in slots:
        if slot.start_time > requested_start_time:
            boundaries.add(
                slot.start_time
            )

        if slot.end_time < requested_end_time:
            boundaries.add(
                slot.end_time
            )

    for booking in bookings:
        if booking.start_time > requested_start_time:
            boundaries.add(
                booking.start_time
            )

        if booking.end_time < requested_end_time:
            boundaries.add(
                booking.end_time
            )

    sorted_boundaries = sorted(
        boundaries
    )

    for index in range(
        len(sorted_boundaries) - 1
    ):
        segment_start = sorted_boundaries[index]
        segment_end = sorted_boundaries[index + 1]

        if segment_start >= segment_end:
            continue

        covering_slot = None

        for slot in slots:
            if (
                slot.start_time <= segment_start
                and slot.end_time >= segment_end
            ):
                covering_slot = slot
                break

        if covering_slot is None:
            return False

        reserved_seats = sum(
            booking.seats_reserved
            for booking in bookings
            if (
                booking.start_time < segment_end
                and booking.end_time > segment_start
            )
        )

        remaining_seats = covering_slot.available_seats - reserved_seats

        if remaining_seats < seats_required:
            return False

    return True

# CORS Whitelist
origins = [
    # Local development ports for the frontend
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    
    # Production frontend domains 
    "https://plugandwifi.xyz",
    "https://www.plugandwifi.xyz",
]

# Inject CORSMiddleware into the FastAPI application
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,          # Restrict cross-origin access to the specified whitelist
    allow_credentials=True,         # Allow cookies, session headers, or Authorization headers
    allow_methods=["*"],            # Allow all standard HTTP methods (GET, POST, PUT, DELETE, etc.)
    allow_headers=["*"],            # Allow all incoming HTTP headers (e.g., Bearer JWT tokens)
)

@app.get("/")
def home():

    return {
        "message": "Let's get A+!!"
    }
    
    
# =====================================================================
# CLOUD RUN STARTUP PROBE ENDPOINT
# =====================================================================
@app.get("/api/ping", status_code=200)
def ping():
    """
    Lightweight startup probe endpoint.
    Returns 'healthy' status to confirm the ASGI server is live.
    """
    return {
        "status": "healthy"
    }
    
    
# =============================================
# SYSTEM INFRASTRUCTURE MONITORING ENDPOINTS
# =============================================
@app.get("/api/health", status_code=200)
def health_check(db: Session = Depends(get_db)):
    """
    Production-ready system health check endpoint.
    Executes a low-overhead 'SELECT 1' raw query via SQLAlchemy to explicitly 
    verify database instance connection boundaries.
    """
    try:
        # Perform explicit baseline relational connection execution check
        db.execute(text("SELECT 1"))
        
        # Success payload confirming stable cross-tier networking operations
        return {
            "status": "healthy",
            "database": "PostgreSQL connected successfully"
        }
    except Exception as database_error:
        # Intercept any broken handshakes, pool starvation, or credential failures
        # Instantly raise HTTP 500 to alert cloud infrastructure runtime handlers
        raise HTTPException(
            status_code=500,
            detail={
                "status": "unhealthy",
                "error": str(database_error),
                "message": "Critical structural failure: Cloud SQL database is unreachable."
            }
        )


@app.post(
    "/api/chatbot/recommend",
    response_model=ChatbotRecommendResponse
)
def recommend_workspace(
    payload: ChatbotRecommendRequest,
    db: Session = Depends(get_db)
):
    message = payload.message.strip()

    if not message:
        raise HTTPException(
            status_code=422,
            detail="message must not be blank"
        )

    search_parameters = infer_chatbot_search_parameters(
        message
    )
    if not has_chatbot_search_signal(search_parameters):
        chatbot_response, follow_up_question = build_chatbot_venue_response(
            search_parameters,
            [],
            True
        )

        return {
            "response": chatbot_response,
            "model": get_gemini_model(),
            "search_parameters": search_parameters,
            "venues": [],
            "follow_up_question": follow_up_question
        }

    venues, location_resolved = search_venues_for_chatbot(
        search_parameters,
        db
    )
    chatbot_response, follow_up_question = build_chatbot_venue_response(
        search_parameters,
        venues,
        location_resolved
    )

    return {
        "response": chatbot_response,
        "model": get_gemini_model(),
        "search_parameters": search_parameters,
        "venues": venues,
        "follow_up_question": follow_up_question
    }


# ==========================================
# CORE AUTHENTICATION LOGIC INTERFACES
# ==========================================

@app.post("/api/auth/register")
def register_user(
    payload: UserRegister,
    db: Session = Depends(get_db)
):
    existing_user = db.query(User).filter(
        User.email == payload.email
    ).first()

    if existing_user:
        raise HTTPException(
            status_code = 400,
            detail = "Email already exists"
        )

    hashed_pw = hash_password(
        payload.password
    )

    new_user = User(
        full_name = payload.full_name,
        email = payload.email,
        password_hash = hashed_pw,
        role = payload.role
    )

    db.add(new_user)

    db.commit()

    db.refresh(new_user)

    return {
        "message":
        "User created successfully"
    }

@app.post("/api/auth/login")
def login_user(
    payload: UserLogin,
    db: Session = Depends(get_db)
):

    user = db.query(User).filter(
        User.email == payload.email
    ).first()

    if not user:

        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    password_correct = verify_password(
        payload.password,
        user.password_hash
    )

    if not password_correct:

        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    access_token = create_access_token(
        {
            "user_id": user.id,
            "email": user.email,
            "role": user.role
        }
    )
    refresh_token, refresh_session = issue_refresh_session(
        user_id=user.id,
        remember_me=payload.remember_me
    )

    db.add(refresh_session)
    db.commit()

    return {

        "access_token": access_token,

        "refresh_token": refresh_token,

        "token_type": "bearer",

        "refresh_token_expires_at": refresh_session.expires_at,

        "user": {
            "user_id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "role": user.role
        }
    }


@app.post("/api/auth/refresh")
def refresh_access_token(
    payload: RefreshTokenRequest,
    db: Session = Depends(get_db)
):
    current_time = datetime.utcnow()
    token_hash = hash_refresh_token(
        payload.refresh_token
    )
    refresh_session = (
        db.query(RefreshSession)
        .filter(RefreshSession.token_hash == token_hash)
        .with_for_update()
        .first()
    )

    if refresh_session is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid refresh token"
        )

    if refresh_session.revoked_at is not None:
        (
            db.query(RefreshSession)
            .filter(
                RefreshSession.family_id
                == refresh_session.family_id
            )
            .filter(RefreshSession.revoked_at.is_(None))
            .update(
                {RefreshSession.revoked_at: current_time},
                synchronize_session=False
            )
        )
        db.commit()

        raise HTTPException(
            status_code=401,
            detail="Refresh token reuse detected"
        )

    if refresh_session.expires_at <= current_time:
        refresh_session.revoked_at = current_time
        db.commit()

        raise HTTPException(
            status_code=401,
            detail="Refresh token has expired"
        )

    user = db.query(User).filter(
        User.id == refresh_session.user_id
    ).first()

    if user is None:
        refresh_session.revoked_at = current_time
        db.commit()

        raise HTTPException(
            status_code=401,
            detail="Refresh token user not found"
        )

    new_refresh_token, new_session = issue_refresh_session(
        user_id=user.id,
        family_id=refresh_session.family_id,
        expires_at=refresh_session.expires_at
    )
    refresh_session.revoked_at = current_time
    refresh_session.replaced_by_token_hash = new_session.token_hash

    db.add(new_session)
    db.commit()

    access_token = create_access_token(
        {
            "user_id": user.id,
            "email": user.email,
            "role": user.role
        }
    )

    return {
        "access_token": access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer",
        "refresh_token_expires_at": new_session.expires_at
    }


@app.post("/api/auth/logout")
def logout_user(
    payload: LogoutRequest | None = None,
    db: Session = Depends(get_db)
):
    if payload is not None:
        token_hash = hash_refresh_token(
            payload.refresh_token
        )
        refresh_session = db.query(RefreshSession).filter(
            RefreshSession.token_hash == token_hash
        ).first()

        if refresh_session is not None:
            (
                db.query(RefreshSession)
                .filter(
                    RefreshSession.family_id
                    == refresh_session.family_id
                )
                .filter(RefreshSession.revoked_at.is_(None))
                .update(
                    {RefreshSession.revoked_at: datetime.utcnow()},
                    synchronize_session=False
                )
            )
            db.commit()

    return {
        "message": "Logged out successfully"
    }


@app.post(
    "/api/venues",
    response_model=VenueCreateResponse
)
def create_venue(
    payload: VenueCreate,
    current_user: User = Depends(require_roles("provider")),
    db: Session = Depends(get_db)
):
    venue = Venue(
        venue_id=f"provider-{uuid.uuid4().hex[:12]}",
        name=payload.name,
        state="Pending Approval",
        lat=payload.lat,
        lon=payload.lon,
        borough=payload.borough,
        opening_hours=payload.opening_hours,
        seat_capacity=payload.seat_capacity,
        amenity_tags=serialize_amenity_tags(
            payload.amenity_tags
        ),
        rules_text=payload.rules_text,
        has_wifi=payload.has_wifi,
        plug_access=payload.plug_access,
        hourly_price=payload.hourly_price,
        partner=current_user.id
    )

    db.add(venue)
    db.commit()
    db.refresh(venue)

    return serialize_created_venue(venue)


@app.get(
    "/api/venues",
    response_model = VenueListResponse
)
def get_venues(

    wifi: bool | None = None,

    plug_access: int | None = None,

    max_price: float | None = None,

    borough: str | None = None,

    date: date | None = None,

    start_time: time | None = None,

    end_time: time | None = None,

    duration_hours: float | None = Query(
        None,
        gt=0
    ),

    seats_required: int = Query(
        1,
        ge=1
    ),

    limit: int = Query(
        20,
        ge=1
    ),

    page: int = Query(
        1,
        ge=1
    ),

    lat: float | None = Query(
        None,
        ge=-90,
        le=90
    ),

    lon: float | None = Query(
        None,
        ge=-180,
        le=180
    ),

    radius: float | None = Query(
        None,
        ge=0
    ),

    sort: str | None = Query(
        None
    ),

    db: Session = Depends(get_db)
):
    if (lat is None) != (lon is None):
        raise HTTPException(
            status_code=400,
            detail="Both lat and lon are required for geospatial filtering"
        )

    if duration_hours is not None and (date is None or start_time is None):
        raise HTTPException(
            status_code=400,
            detail="date and start_time are required when duration_hours is provided"
        )

    query = db.query(Venue).filter(
        public_discovery_state_filter()
    )

    if duration_hours is None and date and start_time and end_time:

        query = (
            query.join(
                AvailabilitySlot,
                Venue.venue_id == AvailabilitySlot.venue_id
            )
            .filter(
                AvailabilitySlot.date == date
            )
            .filter(
                AvailabilitySlot.start_time <= start_time
            )
            .filter(
                AvailabilitySlot.end_time >= end_time
            )
            .filter(
                AvailabilitySlot.available.is_(True)
            )
        )
    
    if wifi is not None:

        query = query.filter(
            Venue.has_wifi == wifi
        )

    if plug_access is not None:

        query = query.filter(
            Venue.plug_access == plug_access
        )

    if max_price is not None:

        query = query.filter(
            Venue.hourly_price <= max_price
        )
    
    if borough:
        query = query.filter(
            Venue.borough == borough
        )

    if duration_hours is not None:
        requested_end_time = add_duration_to_time(
            start_time,
            duration_hours
        )

        available_venue_ids = []

        for venue_id, in query.with_entities(
            Venue.venue_id
        ).all():
            if has_required_contiguous_seats(
                db,
                venue_id,
                date,
                start_time,
                requested_end_time,
                seats_required
            ):
                available_venue_ids.append(
                    venue_id
                )

        query = query.filter(
            Venue.venue_id.in_(
                available_venue_ids
            )
        )

    if sort is not None and not is_suitability_sort(sort):
        raise HTTPException(
            status_code=400,
            detail="sort must be one of: recommended, suitability"
        )
    
    offset = (
        page - 1
    ) * limit

    if lat is not None and lon is not None:
        venues_with_distance = []

        for venue in query.all():
            if venue.lat is None or venue.lon is None:
                continue

            distance_km = calculate_distance_km(
                lat,
                lon,
                venue.lat,
                venue.lon
            )

            if radius is not None and distance_km > radius:
                continue

            venues_with_distance.append(
                (
                    venue,
                    distance_km
                )
            )

        if is_suitability_sort(sort):
            venues_with_distance.sort(
                key=lambda venue_with_distance: (
                    -calculate_suitability_score(
                        venue_with_distance[0]
                    ),
                    venue_with_distance[1]
                )
            )
        else:
            venues_with_distance.sort(
                key=lambda venue_with_distance: venue_with_distance[1]
            )

        total_items = len(
            venues_with_distance
        )

        total_pages = (
            total_items + limit - 1
        ) // limit

        selected_venues = venues_with_distance[
            offset: offset + limit
        ]

        has_more = page < total_pages
    else:
        if is_suitability_sort(sort):
            venues = query.all()
            venues.sort(
                key=lambda venue: (
                    -calculate_suitability_score(venue),
                    venue.venue_id
                )
            )

            total_items = len(
                venues
            )

            total_pages = (
                total_items + limit - 1
            ) // limit

            venues = venues[
                offset: offset + limit
            ]
        else:
            total_items = query.count()

            total_pages = (
                total_items + limit - 1
            ) // limit

            venues = query.order_by(
                Venue.venue_id
            ).offset(
                offset
            ).limit(
                limit
            ).all()

        has_more = page < total_pages

        selected_venues = [
            (
                venue,
                None
            )
            for venue in venues
        ]

    busyness_predictions = get_busyness_predictions(
        [
            venue.venue_id
            for venue, _ in selected_venues
        ]
    )

    items = [
        build_venue_response(
            venue,
            distance_km,
            busyness_predictions.get(venue.venue_id),
            calculate_suitability_score(venue)
        )
        for venue, distance_km in selected_venues
    ]

    return {
        "items": items,
        "page": page,
        "limit": limit,
        "total_items": total_items,
        "total_pages": total_pages,
        "has_more": has_more
    }


@app.get(
    "/api/venues/suggestions",
    response_model=VenueSuggestionsResponse
)
def get_venue_suggestions(
    q: str = Query(min_length=1),
    limit: int = Query(
        8,
        ge=1,
        le=20
    ),
    db: Session = Depends(get_db)
):
    search_term = q.strip().lower()

    if not search_term:
        raise HTTPException(
            status_code=422,
            detail="q must not be blank"
        )

    venues = (
        db.query(Venue)
        .filter(
            public_discovery_state_filter()
        )
        .filter(
            func.lower(Venue.name).like(f"%{search_term}%")
        )
        .order_by(
            Venue.name
        )
        .limit(limit)
        .all()
    )

    return {
        "items": [
            {
                "venue_id": venue.venue_id,
                "name": venue.name,
                "lat": venue.lat,
                "lon": venue.lon,
                "borough": venue.borough,
                "type": "venue"
            }
            for venue in venues
        ]
    }


@app.get(
    "/api/venues/{venue_id}",
    response_model = VenueDetailResponse
)
def get_venue_by_id(
    venue_id: str,
    db: Session = Depends(get_db)
):
    venue = (
        db.query(Venue)
        .filter(
            Venue.venue_id == venue_id
        )
        .first()
    )

    if venue is None:
        
        raise HTTPException(
            status_code = 404,
            detail = "Venue not found"
        )
    
    busyness_predictions = get_busyness_predictions(
        [
            venue.venue_id
        ]
    )

    return build_venue_detail_response(
        venue,
        busyness_predictions.get(venue.venue_id)
    )


@app.get(
    "/api/venues/{venue_id}/availability",
    response_model=VenueAvailabilityResponse
)
def get_venue_availability(
    venue_id: str,
    db: Session = Depends(get_db)
):
    venue = (
        db.query(Venue)
        .filter(Venue.venue_id == venue_id)
        .first()
    )

    if venue is None:
        raise HTTPException(
            status_code=404,
            detail="Venue not found"
        )

    slots = (
        db.query(AvailabilitySlot)
        .filter(AvailabilitySlot.venue_id == venue_id)
        .order_by(
            AvailabilitySlot.date,
            AvailabilitySlot.start_time
        )
        .all()
    )

    return {
        "venue_id": venue_id,
        "available_slots": [
            {
                "slot_id": slot.id,
                "date": slot.date,
                "start_time": (
                    f"{slot.date.isoformat()}T{slot.start_time.isoformat()}"
                ),
                "end_time": (
                    f"{slot.date.isoformat()}T{slot.end_time.isoformat()}"
                ),
                "available": (
                    slot.available and slot.available_seats > 0
                ),
                "available_seats": slot.available_seats
            }
            for slot in slots
        ]
    }


@app.get(
    "/api/venues/{venue_id}/survey-metrics",
    response_model=VenueSurveyMetricsResponse
)
def get_venue_survey_metrics(
    venue_id: str,
    db: Session = Depends(get_db)
):
    venue = (
        db.query(Venue)
        .filter(Venue.venue_id == venue_id)
        .first()
    )

    if venue is None:
        raise HTTPException(
            status_code=404,
            detail="Venue not found"
        )

    return {
        "venue_id": venue_id,
        "wifi_score": get_verified_survey_metric(
            db,
            venue_id,
            PostBookingReview.wifi_score
        ),
        "plug_score": get_verified_survey_metric(
            db,
            venue_id,
            PostBookingReview.plug_score
        ),
        "quietness_score": get_verified_survey_metric(
            db,
            venue_id,
            PostBookingReview.quietness_score
        )
    }


@app.post(
    "/api/reviews",
    response_model=ReviewResponse
)
def create_review(
    payload: ReviewCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    booking = (
        db.query(Booking)
        .filter(Booking.id == payload.booking_id)
        .filter(Booking.user_id == current_user.id)
        .with_for_update()
        .first()
    )

    if booking is None:
        raise HTTPException(
            status_code=404,
            detail="Booking not found"
        )

    booking_status = (
        booking.status
        or ""
    ).lower()

    if booking_status != "completed":
        raise HTTPException(
            status_code=409,
            detail="Only completed bookings can be reviewed"
        )

    existing_review = (
        db.query(PostBookingReview)
        .filter(PostBookingReview.booking_id == booking.id)
        .first()
    )

    if existing_review is not None:
        raise HTTPException(
            status_code=409,
            detail="Review already exists for this booking"
        )

    review = PostBookingReview(
        booking_id=booking.id,
        user_id=current_user.id,
        venue_id=booking.venue_id,
        wifi_score=payload.wifi_score,
        plug_score=payload.plug_score,
        quietness_score=payload.quietness_score,
        verified=True
    )

    db.add(review)
    db.flush()

    venue_rating = refresh_venue_rating(
        db,
        booking.venue_id
    )

    db.commit()
    db.refresh(review)

    return {
        "id": review.id,
        "booking_id": review.booking_id,
        "user_id": review.user_id,
        "venue_id": review.venue_id,
        "wifi_score": review.wifi_score,
        "plug_score": review.plug_score,
        "quietness_score": review.quietness_score,
        "verified": review.verified,
        "venue_rating": venue_rating
    }


@app.post(
    "/api/bookings",
    response_model = BookingResponse
)
def create_booking(
    payload: BookingCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    venue = db.query(Venue).filter(
        Venue.venue_id == payload.venue_id
    ).first()

    if not venue:
        raise HTTPException(
            status_code=404,
            detail="Venue not found"
        )

    slot = (
    db.query(AvailabilitySlot)
    .filter(
        AvailabilitySlot.venue_id == payload.venue_id
    )
    .filter(
        AvailabilitySlot.date == payload.booking_date
    )
    .filter(
        AvailabilitySlot.start_time <= payload.start_time
    )
    .filter(
        AvailabilitySlot.end_time >= payload.end_time
    )
    .filter(
        AvailabilitySlot.available.is_(True)
    )
    .with_for_update()
    .first()
    )

    if not slot:
        raise HTTPException(
            status_code=400,
            detail="Requested time slot not available"
        )

    reserved_seats = (
        db.query(
            func.coalesce(
                func.sum(Booking.seats_reserved),
                0
            )
        )
        .filter(Booking.venue_id == payload.venue_id)
        .filter(Booking.booking_date == payload.booking_date)
        .filter(Booking.start_time < payload.end_time)
        .filter(Booking.end_time > payload.start_time)
        .filter(
            func.coalesce(
                func.lower(Booking.status),
                "confirmed"
            ).notin_({"cancelled", "canceled"})
        )
        .scalar()
    )

    if reserved_seats + payload.seats_reserved > slot.available_seats:
        raise HTTPException(
            status_code=409,
            detail="Venue capacity exceeded for the requested time"
        )
    
    booking = Booking(
        order_id=f"ORD-{uuid.uuid4().hex[:8]}",
        payment_status="paid",

        user_id=current_user.id,
        venue_id=payload.venue_id,
        booking_date=payload.booking_date,
        start_time=payload.start_time,
        end_time=payload.end_time,
        seats_reserved=payload.seats_reserved
    )

    db.add(booking)

    db.commit()

    db.refresh(booking)

    return booking


@app.patch(
    "/api/bookings/{booking_id}/cancel",
    response_model=BookingCancellationResponse
)
def cancel_booking(
    booking_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    booking = (
        db.query(Booking)
        .filter(Booking.id == booking_id)
        .filter(Booking.user_id == current_user.id)
        .with_for_update()
        .first()
    )

    if booking is None:
        raise HTTPException(
            status_code=404,
            detail="Booking not found"
        )

    current_status = (booking.status or "").lower()

    if current_status in {"cancelled", "canceled"}:
        raise HTTPException(
            status_code=409,
            detail="Booking is already cancelled"
        )

    if current_status == "completed":
        raise HTTPException(
            status_code=409,
            detail="Completed bookings cannot be cancelled"
        )

    booking_start = datetime.combine(
        booking.booking_date,
        booking.start_time
    )
    cancellation_deadline = booking_start - timedelta(
        hours=FREE_CANCELLATION_HOURS
    )

    if datetime.now() > cancellation_deadline:
        raise HTTPException(
            status_code=409,
            detail=(
                "Booking can only be cancelled at least "
                f"{FREE_CANCELLATION_HOURS} hours before the start time"
            )
        )

    slot = (
        db.query(AvailabilitySlot)
        .filter(AvailabilitySlot.venue_id == booking.venue_id)
        .filter(AvailabilitySlot.date == booking.booking_date)
        .filter(AvailabilitySlot.start_time <= booking.start_time)
        .filter(AvailabilitySlot.end_time >= booking.end_time)
        .with_for_update()
        .first()
    )

    if slot is None:
        raise HTTPException(
            status_code=409,
            detail="Booking inventory slot could not be restored"
        )

    booking.status = "cancelled"
    booking.payment_status = "refund_pending"

    db.commit()
    db.refresh(booking)

    return {
        "booking_id": booking.id,
        "status": booking.status,
        "payment_status": booking.payment_status,
        "released_seats": booking.seats_reserved,
        "message": "Booking cancelled successfully"
    }

@app.get("/api/users/me")
def get_me(
    current_user: User = Depends(
        get_current_user
    )
):
    
    return {

        "user_id": current_user.id,

        "full_name": current_user.full_name,

        "email": current_user.email,

        "role": current_user.role
    }


@app.post(
    "/api/favorites/{venue_id}",
    response_model=FavoriteResponse,
    status_code=201
)
def create_favorite(
    venue_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    venue = (
        db.query(Venue)
        .filter(Venue.venue_id == venue_id)
        .first()
    )

    if venue is None:
        raise HTTPException(
            status_code=404,
            detail="Venue not found"
        )

    existing_favorite = (
        db.query(Favorite)
        .filter(Favorite.user_id == current_user.id)
        .filter(Favorite.venue_id == venue_id)
        .first()
    )

    if existing_favorite is not None:
        raise HTTPException(
            status_code=409,
            detail="Favorite already exists"
        )

    favorite = Favorite(
        user_id=current_user.id,
        venue_id=venue_id
    )
    db.add(favorite)
    db.commit()

    return {
        "user_id": current_user.id,
        "venue_id": venue_id,
        "message": "Favorite created successfully"
    }


@app.delete("/api/favorites/{venue_id}")
def delete_favorite(
    venue_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    favorite = (
        db.query(Favorite)
        .filter(Favorite.user_id == current_user.id)
        .filter(Favorite.venue_id == venue_id)
        .first()
    )

    if favorite is None:
        raise HTTPException(
            status_code=404,
            detail="Favorite not found"
        )

    db.delete(favorite)
    db.commit()

    return {
        "message": "Favorite removed successfully"
    }


@app.get(
    "/api/provider/dashboard/kpis",
    response_model=ProviderDashboardKPIsResponse
)
def get_provider_dashboard_kpis(
    current_user: User = Depends(require_roles("provider")),
    db: Session = Depends(get_db)
):
    window_days = 30
    today = date.today()
    current_window_start = today - timedelta(
        days=window_days - 1
    )
    current_window_end = today + timedelta(
        days=1
    )
    previous_window_start = current_window_start - timedelta(
        days=window_days
    )
    previous_window_end = current_window_start

    current_values = get_dashboard_kpi_values(
        db,
        current_window_start,
        current_window_end
    )
    previous_values = get_dashboard_kpi_values(
        db,
        previous_window_start,
        previous_window_end
    )

    return {
        "window_days": window_days,
        "total_reservations": build_kpi_metric(
            current_values["total_reservations"],
            previous_values["total_reservations"]
        ),
        "monthly_revenue": build_kpi_metric(
            current_values["monthly_revenue"],
            previous_values["monthly_revenue"]
        ),
        "active_properties_count": build_kpi_metric(
            current_values["active_properties_count"],
            previous_values["active_properties_count"]
        ),
        "average_user_rating": build_kpi_metric(
            current_values["average_user_rating"],
            previous_values["average_user_rating"]
        )
    }


@app.get(
    "/api/admin/dashboard/overview",
    response_model=AdminDashboardOverviewResponse
)
def get_admin_dashboard_overview(
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db)
):
    global_active_properties = (
        db.query(
            func.count(
                func.distinct(AvailabilitySlot.venue_id)
            )
        )
        .filter(AvailabilitySlot.available.is_(True))
        .scalar()
        or 0
    )

    return {
        "global_active_properties": global_active_properties,
        "total_completed_checkout_revenues": (
            get_admin_completed_checkout_revenues(db)
        ),
        "system_incident_counts": get_admin_incident_counts(db)
    }


@app.patch(
    "/api/admin/venues/{venue_id}/suspension",
    response_model=VenueSuspensionResponse
)
def suspend_venue(
    venue_id: str,
    payload: VenueSuspensionRequest,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db)
):
    venue = (
        db.query(Venue)
        .filter(Venue.venue_id == venue_id)
        .with_for_update()
        .first()
    )

    if venue is None:
        raise HTTPException(
            status_code=404,
            detail="Venue not found"
        )

    active_bookings = []
    released_seats = 0

    if payload.state == "Suspended":
        active_bookings = (
            db.query(Booking)
            .filter(Booking.venue_id == venue_id)
            .with_for_update()
            .all()
        )
        active_bookings = [
            booking
            for booking in active_bookings
            if is_active_booking_status(booking.status)
        ]

        for booking in active_bookings:
            released_seats += booking.seats_reserved
            booking.status = "cancelled"
            booking.payment_status = "refund_pending"

    venue.state = payload.state

    db.commit()
    db.refresh(venue)

    return {
        "venue_id": venue.venue_id,
        "state": venue.state,
        "cancelled_bookings": len(active_bookings),
        "released_seats": released_seats,
        "message": (
            "Venue suspended successfully"
            if payload.state == "Suspended"
            else "Venue activated successfully"
        )
    }


@app.get(
    "/api/provider/dashboard/arrivals",
    response_model=ProviderArrivalsResponse
)
def get_provider_dashboard_arrivals(
    current_user: User = Depends(require_roles("provider")),
    limit: int = Query(
        20,
        ge=1
    ),
    db: Session = Depends(get_db)
):
    current_datetime = datetime.now()

    arrival_rows = (
        db.query(Booking, User, Venue)
        .join(
            User,
            Booking.user_id == User.id
        )
        .outerjoin(
            Venue,
            Booking.venue_id == Venue.venue_id
        )
        .filter(Booking.booking_date >= current_datetime.date())
        .filter(
            func.coalesce(
                func.lower(Booking.status),
                "confirmed"
            ).notin_({"cancelled", "canceled", "completed"})
        )
        .order_by(
            Booking.booking_date,
            Booking.start_time
        )
        .all()
    )

    upcoming_rows = [
        (
            booking,
            user,
            venue
        )
        for booking, user, venue in arrival_rows
        if booking_datetime(booking) >= current_datetime
    ][:limit]

    return {
        "items": [
            serialize_provider_arrival(
                booking,
                user,
                venue
            )
            for booking, user, venue in upcoming_rows
        ]
    }


@app.delete(
    "/api/venues/{venue_id}/slots/{slot_id}",
    response_model=SlotDeactivationResponse
)
def deactivate_availability_slot(
    venue_id: str,
    slot_id: int,
    current_user: User = Depends(require_roles("provider")),
    db: Session = Depends(get_db)
):
    slot = (
        db.query(AvailabilitySlot)
        .filter(AvailabilitySlot.id == slot_id)
        .filter(AvailabilitySlot.venue_id == venue_id)
        .with_for_update()
        .first()
    )

    if slot is None:
        raise HTTPException(
            status_code=404,
            detail="Availability slot not found"
        )

    if slot_has_active_booking(
        db,
        slot
    ):
        raise HTTPException(
            status_code=409,
            detail="An active booking exists during this time."
        )

    slot.available = False
    slot.available_seats = 0

    db.commit()
    db.refresh(slot)

    return {
        "slot_id": slot.id,
        "venue_id": slot.venue_id,
        "available": slot.available,
        "available_seats": slot.available_seats,
        "message": "Slot deactivated successfully"
    }


@app.get(
    "/api/users/me/bookings",
    response_model=UserBookingsResponse
)
def get_user_bookings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    booking_rows = (
        db.query(Booking, Venue)
        .outerjoin(
            Venue,
            Booking.venue_id == Venue.venue_id
        )
        .filter(Booking.user_id == current_user.id)
        .all()
    )

    current_datetime = datetime.now()
    grouped_rows = {
        "upcoming": [],
        "completed": [],
        "cancelled": []
    }

    for booking, venue in booking_rows:
        category = get_booking_category(
            booking,
            current_datetime
        )
        grouped_rows[category].append(
            (booking, venue)
        )

    grouped_rows["upcoming"].sort(
        key=lambda row: booking_datetime(row[0])
    )
    grouped_rows["completed"].sort(
        key=lambda row: booking_datetime(row[0]),
        reverse=True
    )
    grouped_rows["cancelled"].sort(
        key=lambda row: booking_datetime(row[0]),
        reverse=True
    )

    return {
        category: [
            serialize_user_booking(
                booking,
                venue,
                category
            )
            for booking, venue in rows
        ]
        for category, rows in grouped_rows.items()
    }
