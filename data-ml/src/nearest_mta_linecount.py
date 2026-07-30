import math
import re
import sqlite3

import pandas as pd
from scipy.spatial import cKDTree


RIDERSHIP_CSV = "data/processed/mta_ridership.csv"
CSV_OUT = "data/processed/nyc_venues.csv"


def extract_subway_lines(station_complex):
    m = re.findall(r"\(([^()]*)\)", str(station_complex))

    if not m:
        return []

    route_group = m[-1]

    return [
        line.strip()
        for line in route_group.split(",")
        if line.strip()
    ]


def haversine_m(lat1, lon1, lat2, lon2):
    R = 6371000

    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)

    a = (
        math.sin(dphi / 2) ** 2
        + math.cos(phi1)
        * math.cos(phi2)
        * math.sin(dlambda / 2) ** 2
    )

    return 2 * R * math.asin(math.sqrt(a))


def load_mta_stations():
    ridership = pd.read_csv(RIDERSHIP_CSV)

    stations = (
        ridership[
            [
                "station_complex_id",
                "station_complex",
                "latitude",
                "longitude"
            ]
        ]
        .drop_duplicates()
        .reset_index(drop=True)
    )

    stations["subway_lines"] = stations["station_complex"].apply(extract_subway_lines)
    stations["mta_line_count"] = stations["subway_lines"].apply(len)

    return stations


def build_tree(stations):
    return cKDTree(stations[["latitude", "longitude"]].values)


def nearest_mta_info(lat, lon, tree, stations):
    _, index = tree.query([lat, lon])

    nearest = stations.iloc[index]

    dist = int(
        round(
            haversine_m(
                lat,
                lon,
                nearest["latitude"],
                nearest["longitude"]
            )
        )
    )

    return (
        nearest["station_complex_id"],
        nearest["station_complex"],
        dist,
        nearest["mta_line_count"]
    )


def apply_to_venues(db_path: str = "data/processed/venues.db"):
    stations = load_mta_stations()
    tree = build_tree(stations)

    con = sqlite3.connect(db_path)
    venues = pd.read_sql("SELECT * FROM venues", con)

    venues[
        [
            "nearest_mta_station_id",
            "nearest_mta_station",
            "nearest_mta_station_m",
            "nearest_mta_line_count"
        ]
    ] = venues.apply(
        lambda r: nearest_mta_info(
            r["lat"],
            r["lon"],
            tree,
            stations
        ),
        axis=1,
        result_type="expand"
    )

    venues["nearest_mta_station_m"] = venues["nearest_mta_station_m"].astype(int)
    venues["nearest_mta_line_count"] = venues["nearest_mta_line_count"].astype(int)

    venues.to_sql("venues", con, if_exists="replace", index=False)
    venues.to_csv(CSV_OUT, index=False)

    con.close()

    return venues


if __name__ == "__main__":
    df = apply_to_venues()