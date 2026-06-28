from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Boolean,
    Text,
    ForeignKey,
    Date,
    Time,
    DateTime,
    UniqueConstraint
)

from datetime import datetime

from .database import Base


class User(Base):

    __tablename__ = "users"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    full_name = Column(
        String,
        nullable=False
    )

    email = Column(
        String,
        unique=True,
        nullable=False
    )

    password_hash = Column(
        String,
        nullable=False
    )

    role = Column(
        String,
        nullable=False,
        default="user",
        server_default="user"
    )


class RefreshSession(Base):

    __tablename__ = "refresh_sessions"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    token_hash = Column(
        String(64),
        unique=True,
        nullable=False,
        index=True
    )

    family_id = Column(
        String(36),
        nullable=False,
        index=True
    )

    expires_at = Column(
        DateTime,
        nullable=False
    )

    created_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow
    )

    revoked_at = Column(DateTime)

    replaced_by_token_hash = Column(String(64))


class Venue(Base):

    __tablename__ = "venues"

    venue_id = Column(
        String,
        primary_key=True
    )

    name = Column(String)

    state = Column(
        String,
        nullable=False,
        default="Active",
        server_default="Active"
    )

    osm_type = Column(String)

    cuisine_type = Column(String)

    cuisine_detail = Column(String)

    phone = Column(String)

    website = Column(String)

    building_number = Column(String)

    street = Column(String)

    zipcode = Column(String)

    lat = Column(Float)

    lon = Column(Float)

    opening_hours = Column(Text)

    has_wifi = Column(Boolean)

    noise_level = Column(String)

    noise_score = Column(Float)

    best_hours_for_work = Column(Text)

    hourly_profile = Column(Text)

    partner = Column(Integer)

    borough = Column(String)

    inferred_wifi = Column(Boolean)

    wifi_user_reported = Column(Boolean)

    nearest_subway = Column(String)

    nearest_subway_m = Column(Integer)

    nearest_bus = Column(String)

    nearest_bus_m = Column(Integer)

    plug_access = Column(Integer)

    plug_user_reported = Column(Boolean)

    rating = Column(Float)

    rating_user_reported = Column(Float)

    hourly_price = Column(Float)

    actual_hourly_price = Column(Float)

    plug_norm = Column(Float)

    wifi_norm = Column(Float)

    rating_norm = Column(Float)

    bus_norm = Column(Float)

    train_norm = Column(Float)


class AvailabilitySlot(Base):

    __tablename__ = "availability_slots"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    venue_id = Column(
        String,
        ForeignKey("venues.venue_id"),
        nullable=False
    )

    date = Column(
        Date,
        nullable=False
    )

    start_time = Column(
        Time,
        nullable=False
    )

    end_time = Column(
        Time,
        nullable=False
    )

    available = Column(
        Boolean,
        nullable=False
    )

    available_seats = Column(
        Integer,
        nullable=False
    )


class Favorite(Base):

    __tablename__ = "favorites"

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "venue_id",
            name="uq_favorites_user_venue"
        ),
    )

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    venue_id = Column(
        String,
        ForeignKey("venues.venue_id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )


class Booking(Base):

    __tablename__ = "bookings"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    venue_id = Column(
        String,
        ForeignKey("venues.venue_id"),
        nullable=False
    )

    booking_date = Column(
        Date,
        nullable=False
    )

    start_time = Column(
        Time,
        nullable=False
    )

    end_time = Column(
        Time,
        nullable=False
    )

    seats_reserved = Column(
        Integer,
        nullable=False
    )

    status = Column(
        String,
        default="confirmed"
    )

    order_id = Column(
        String,
        unique = True,
        nullable = False
    )

    payment_status = Column(
        String,
        default = "paid"
    )


class PostBookingReview(Base):

    __tablename__ = "post_booking_reviews"

    __table_args__ = (
        UniqueConstraint(
            "booking_id",
            name="uq_post_booking_reviews_booking"
        ),
    )

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    booking_id = Column(
        Integer,
        ForeignKey("bookings.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    venue_id = Column(
        String,
        ForeignKey("venues.venue_id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    wifi_score = Column(Float)

    plug_score = Column(Float)

    quietness_score = Column(Float)

    verified = Column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false"
    )

    created_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow
    )
