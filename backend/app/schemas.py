from datetime import date as date_type
from datetime import datetime as datetime_type
from datetime import time as time_type
from enum import Enum
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator


class UserRegister(BaseModel):
    full_name: str

    email: EmailStr

    password: str = Field(min_length=8)

    role: Literal["user", "provider"] = "user"


class UserLogin(BaseModel):
    email: EmailStr

    password: str

    remember_me: bool = False


class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(min_length=32)


class LogoutRequest(BaseModel):
    refresh_token: str = Field(min_length=32)


class ChatbotHistoryMessage(BaseModel):
    role: Literal["user", "assistant"]

    message: str = Field(min_length=1, max_length=1000)


class ChatbotIntent(str, Enum):
    NEW_SEARCH = "new_search"
    REFINE_SEARCH = "refine_search"
    COMPARE_PREVIOUS = "compare_previous"
    VENUE_DETAIL = "venue_detail"
    GENERAL_CHAT = "general_chat"
    RESET = "reset"


class ChatbotExtractionResult(BaseModel):
    model_config = ConfigDict(extra="ignore")

    intent: ChatbotIntent | None = None
    venue_name: str | None = Field(default=None, max_length=200)
    location: str | None = Field(default=None, max_length=200)
    radius_km: float | None = Field(default=None, gt=0, le=20)
    venue_type: str | None = Field(default=None, max_length=100)
    date: date_type | str | None = None
    start_time: time_type | str | None = None
    wifi: bool | None = None
    plug_access: bool | int | None = None
    accessibility_friendly: bool | None = None
    calls_allowed: bool | None = None
    wbe_certified: bool | None = None
    mbe_certified: bool | None = None
    vbe_certified: bool | None = None
    bcorp_certified: bool | None = None
    lgbt_friendly: bool | None = None
    busyness: Literal["low", "medium", "moderate", "high"] | None = None
    time: str | None = Field(default=None, max_length=50)
    no_preference: bool = False


class ChatbotSearchParameters(BaseModel):
    venue_name: str | None = Field(default=None, max_length=200)

    candidate_venue_names: list[str] = Field(default_factory=list, max_length=10)

    location: str | None = Field(default=None, max_length=200)

    radius_km: float | None = Field(default=None, gt=0, le=20)

    venue_type: str | None = Field(default=None, max_length=100)

    date: date_type | None = None

    start_time: time_type | None = None

    wifi: bool | None = None

    plug_access: int | None = None

    accessibility_friendly: bool | None = None

    calls_allowed: bool | None = None

    wbe_certified: bool | None = None

    mbe_certified: bool | None = None

    vbe_certified: bool | None = None

    bcorp_certified: bool | None = None

    lgbt_friendly: bool | None = None

    busyness: str | None = None

    time: str | None = Field(default=None, max_length=50)

    sort_by_distance: bool = False

    no_preference: bool = False


class ChatbotConversationContext(BaseModel):
    active_search_parameters: ChatbotSearchParameters | None = None

    last_recommended_venue_ids: list[str] = Field(
        default_factory=list, max_length=10
    )

    clarification_asked: bool = False

    last_intent: ChatbotIntent | None = None


class ChatbotRecommendRequest(BaseModel):
    message: str = Field(min_length=1, max_length=500)

    chat_history: list[ChatbotHistoryMessage] = Field(
        default_factory=list, max_length=12
    )

    conversation_context: ChatbotConversationContext | None = None


class ChatbotRecommendResponse(BaseModel):
    response: str

    model: str

    search_parameters: ChatbotSearchParameters | None = None

    venues: list["VenueResponse"] = Field(default_factory=list)

    follow_up_question: str | None = None

    conversation_context: ChatbotConversationContext


class VenueResponse(BaseModel):
    venue_id: str
    name: str
    state: str | None = None
    lat: float
    lon: float
    borough: str

    cuisine_type: str | None = None
    has_wifi: bool | None = None
    phone: str | None = None
    website: str | None = None
    building_number: str | None = None
    street: str | None = None
    zipcode: str | None = None

    accessibility_friendly: bool = False
    calls_allowed: bool = False
    wbe_certified: bool = False
    mbe_certified: bool = False
    vbe_certified: bool = False
    bcorp_certified: bool = False
    lgbt_friendly: bool = False

    rating: float | None = None

    plug_access: int | None = None

    hourly_price: float | None = None

    availability_window: str | None = None

    opening_hours_summary: str | bool | None = None

    distance_km: float | None = None

    busyness_score: int | None = None

    busyness_label: str | None = None

    busyness_predicted_for: str | None = None

    suitability_score: float | None = None

    class Config:
        from_attributes = True


class VenueListResponse(BaseModel):
    items: list[VenueResponse]

    page: int

    limit: int

    total_items: int

    total_pages: int

    has_more: bool


class VenueSuggestion(BaseModel):
    venue_id: str

    name: str

    lat: float

    lon: float

    borough: str

    type: Literal["venue"] = "venue"


class VenueSuggestionsResponse(BaseModel):
    items: list[VenueSuggestion]


class VenueCreate(BaseModel):
    name: str = Field(min_length=1)

    lat: float = Field(ge=-90, le=90)

    lon: float = Field(ge=-180, le=180)

    borough: str = Field(min_length=1)

    opening_hours: str | None = None

    seat_capacity: int = Field(ge=1)

    amenity_tags: list[str] = []

    rules_text: str | None = None

    has_wifi: bool | None = None

    plug_access: int | None = Field(None, ge=0)

    hourly_price: float | None = Field(None, ge=0)

    osm_type: str | None = None

    street: str | None = None

    zipcode: str | None = None

    accessibility_friendly: bool = False

    wbe_certified: bool = False

    mbe_certified: bool = False

    lgbt_friendly: bool = False

    availability_date: date_type | None = None

    availability_days: list[int] = Field(default_factory=list)

    availability_start_time: time_type | None = None

    availability_end_time: time_type | None = None

    @model_validator(mode="after")
    def validate_availability_window(self):
        availability_values = (
            self.availability_date,
            self.availability_start_time,
            self.availability_end_time,
        )
        if (
            not self.availability_days
            and any(value is not None for value in availability_values)
            and not all(value is not None for value in availability_values)
        ):
            raise ValueError(
                "availability_date, availability_start_time, and "
                "availability_end_time must be provided together"
            )
        if (
            self.availability_start_time is not None
            and self.availability_end_time is not None
            and self.availability_end_time <= self.availability_start_time
        ):
            raise ValueError("availability_end_time must be after availability_start_time")
        if self.availability_days:
            invalid_days = [
                day for day in self.availability_days if day < 0 or day > 6
            ]
            if invalid_days:
                raise ValueError("availability_days must use 0-6 for Monday-Sunday")
            if (
                self.availability_start_time is None
                or self.availability_end_time is None
            ):
                raise ValueError(
                    "availability_start_time and availability_end_time are required "
                    "when availability_days is provided"
                )
        return self


class GeocodeResponse(BaseModel):
    lat: float

    lon: float

    display_name: str | None = None


class VenueCreateResponse(BaseModel):
    venue_id: str

    name: str

    state: str

    lat: float

    lon: float

    borough: str

    opening_hours: str | None = None

    seat_capacity: int

    amenity_tags: list[str]

    rules_text: str | None = None

    has_wifi: bool | None = None

    plug_access: int | None = None

    hourly_price: float | None = None


class ProviderVenueListResponse(BaseModel):
    items: list[VenueCreateResponse]


class AdminPendingVenueResponse(VenueCreateResponse):
    provider_name: str

    provider_email: str

    osm_type: str | None = None

    street: str | None = None

    zipcode: str | None = None

    availability_date: date_type | None = None

    availability_start_time: str | None = None

    availability_end_time: str | None = None


class AdminPendingVenueListResponse(BaseModel):
    items: list[AdminPendingVenueResponse]


class VenueReviewRequest(BaseModel):
    decision: Literal["approve", "reject"]


class VenueReviewResponse(BaseModel):
    venue_id: str

    state: Literal["Active", "Rejected"]

    message: str


class VenueDetailResponse(BaseModel):
    venue_id: str

    name: str

    state: str | None = None

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

    accessibility_friendly: bool = False
    calls_allowed: bool = False
    wbe_certified: bool = False
    mbe_certified: bool = False
    vbe_certified: bool = False
    bcorp_certified: bool = False
    lgbt_friendly: bool = False

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

    busyness_score: int | None = None

    busyness_label: str | None = None

    busyness_predicted_for: str | None = None

    suitability_score: float | None = None

    seat_capacity: int

    amenity_tags: list[str]

    rules_text: str | None = None

    class Config:
        from_attributes = True


class AvailabilitySlotResponse(BaseModel):
    slot_id: int

    date: date_type

    start_time: str

    end_time: str

    available: bool

    available_seats: int


class VenueAvailabilityResponse(BaseModel):
    venue_id: str

    available_slots: list[AvailabilitySlotResponse]


class BookingCreate(BaseModel):
    venue_id: str

    booking_date: date_type

    start_time: time_type

    end_time: time_type

    seats_reserved: int = Field(ge=1)


class BookingResponse(BaseModel):
    id: int

    user_id: int

    venue_id: str

    booking_date: date_type

    start_time: time_type

    end_time: time_type

    seats_reserved: int

    status: str

    order_id: str

    payment_status: str

    class Config:
        from_attributes = True


class MockPaymentConfirmRequest(BaseModel):
    booking_id: int

    card_number: str = Field(min_length=12)


class MockPaymentResponse(BaseModel):
    booking_id: int

    order_id: str

    status: str

    payment_status: str

    message: str


class ReviewCreate(BaseModel):
    booking_id: int

    wifi_score: float = Field(ge=1, le=5)

    plug_score: float = Field(ge=1, le=5)

    quietness_score: float = Field(ge=1, le=5)

    comment: str | None = Field(default=None, max_length=1000)


class ReviewResponse(BaseModel):
    id: int

    booking_id: int

    user_id: int

    venue_id: str

    wifi_score: float | None = None

    plug_score: float | None = None

    quietness_score: float | None = None

    comment: str | None = None

    verified: bool

    venue_rating: float | None = None


class VenueReviewItem(BaseModel):
    id: int

    booking_id: int

    user_id: int

    reviewer_name: str | None = None

    venue_id: str

    rating: float | None = None

    wifi_score: float | None = None

    plug_score: float | None = None

    quietness_score: float | None = None

    comment: str | None = None

    verified: bool

    created_at: datetime_type


class VenueReviewsResponse(BaseModel):
    items: list[VenueReviewItem]

    total_items: int

    average_rating: float | None = None


class UserBookingItem(BaseModel):
    booking_id: int

    venue_id: str

    venue_name: str | None = None

    booking_date: date_type

    start_time: time_type

    end_time: time_type

    seats_reserved: int

    status: str

    order_id: str

    payment_status: str

    lat: float | None = None

    lon: float | None = None

    review_submitted: bool = False


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


class FavoriteResponse(BaseModel):
    user_id: int

    venue_id: str

    message: str


class FavoriteListResponse(BaseModel):
    venue_ids: list[str]


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

    booking_date: date_type

    start_time: time_type

    end_time: time_type

    seats_reserved: int

    space_label: str | None = None

    fee_estimate: float


class ProviderArrivalsResponse(BaseModel):
    items: list[ProviderArrivalItem]


class ProviderBookingCompletionResponse(BaseModel):
    booking_id: int

    status: str

    message: str


class VenueSurveyMetricsResponse(BaseModel):
    venue_id: str

    wifi_score: float | str

    plug_score: float | str

    quietness_score: float | str


class AdminIncidentCounts(BaseModel):
    cancelled_bookings: int

    refund_pending_bookings: int

    unavailable_slots: int


class AdminDashboardOverviewResponse(BaseModel):
    global_active_properties: int

    total_completed_checkout_revenues: float

    system_incident_counts: AdminIncidentCounts


class VenueSuspensionRequest(BaseModel):
    state: Literal["Active", "Suspended"] = "Suspended"


class VenueSuspensionResponse(BaseModel):
    venue_id: str

    state: str

    cancelled_bookings: int

    released_seats: int

    message: str
