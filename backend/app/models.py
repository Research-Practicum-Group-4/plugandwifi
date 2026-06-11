from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Boolean,
    Text,
    ForeignKey,
    Date,
    Time
)

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


class Venue(Base):

    __tablename__ = "venues"

    venue_id = Column(
        String,
        primary_key=True
    )

    name = Column(String)

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