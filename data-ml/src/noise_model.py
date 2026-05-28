import json
import sqlite3
import pandas as pd

base_level= {
    "cafe": 0.55,
    "bakery": 0.5,
    "hotel": 0.3,
    "restaurant": 0.65,
}

default_noise= 0.5 

hourly_factor = {
    0: 0.1, 
    1: 0.1, 
    2: 0.1, 
    3: 0.1, 
    4: 0.1, 
    5: 0.15,
    6: 0.4,
    7: 1.3,   
    8: 1.45,   
    9: 1.1,   
    10: 0.85,
    11: 0.95,
    12: 1.35,   
    13: 1.25,
    14: 0.8,   
    15: 0.75,   
    16: 0.85,
    17: 1.15,   
    18: 1.2,
    19: 1.1,
    20: 0.9,
    21: 0.7,
    22: 0.5,
    23: 0.25,
}



hourly_overrides = {
    "restaurant": {
        **{h: 0.10 for h in range(0, 7)},
        7: 0.3, 
        8: 0.45, 
        9: 0.5,
        10: 0.55, 
        11: 0.85,
        12: 1.4, 
        13: 1.3,  
        14: 0.55, 
        15: 0.4, 
        16: 0.5, 
        17: 0.8,
        18: 1.3, 
        19: 1.4,  
        20: 1.2, 
        21: 0.9,
        22: 0.6, 
        23: 0.3,
    },
    "hotel": {
        **{h: 0.15 for h in range(0, 6)},
        6: 0.3, 
        7: 0.45, 
        8: 0.55, 
        9: 0.6,
        10: 0.7, 
        11: 0.85,  
        12: 0.65, 
        13: 0.55,
        14: 0.5, 
        15: 0.9,  
        16: 0.95, 
        17: 0.85,
        18: 0.7, 
        19: 0.6, 
        20: 0.5,
        21: 0.35, 
        22: 0.25, 
        23: 0.15,
    },
}


weekend_factor = 1.15
weekday_factor = 1.00


def noise_score(cuisine, hour, weekday):
    
    base = base_level.get(cuisine, default_noise)
    overrides = hourly_overrides.get(cuisine, hourly_factor)
    h_factor = overrides.get(hour, hourly_factor.get(hour, 0.5))
    w_factor = weekend_factor if weekday >= 5 else weekday_factor
    return min(round(base * h_factor * w_factor, 3), 1.0)


def noise_label(score):
    if score < 0.40:
        return "quiet"
    if score < 0.70:
        return "moderate"
    return "loud"


def hourly_profile(cuisine, weekday: int = 1):
    return {
        h: {
            "score": noise_score(cuisine, h, weekday),
            "label": noise_label(noise_score(cuisine, h, weekday)),
        }
        for h in range(24)
    }


def best_hours_for_work(cuisine, weekday: int = 1, threshold: float = 0.45):
    return [
        h for h in range(6, 23)
        if noise_score(cuisine, h, weekday) < threshold
    ]


def apply_to_venues(db_path: str = "data/processed/venues.db"):
    con = sqlite3.connect(db_path)
    venues = pd.read_sql("SELECT * FROM venues", con)

    venues["noise_score"] = venues["cuisine_type"].apply(lambda c: noise_score(c, hour=14, weekday=1))

    venues["noise_level"] = venues["noise_score"].apply(noise_label)

    venues["best_hours_for_work"] = venues["cuisine_type"].apply(lambda c: json.dumps(best_hours_for_work(c)))

    venues["hourly_profile"]= venues["cuisine_type"].apply(lambda c: json.dumps(hourly_profile(c)))

    venues.to_sql("venues", con, if_exists="replace", index=False)
    venues.to_csv("data/processed/nyc_venues.csv", index=False)
    con.close()

    print(venues["noise_level"].value_counts().to_string())
    return venues


if __name__ == "__main__":
    df = apply_to_venues()