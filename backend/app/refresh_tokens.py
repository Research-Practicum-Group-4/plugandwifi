import hashlib
import os
import secrets
import uuid
from datetime import datetime, timedelta

from .models import RefreshSession


def get_positive_int_setting(name, default):
    raw_value = os.getenv(name, str(default))

    try:
        value = int(raw_value)
    except ValueError as exc:
        raise RuntimeError(f"{name} must be an integer.") from exc

    if value < 1:
        raise RuntimeError(f"{name} must be at least 1.")

    return value


REFRESH_TOKEN_EXPIRE_DAYS = get_positive_int_setting(
    "REFRESH_TOKEN_EXPIRE_DAYS",
    7
)
REMEMBER_ME_REFRESH_TOKEN_EXPIRE_DAYS = get_positive_int_setting(
    "REMEMBER_ME_REFRESH_TOKEN_EXPIRE_DAYS",
    30
)


def hash_refresh_token(refresh_token):
    return hashlib.sha256(
        refresh_token.encode("utf-8")
    ).hexdigest()


def issue_refresh_session(
    user_id,
    remember_me=False,
    family_id=None,
    expires_at=None
):
    refresh_token = secrets.token_urlsafe(48)
    token_hash = hash_refresh_token(refresh_token)
    issued_at = datetime.utcnow()

    if expires_at is None:
        lifetime_days = (
            REMEMBER_ME_REFRESH_TOKEN_EXPIRE_DAYS
            if remember_me
            else REFRESH_TOKEN_EXPIRE_DAYS
        )
        expires_at = issued_at + timedelta(days=lifetime_days)

    session = RefreshSession(
        user_id=user_id,
        token_hash=token_hash,
        family_id=family_id or str(uuid.uuid4()),
        expires_at=expires_at,
        created_at=issued_at
    )

    return refresh_token, session
