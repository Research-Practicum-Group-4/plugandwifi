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
from .models import User
from sqlalchemy.orm import Session
from .schemas import (
    UserRegister,
    UserLogin
)
from .auth import (
    hash_password, 
    verify_password,
    create_access_token
)
>>>>>>> Stashed changes

Base.metadata.create_all(bind=engine)

app = FastAPI()

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
