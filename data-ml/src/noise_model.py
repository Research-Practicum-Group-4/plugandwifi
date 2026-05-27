"""
Noise level inference model.

Predicts noise level (0.0 = silent, 1.0 = extremely loud) for a venue
given its category, hour of day, and day of week.

Two components multiply together:
  1. Base noise  — how inherently loud this venue type is
  2. Time factor — how busy this hour typically is for that venue type

Outputs:
  - noise_score (float 0-1) for any given hour
  - noise_label: "quiet" / "moderate" / "loud"
  - hourly_profile: dict of {hour: score} across full day
  - best_hours_for_work: list of hours where score < 0.45
"""

import json
import sqlite3
import pandas as pd


# Base noise by cuisine type (0 = silent, 1 = very loud)

BASE_NOISE: dict[str, float] = {
    "Coffee/Tea":                0.55,
    "Bakery Products/Desserts":  0.50,
    "Hotel Lobby":               0.30,
    "Restaurant":                0.65,
}

DEFAULT_BASE = 0.55  


# Hourly multipliers — how much busier/quieter each hour is vs baseline

HOUR_FACTOR: dict[int, float] = {
    0: 0.10, 
    1: 0.10, 
    2: 0.10, 
    3: 0.10, 
    4: 0.10, 
    5: 0.15,
    6: 0.40,
    7: 1.30,   
    8: 1.45,   
    9: 1.10,   
    10: 0.85,
    11: 0.95,
    12: 1.35,   
    13: 1.25,
    14: 0.80,   
    15: 0.75,   
    16: 0.85,
    17: 1.15,   
    18: 1.20,
    19: 1.10,
    20: 0.90,
    21: 0.70,
    22: 0.50,
    23: 0.25,
}


# Venue-type specific hour overrides

VENUE_HOUR_OVERRIDES: dict[str, dict[int, float]] = {
    "Restaurant": {
        **{h: 0.10 for h in range(0, 7)},
        7: 0.30, 
        8: 0.45, 
        9: 0.50,
        10: 0.55, 
        11: 0.85,
        12: 1.40, 
        13: 1.30,  
        14: 0.55, 
        15: 0.40, 
        16: 0.50, 
        17: 0.80,
        18: 1.30, 
        19: 1.40,  
        20: 1.20, 
        21: 0.90,
        22: 0.60, 
        23: 0.30,
    },
    "Hotel Lobby": {
        **{h: 0.15 for h in range(0, 6)},
        6: 0.30, 
        7: 0.45, 
        8: 0.55, 
        9: 0.60,
        10: 0.70, 
        11: 0.85,  
        12: 0.65, 
        13: 0.55,
        14: 0.50, 
        15: 0.90,  
        16: 0.95, 
        17: 0.85,
        18: 0.70, 
        19: 0.60, 
        20: 0.50,
        21: 0.35, 
        22: 0.25, 
        23: 0.15,
    },
}

# Weekend amplifier
WEEKEND_FACTOR = 1.15
WEEKDAY_FACTOR = 1.00


def noise_score(cuisine: str, hour: int, weekday: int) -> float:
    """
    Returns noise score 0.0-1.0.
    weekday: 0= Monday … 6 = Sunday
    """
    base = BASE_NOISE.get(cuisine, DEFAULT_BASE)
    overrides = VENUE_HOUR_OVERRIDES.get(cuisine, HOUR_FACTOR)
    h_factor = overrides.get(hour, HOUR_FACTOR.get(hour, 0.5))
    w_factor = WEEKEND_FACTOR if weekday >= 5 else WEEKDAY_FACTOR
    return min(round(base * h_factor * w_factor, 3), 1.0)


def noise_label(score: float) -> str:
    if score < 0.40:
        return "quiet"
    if score < 0.70:
        return "moderate"
    return "loud"


def hourly_profile(cuisine: str, weekday: int = 1) -> dict[int, dict]:
    """Returns full 24-hour profile for a typical weekday (Mon=1 default)."""
    return {
        h: {
            "score": noise_score(cuisine, h, weekday),
            "label": noise_label(noise_score(cuisine, h, weekday)),
        }
        for h in range(24)
    }


def best_hours_for_work(cuisine: str, weekday: int = 1,
                        threshold: float = 0.45) -> list[int]:
    """Hours where noise score is below threshold — good for focused work."""
    return [
        h for h in range(6, 23)
        if noise_score(cuisine, h, weekday) < threshold
    ]


def apply_to_venues(db_path: str = "data/processed/venues.db") -> pd.DataFrame:
    con    = sqlite3.connect(db_path)
    venues = pd.read_sql("SELECT * FROM venues", con)

    print(f"Applying noise model to {len(venues):,} venues...")

    venues["noise_score"] = venues["cuisine_type"].apply(
        lambda c: noise_score(c, hour=14, weekday=1)
    )
    venues["noise_level"] = venues["noise_score"].apply(noise_label)
    venues["best_hours_for_work"] = venues["cuisine_type"].apply(
        lambda c: json.dumps(best_hours_for_work(c))
    )
    venues["hourly_profile"]= venues["cuisine_type"].apply(
        lambda c: json.dumps(hourly_profile(c))
    )

    venues.to_sql("venues", con, if_exists="replace", index=False)
    venues.to_csv("data/processed/nyc_venues.csv", index=False)
    con.close()

    print("Done. Noise distribution:")
    print(venues["noise_level"].value_counts().to_string())
    return venues


if __name__ == "__main__":
    df = apply_to_venues()

    print("\nSample profiles:")
    for cuisine in ["Coffee/Tea", "Restaurant", "Hotel Lobby"]:
        profile = hourly_profile(cuisine)
        print(f"\n{cuisine}:")
        for h in [8, 10, 12, 14, 15, 17]:
            p = profile[h]
            bar = "█" * int(p["score"] * 20)
            print(f"  {h:02d}:00  {bar:<20}  {p['score']:.2f}  {p['label']}")
        print(f"  Best hours for work: {best_hours_for_work(cuisine)}")
