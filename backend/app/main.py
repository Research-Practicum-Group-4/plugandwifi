from fastapi import (
    FastAPI ,
    Depends,
    HTTPException
)
from fastapi.security import (
    OAuth2PasswordBearer,
    OAuth2PasswordRequestForm
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
from .schemas import (
    UserRegister,
    VenueResponse,
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
from datetime import date, time

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
        password_hash = hashed_pw
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
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):

    user = db.query(User).filter(
        User.email == form_data.username
    ).first()

    if not user:

        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    password_correct = verify_password(
        form_data.password,
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
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email
        }
    }

@app.get(
    "/api/venues",
    response_model = list[VenueResponse] 
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

    limit: int = 20,

    db: Session = Depends(get_db)
):
    query = db.query(Venue)

    if date and start_time and end_time:

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
    
    venues = query.limit(
        limit
    ).all()

    return venues

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

        "role": "user"
    }