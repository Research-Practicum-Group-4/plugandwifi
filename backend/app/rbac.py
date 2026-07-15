from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from .auth import verify_access_token
from .database import get_db
from .models import User


oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/auth/login"
)


def get_token_payload(
    token: str = Depends(oauth2_scheme)
):
    payload = verify_access_token(token)

    if payload.get("user_id") is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid token"
        )

    return payload


def get_current_user(
    payload: dict = Depends(get_token_payload),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(
        User.id == payload["user_id"]
    ).first()

    if user is None:
        raise HTTPException(
            status_code=401,
            detail="User not found"
        )

    return user


def require_roles(*allowed_roles: str):
    def role_dependency(
        payload: dict = Depends(get_token_payload),
        current_user: User = Depends(get_current_user)
    ):
        token_role = payload.get("role")

        if (
            token_role is None
            or token_role != current_user.role
            or token_role not in allowed_roles
        ):
            raise HTTPException(
                status_code=403,
                detail="Insufficient permissions"
            )

        return current_user

    return role_dependency
