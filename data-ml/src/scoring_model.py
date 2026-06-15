import json
import sqlite3
import pandas as pd

DEFAULT_WEIGHTS = {
    "wifi": 0.35,
    "plug": 0.30,
    "noise": 0.25,
    "rating": 0.10,
}


def score_venue(venue, weights, hour):
    profile = json.loads(venue["hourly_profile"])
    noise_norm = 1 - profile[str(hour)]["score"]

    components = {
        "wifi": venue["wifi_norm"],
        "plug": venue["plug_norm"],
        "noise": noise_norm,
        "rating": venue["rating_norm"],
        "bus": venue["bus_norm"],
        "train": venue["train_norm"],
    }

    total = sum(weights.values())
    return sum(components[name] * w / total for name, w in weights.items())


if __name__ == "__main__":
    con = sqlite3.connect("data/processed/venues.db")
    venues = pd.read_sql("SELECT * FROM venues", con)
    con.close()

    weights = {**DEFAULT_WEIGHTS, "train": 0.20}
    hour = 9

    venues["work_score"] = venues.apply(
        lambda v: score_venue(v, weights, hour), axis=1
    )

    top = venues.sort_values("work_score", ascending=False)
    print(top[["name", "cuisine_type", "work_score"]].head(10).to_string(index=False))
