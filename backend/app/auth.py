import os
from datetime import datetime, timedelta, timezone

from dotenv import load_dotenv
from fastapi import HTTPException
from jose import JWTError, jwt
from passlib.context import CryptContext

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")

if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY environment variable is missing!")

ALGORITHM = os.getenv("ALGORITHM")

if not ALGORITHM:
    raise RuntimeError("ALGORITHM environment variable is missing!")

access_token_expire_minutes = os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES")

if not access_token_expire_minutes:
    raise RuntimeError("ACCESS_TOKEN_EXPIRE_MINUTES environment variable is missing!")

ACCESS_TOKEN_EXPIRE_MINUTES = int(access_token_expire_minutes)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict) -> str:
    to_encode = data.copy()

    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})

    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

    return encoded_jwt


def verify_access_token(token: str):

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        return payload

    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
