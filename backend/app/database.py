import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.orm import sessionmaker, declarative_base

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL environment variable is missing!"
    )


def get_int_setting(name, default, minimum=0):
    raw_value = os.getenv(name, str(default))

    try:
        value = int(raw_value)
    except ValueError as exc:
        raise RuntimeError(f"{name} must be an integer.") from exc

    if value < minimum:
        raise RuntimeError(f"{name} must be at least {minimum}.")

    return value


def build_engine_options(database_url):
    options = {
        "pool_pre_ping": True
    }

    if make_url(database_url).get_backend_name() != "postgresql":
        return options

    options.update(
        pool_size=get_int_setting("DB_POOL_SIZE", 5, 1),
        max_overflow=get_int_setting("DB_MAX_OVERFLOW", 5),
        pool_recycle=get_int_setting("DB_POOL_RECYCLE", 1800, 1),
        pool_timeout=get_int_setting("DB_POOL_TIMEOUT", 30, 1),
        connect_args={
            "connect_timeout": get_int_setting(
                "DB_CONNECT_TIMEOUT",
                10,
                1
            ),
            "keepalives": 1,
            "keepalives_idle": get_int_setting(
                "DB_KEEPALIVES_IDLE",
                30,
                1
            ),
            "keepalives_interval": get_int_setting(
                "DB_KEEPALIVES_INTERVAL",
                10,
                1
            ),
            "keepalives_count": get_int_setting(
                "DB_KEEPALIVES_COUNT",
                5,
                1
            )
        }
    )

    return options


engine = create_engine(
    DATABASE_URL,
    **build_engine_options(DATABASE_URL)
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
