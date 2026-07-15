import pandas as pd

TRIP_URL = (
    "https://d37ci6vzurychx.cloudfront.net/trip-data/"
    "{taxi_type}_tripdata_{month}.parquet"
) #Right cliked the january download to get the address it points to. Can then change taxi type and month to loop through later.

ZONE_URL = "https://d37ci6vzurychx.cloudfront.net/misc/taxi_zone_lookup.csv" 


def perhour_perzone_count(trips, time_column, zone_column, count_column, month):
    events = trips[[time_column, zone_column]].copy()
    events[time_column] = pd.to_datetime(events[time_column], errors="coerce")
    events[zone_column] = pd.to_numeric(events[zone_column], errors="coerce")
    events = events.dropna()

    events = events[
    (events[time_column] >= month.start_time)
    & (events[time_column] < (month + 1).start_time)]

    events["timestamp"] = events[time_column].dt.floor("h")
    events["zone_id"] = events[zone_column].astype(int)

    return (
        events.groupby(["timestamp", "zone_id"])
        .size()
        .reset_index(name=count_column)
    )


def event_type_count(trips, pickup_time, dropoff_time, month):
    pickups = perhour_perzone_count(
        trips,
        pickup_time,
        "PULocationID",
        "taxi_pickups",
        month
    )
    dropoffs = perhour_perzone_count(
        trips,
        dropoff_time,
        "DOLocationID",
        "taxi_dropoffs",
        month
    )

    return pickups.merge(
        dropoffs,
        on=["timestamp", "zone_id"],
        how="outer"
    ).fillna(0)


def fetch_month(taxi_type, month):
    if taxi_type == "yellow":
        pickup_time = "tpep_pickup_datetime"
        dropoff_time = "tpep_dropoff_datetime"
    else:
        pickup_time = "lpep_pickup_datetime"
        dropoff_time = "lpep_dropoff_datetime"

    url = TRIP_URL.format(taxi_type=taxi_type, month=month)

    trips = pd.read_parquet(
        url,
        columns=[
            pickup_time,
            dropoff_time,
            "PULocationID",
            "DOLocationID",
        ]
    )

    return event_type_count(
        trips,
        pickup_time,
        dropoff_time,
        month
    )


def fetch_taxi_data():
    monthly_activity = []

    for month in pd.period_range("2024-01", "2026-04", freq="M"):
        for taxi_type in ["yellow", "green"]:
            monthly_activity.append(fetch_month(taxi_type, month))

    activity = pd.concat(monthly_activity)
    activity = activity.groupby(
        ["timestamp", "zone_id"], as_index=False
    )[["taxi_pickups", "taxi_dropoffs"]].sum()

    zones = pd.read_csv(ZONE_URL)
    zones = zones.rename(
        columns={
            "LocationID": "zone_id",
            "Borough": "borough",
            "Zone": "taxi_zone",
        }
    )

    nyc_boroughs = [
        "Bronx",
        "Brooklyn",
        "Manhattan",
        "Queens",
        "Staten Island",
    ]
    zones = zones[zones["borough"].isin(nyc_boroughs)]

    activity = activity.merge(
        zones[["zone_id", "borough", "taxi_zone"]],
        on="zone_id",
    )
    activity["taxi_activity"] = (
        activity["taxi_pickups"] + activity["taxi_dropoffs"]
    )

    activity["date"] = activity["timestamp"].dt.date
    activity["hour"] = activity["timestamp"].dt.hour
    activity["day_of_week"] = activity["timestamp"].dt.dayofweek
    activity["day_type"] = activity["day_of_week"].apply(
        lambda day: "weekend" if day >= 5 else "weekday"
    )

    activity = activity.sort_values(["timestamp", "zone_id"])
    activity.to_csv("data/processed/taxi_data.csv", index=False)

    return activity


if __name__ == "__main__":
    fetch_taxi_data()
