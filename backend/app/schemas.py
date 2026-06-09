from pydantic import (
    BaseModel,
    EmailStr,
    Field
)


class UserRegister(
    BaseModel
):

    full_name: str

    email: EmailStr

    password: str = Field(
        min_length=8
    )


class UserLogin(
    BaseModel
):

    email: EmailStr

    password: str


class VenueResponse(
    BaseModel
):

    venue_id: str

    name: str

    cuisine_type: str

    lat: float

    lon: float

    noise_level: str

    noise_score: float

    rating: float

    plug_access: int

    hourly_price: float

    class Config:

        from_attributes = True