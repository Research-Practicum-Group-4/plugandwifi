from pydantic import (
    BaseModel,
    EmailStr,
    Field
)

from datetime import (
    date,
    time
)
from typing import Literal


class UserRegister(
    BaseModel
):

    full_name: str

    email: EmailStr

    password: str = Field(
        min_length=8
    )

    role: Literal["user", "provider"] = "user"


class UserLogin(
    BaseModel
):

    email: EmailStr

    password: str

    remember_me: bool = False


class RefreshTokenRequest(BaseModel):

    refresh_token: str = Field(min_length=32)


class LogoutRequest(BaseModel):

    refresh_token: str = Field(min_length=32)


class VenueResponse(BaseModel):

    venue_id: str
    name: str
    lat: float
    lon: float
    borough: str


    cuisine_type: str | None = None
    has_wifi: bool | None = None
    

    noise_level: str | None = None
    noise_score: float | None = None
    

    rating: float | None = None
    

    plug_access: int | None = None
    

    hourly_price: float | None = None

    plugs_available: int | None = None

    hourly_fee: float | None = None

    availability_window: str | None = None

    opening_hours_summary: str | bool | None = None

    distance_km: float | None = None

    class Config:
        from_attributes = True


class VenueListResponse(BaseModel):

    items: list[VenueResponse]

    page: int

    limit: int

    has_more: bool


class VenueDetailResponse(BaseModel):
    venue_id: str

    name: str

    osm_type: str | None = None

    cuisine_type: str | None = None

    cuisine_detail: str | None = None

    phone: str | None = None

    website: str | None = None

    building_number: str | None = None

    street: str | None = None

    zipcode: str | None = None

    lat: float

    lon: float

    opening_hours: str | None = None

    has_wifi: bool | None = None

    noise_level: str | None = None

    noise_score: float | None = None

    best_hours_for_work: str | None = None

    hourly_profile: str | None = None

    partner: int | None = None

    borough: str | None = None

    inferred_wifi: bool | None = None

    wifi_user_reported: bool | None = None

    nearest_subway: str | None = None

    nearest_subway_m: int | None = None

    nearest_bus: str | None = None

    nearest_bus_m: int | None = None

    plug_access: int | None = None

    plug_user_reported: bool | None = None

    rating: float | None = None

    rating_user_reported: float | None = None

    hourly_price: float | None = None
    
    actual_hourly_price: float | None = None

    class Config:
        from_attributes = True


class BookingCreate(BaseModel):

    user_id: int

    venue_id: str

    booking_date: date

    start_time: time

    end_time: time

    seats_reserved: int = Field(ge=1)


class BookingResponse(BaseModel):

    id: int

    user_id: int

    venue_id: str

    booking_date: date

    start_time: time

    end_time: time

    seats_reserved: int

    status: str

    order_id: str

    payment_status: str

    class Config:

        from_attributes = True


class UserBookingItem(BaseModel):

    booking_id: int

    venue_id: str

    venue_name: str | None = None

    booking_date: date

    start_time: time

    end_time: time

    seats_reserved: int

    status: str

    order_id: str

    payment_status: str

    lat: float | None = None

    lon: float | None = None


class UserBookingsResponse(BaseModel):

    upcoming: list[UserBookingItem]

    completed: list[UserBookingItem]

    cancelled: list[UserBookingItem]


class BookingCancellationResponse(BaseModel):

    booking_id: int

    status: str

    payment_status: str

    released_seats: int

    message: str


class SlotDeactivationResponse(BaseModel):

    slot_id: int

    venue_id: str

    available: bool

    available_seats: int

    message: str


class KPIMetric(BaseModel):

    value: int | float

    delta_percent: float | None = None


class ProviderDashboardKPIsResponse(BaseModel):

    window_days: int

    total_reservations: KPIMetric

    monthly_revenue: KPIMetric

    active_properties_count: KPIMetric

    average_user_rating: KPIMetric


class ProviderArrivalItem(BaseModel):

    booking_id: int

    client_full_name: str

    venue_id: str

    venue_name: str | None = None

    confirmation_status: str

    booking_date: date

    start_time: time

    end_time: time

    seats_reserved: int

    space_label: str | None = None

    fee_estimate: float


class ProviderArrivalsResponse(BaseModel):

    items: list[ProviderArrivalItem]


class VenueSurveyMetricsResponse(BaseModel):

    venue_id: str

    wifi_score: float | str

    plug_score: float | str

    quietness_score: float | str
