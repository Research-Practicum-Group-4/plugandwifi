import json
import joblib
import numpy as np
import pandas as pd


MODEL_PATH = "data-ml/models/extra_trees_model.joblib"
VENUES_CSV = "data/processed/nyc_venues.csv"
RIDERSHIP_CSV = "data/processed/mta_ridership.csv"


def busyness_label(score):
    if score < 34:
        return "Low"
    if score < 67:
        return "Medium"
    return "High"


def add_time_features(row, hour, day_type, day_type_mapping):
    row = row.copy()

    row["day_type"] = day_type_mapping[day_type.lower()]
    row["hour_sin"] = np.sin(2 * np.pi * hour / 24)
    row["hour_cos"] = np.cos(2 * np.pi * hour / 24)

    return row


def scale_to_score(predicted_ridership):
    ridership = pd.read_csv(RIDERSHIP_CSV)

    low = ridership["avg_ridership"].quantile(0.10)
    high = ridership["avg_ridership"].quantile(0.95)

    score = (predicted_ridership - low) / (high - low) * 100
    return int(round(np.clip(score, 0, 100)))


def predict_venue_busyness(venue_id, hour, day_type):
    artifact = joblib.load(MODEL_PATH)

    model = artifact["model"]
    feature_names = artifact["feature_names"]
    day_type_mapping = artifact["day_type_mapping"]

    venues = pd.read_csv(VENUES_CSV)

    venue = venues.loc[venues["venue_id"] == venue_id]

    if venue.empty:
        raise ValueError(f"Venue not found: {venue_id}")

    venue = venue.iloc[0]

    venue = add_time_features(
        venue,
        hour=hour,
        day_type=day_type,
        day_type_mapping=day_type_mapping,
    )

    x = pd.DataFrame([venue])[feature_names]

    log_prediction = model.predict(x)[0]
    predicted_ridership = float(np.exp(log_prediction))

    score = scale_to_score(predicted_ridership)

    return {
        "venue_id": venue_id,
        "busyness_score": score,
        "busyness_label": busyness_label(score),
    }


if __name__ == "__main__":
    result = predict_venue_busyness(
        venue_id="osm_357620442",
        hour=9,
        day_type="weekday",
    )

    print(json.dumps(result, indent=2))