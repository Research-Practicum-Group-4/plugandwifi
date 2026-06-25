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
    Favorite
)
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from .schemas import (
    UserRegister,
    UserLogin,
    VenueListResponse,
    VenueDetailResponse,
    BookingCreate,
    BookingResponse,
    UserBookingsResponse,
    BookingCancellationResponse,
    RefreshTokenRequest,
    LogoutRequest,
    ProviderDashboardKPIsResponse
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

import os
import uuid


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

@app.get(
    "/api/venues",
    response_model = VenueListResponse
)
def get_venues(

    wifi: bool | None = None,

    plug_access: int | None = None,

    noise_level: str | None = None,

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

    query = db.query(Venue)

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

    if noise_level:

        query = query.filter(
            Venue.noise_level == noise_level
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

        venues_with_distance.sort(
            key=lambda venue_with_distance: venue_with_distance[1]
        )

        selected_venues = venues_with_distance[
            offset: offset + limit + 1
        ]

        has_more = len(
            selected_venues
        ) > limit

        selected_venues = selected_venues[:limit]
    else:
        venues = query.order_by(
            Venue.venue_id
        ).offset(
            offset
        ).limit(
            limit + 1
        ).all()

        has_more = len(
            venues
        ) > limit

        selected_venues = [
            (
                venue,
                None
            )
            for venue in venues[:limit]
        ]

    items = [
        {
            "venue_id": venue.venue_id,
            "name": venue.name,
            "lat": venue.lat,
            "lon": venue.lon,
            "borough": venue.borough,
            "cuisine_type": venue.cuisine_type,
            "has_wifi": venue.has_wifi,
            "noise_level": venue.noise_level,
            "noise_score": venue.noise_score,
            "rating": venue.rating,
            "plug_access": venue.plug_access,
            "hourly_price": venue.hourly_price,
            "plugs_available": venue.plug_access,
            "hourly_fee": venue.hourly_price,
            "availability_window": None,
            "opening_hours_summary": venue.opening_hours,
            "distance_km": distance_km
        }
        for venue, distance_km in selected_venues
    ]

    return {
        "items": items,
        "page": page,
        "limit": limit,
        "has_more": has_more
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
    
    return venue

@app.post(
    "/api/bookings",
    response_model = BookingResponse
)
def create_booking(
    payload: BookingCreate,
    db: Session = Depends(get_db)
):
    
    user = db.query(User).filter(
        User.id == payload.user_id
    ).first()

    if not user:
        raise HTTPException(
            status_code = 404,
            detail = "User not found"
        )
    
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

        user_id=payload.user_id,
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
