import pandas as pd

from .database import SessionLocal
from .models import Venue


def clean_value(value):
    
    if pd.isna(value):
        return None
    
    return value


def clean_bool(value):
    """
    NaN -> None

    1, 1.0 -> True

    0, 0.0 -> False
    """

    if pd.isna(value):
        return None
    
    return bool(value)


def clean_int(value):

    if pd.isna(value):
        return None

    return int(value)

def clean_float(value):

    if pd.isna(value):
        return None

    return float(value)


def seed_venues():

    print(
        "Seed script started..."
    )

    df = pd.read_csv(
        "backend/data/raw/venues.csv"
    )

    

    db = SessionLocal()

    venues = []

    for _, row in df.iterrows():

        venue = Venue(

        venue_id = str(row["venue_id"]),

        name = clean_value(row["name"]),

        osm_type = clean_value(row["osm_type"]),

        cuisine_type = clean_value(row["cuisine_type"]),

        cuisine_detail = clean_value(
            row["cuisine_detail"]
        ),

        phone = clean_value(
            row["phone"]
        ),

        website = clean_value(
            row["website"]
        ),

        building_number = clean_value(
            row["building_number"]
        ),

        street = clean_value(
            row["street"]
        ),

        zipcode = clean_value(
            row["zipcode"]
        ),

        lat = clean_float(
            row["lat"]
        ),

        lon = clean_float(
            row["lon"]
        ),

        opening_hours = clean_value(
            row["opening_hours"]
        ),

        has_wifi = clean_bool(
            row["has_wifi"]
        ),

        noise_level = clean_value(
            row["noise_level"]
        ),

        noise_score = clean_float(
            row["noise_score"]
        ),

        best_hours_for_work = clean_value(
            row["best_hours_for_work"]
        ),

        hourly_profile = clean_value(
            row["hourly_profile"]
        ),

        partner = clean_int(
            row["partner"]
        ),

        borough = clean_value(
            row["borough"]
        ),

        inferred_wifi = clean_bool(
            row["inferred_wifi"]
        ),

        wifi_user_reported = clean_bool(
            row["wifi_user_reported"]
        ),

        nearest_subway = clean_value(
            row["nearest_subway"]
        ),

        nearest_subway_m = clean_int(
            row["nearest_subway_m"]
        ),

        nearest_bus = clean_value(
            row["nearest_bus"]
        ),

        nearest_bus_m = clean_int(
            row["nearest_bus_m"]
        ),

        plug_access = clean_int(
            row["plug_access"]
        ),

        plug_user_reported = clean_bool(
            row["plug_user_reported"]
        ),

        rating = clean_float(
            row["rating"]
        ),

        rating_user_reported = clean_float(
            row["rating_user_reported"]
        ),

        hourly_price = clean_float(
            row["hourly_price"]
        ),

        actual_hourly_price = clean_float(
            row["actual_hourly_price"]
        )
        )

        venues.append(venue)

    db.add_all(
        venues
    )

    db.commit()

    print(
        f"{len(venues)} venues inserted successfully."
    )

    db.close()


if __name__ == "__main__":
    seed_venues()
