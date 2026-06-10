from fastapi import (
    FastAPI ,
    Depends,
    HTTPException
)
from .database import (
    engine, 
    Base , 
    get_db
)
from .models import (
    User,
    Venue
)
from sqlalchemy.orm import Session
from .schemas import (
    UserRegister,
    UserLogin,
    VenueResponse,
    VenueDetailResponse
)
from .auth import (
    hash_password, 
    verify_password,
    create_access_token
)

from fastapi.middleware.cors import CORSMiddleware

Base.metadata.create_all(bind=engine)

app = FastAPI()

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
    payload: UserLogin,
    db:Session = Depends(get_db)
):
    user = db.query(User).filter(
        User.email == payload.email
    ).first()

    if not user:

        raise HTTPException(
            status_code=401,
            detail = "Invalid email or password"
        )
    
    password_correct = verify_password(
        payload.password,
        user.password_hash
    )

    if not password_correct:
        
        raise HTTPException(
            status_code = 401,
            detail = "Invalid email or password"
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

    limit: int = 20,

    db: Session = Depends(get_db)
):
    query = db.query(Venue)
    
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