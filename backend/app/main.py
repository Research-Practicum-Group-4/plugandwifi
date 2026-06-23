from fastapi import (
    FastAPI ,
    Depends,
    HTTPException,
    Query
)
from fastapi.security import (
    OAuth2PasswordBearer
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
    Booking
)
from sqlalchemy.orm import Session
from sqlalchemy import text
from .schemas import (
    UserRegister,
    UserLogin,
    VenueListResponse,
    VenueDetailResponse,
    BookingCreate,
    BookingResponse
)
from .auth import (
    hash_password, 
    verify_password,
    create_access_token,
    verify_access_token
)
from datetime import date, datetime, time, timedelta
from math import asin, cos, radians, sin, sqrt

from fastapi.middleware.cors import CORSMiddleware

import uuid

Base.metadata.create_all(bind=engine)

app = FastAPI()

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/auth/login"
)

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):

    payload = verify_access_token(
        token
    )

    user = (
        db.query(User)
        .filter(
            User.id == payload["user_id"]
        )
        .first()
    )

    if not user:

        raise HTTPException(
            status_code=401,
            detail="User not found"
        )

    return user

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
            "email": user.email
        }
    )

    return {

        "access_token": access_token,

        "token_type": "bearer",

        "user": {
            "user_id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "role": user.role
        }
    }

@app.post("/api/auth/logout")
def logout_user():

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
    .first()
    )

    if not slot:
        raise HTTPException(
            status_code=400,
            detail="Requested time slot not available"
        )

    if payload.seats_reserved > slot.available_seats:

        raise HTTPException(
            status_code=400,
            detail="Not enough seats available"
    )

    overlapping_booking = (
    db.query(Booking)
    .filter(
        Booking.venue_id == payload.venue_id
    )
    .filter(
        Booking.booking_date == payload.booking_date
    )
    .filter(
        Booking.start_time < payload.end_time
    )
    .filter(
        Booking.end_time > payload.start_time
    )
    .first()
    )

    if overlapping_booking:

        raise HTTPException(
            status_code=400,
            detail="Time slot already booked"
        )


    slot.available_seats -= payload.seats_reserved
    
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
