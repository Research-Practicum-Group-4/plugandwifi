import pandas as pd
import numpy as np


mta = pd.read_csv("data/processed/mta_zone_hourly.csv")

taxi = pd.read_csv(
    "data/processed/taxi_activity_hourly.csv",
    usecols=[
        "zone_id",
        "date",
        "hour",
        "day_of_week",
        "day_type",
        "taxi_pickups",
        "taxi_dropoffs",
        "taxi_activity",
    ],
)

zone_activity = taxi.merge(
    mta,
    on=["zone_id", "date", "hour", "day_type"],
    how="outer",
)

zone_activity[
    [
        "mta_ridership",
        "taxi_pickups",
        "taxi_dropoffs",
        "taxi_activity",
    ]
] = zone_activity[
    [
        "mta_ridership",
        "taxi_pickups",
        "taxi_dropoffs",
        "taxi_activity",
    ]
].fillna(0)

zone_activity["taxi_net_arrivals"] = (
    zone_activity["taxi_dropoffs"]
    - zone_activity["taxi_pickups"]
)

zone_activity["log_mta_ridership"] = np.log1p(zone_activity["mta_ridership"])
zone_activity["log_taxi_activity"] = np.log1p(zone_activity["taxi_activity"])
zone_activity["log_taxi_net_arrivals"] = (
    np.sign(zone_activity["taxi_net_arrivals"])
    * np.log1p(np.abs(zone_activity["taxi_net_arrivals"]))
)

zone_activity["date"] = pd.to_datetime(zone_activity["date"])
training_rows = zone_activity["date"] < "2025-01-01"

mta_high = zone_activity.loc[
    training_rows, "log_mta_ridership"
].quantile(0.99)
taxi_high = zone_activity.loc[
    training_rows, "log_taxi_activity"
].quantile(0.99)
net_high = zone_activity.loc[
    training_rows, "log_taxi_net_arrivals"
].abs().quantile(0.99)

zone_activity["mta_score"] = (
    zone_activity["log_mta_ridership"] / mta_high
).clip(0, 1)
zone_activity["taxi_activity_score"] = (
    zone_activity["log_taxi_activity"] / taxi_high
).clip(0, 1)
zone_activity["taxi_net_arrivals_score"] = (
    zone_activity["log_taxi_net_arrivals"] / net_high
).clip(-1, 1)

zone_activity["busyness_score"] = (
    (
        0.5 * zone_activity["mta_score"]
        + 0.5 * zone_activity["taxi_activity_score"]
        + 0.05 * zone_activity["taxi_net_arrivals_score"]
    ).clip(0, 1)
    * 100
)

zone_activity.to_csv(
    "data/processed/zone_activity_hourly.csv",
    index=False,
)
