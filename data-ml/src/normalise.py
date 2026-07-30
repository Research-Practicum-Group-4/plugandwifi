import sqlite3
import pandas as pd

def normalise_plug(venues):
    venues["plug_norm"] = venues["plug_access"].astype(float)

def normalise_wifi(venues):
    venues["wifi_norm"] = venues["inferred_wifi"].astype(float).fillna(0.5)

def normalise_rating(venues):
    venues["rating_norm"] = venues["rating"] / 5

def normalise_bus(venues):
    dist = venues["nearest_bus_m"].clip(upper=1200)
    low = dist.min()
    high = dist.max()
    venues["bus_norm"] = (high - dist)/ (high - low)

def normalise_subway(venues):
    dist = venues["nearest_subway_m"].clip(upper=1200)
    low = dist.min()
    high = dist.max()
    venues["train_norm"] = (high - dist)/ (high - low)


def apply_to_venues(db_path: str = "data/processed/venues.db"):
    con = sqlite3.connect(db_path)
    venues = pd.read_sql("SELECT * from venues", con)

    normalise_plug(venues)
    normalise_wifi(venues)
    normalise_rating(venues)
    normalise_bus(venues)
    normalise_subway(venues)
    
    venues.to_sql("venues", con, if_exists="replace", index=False)
    venues.to_csv("data/processed/nyc_venues.csv", index=False)
    con.close()

    return venues