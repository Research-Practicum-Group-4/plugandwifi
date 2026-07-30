import math
import sqlite3
import requests
import pandas as pd
from scipy.spatial import cKDTree

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
NYC_BBOX     = "40.477,-74.259,40.917,-73.700"
TRANSIT_BBOX = "40.45,-74.30,40.95,-73.65"


def fetch_transit_stops():

    resp = requests.post(OVERPASS_URL, data={"data": f'[out:json][timeout:90];node["railway"="station"]["station"="subway"]({TRANSIT_BBOX});out body;'}, headers={"User-Agent": "Adam"}, timeout=180)
    resp.raise_for_status()
    subway_elements = resp.json().get("elements", [])

    resp = requests.post(OVERPASS_URL, data={"data": f'[out:json][timeout:90];node["highway"="bus_stop"]({TRANSIT_BBOX});out body;'}, headers={"User-Agent": "Adam"}, timeout=180)
    resp.raise_for_status()
    bus_elements = resp.json().get("elements", [])

    def to_df(elements):
        rows = []
        for el in elements:
            lat, lon = el.get("lat"), el.get("lon")
            if lat and lon:
                rows.append({
                    "name": el.get("tags", {}).get("name", ""),
                    "lat":  float(lat),
                    "lon":  float(lon),
                })
        if not rows:
            return pd.DataFrame(columns=["name", "lat", "lon"])
        return pd.DataFrame(rows).drop_duplicates().reset_index(drop=True)

    subway_df = to_df(subway_elements)
    bus_df = to_df(bus_elements)
    print(f"Subway stations: {len(subway_df):,}")
    print(f"Bus stops: {len(bus_df):,}")
    return subway_df, bus_df


def haversine_m(lat1, lon1, lat2, lon2):
    R = 6371000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def build_tree(stops):
    return cKDTree(stops[["lat", "lon"]].values)


def nearest_stop_info(lat, lon, tree, stops):
    if stops.empty:
        return None, None
    _, index = tree.query([lat, lon])
    nearest = stops.iloc[index]
    dist = int(round(haversine_m(lat, lon, nearest["lat"], nearest["lon"])))
    return nearest["name"], dist


def apply_to_venues(db_path):
    subway_df, bus_df = fetch_transit_stops()

    subway_tree = build_tree(subway_df)
    bus_tree = build_tree(bus_df)

    con = sqlite3.connect(db_path)
    venues = pd.read_sql("SELECT * FROM venues", con)

    venues[["nearest_subway", "nearest_subway_m"]] = venues.apply( lambda r: nearest_stop_info(r["lat"], r["lon"], subway_tree, subway_df), axis=1, result_type="expand")

    venues[["nearest_bus", "nearest_bus_m"]] = venues.apply(lambda r: nearest_stop_info(r["lat"], r["lon"], bus_tree, bus_df), axis=1, result_type="expand")

    venues["nearest_subway_m"] = venues["nearest_subway_m"].astype(int)
    venues["nearest_bus_m"] = venues["nearest_bus_m"].astype(int)

    venues.to_sql("venues", con, if_exists="replace", index=False)
    venues.to_csv("data/processed/nyc_venues.csv", index=False)
    con.close()

    return venues


if __name__ == "__main__":
    df = apply_to_venues("data/processed/venues.db")
