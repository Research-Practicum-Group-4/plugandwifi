import pandas as pd
from zone_busyness_predictor import load_zone_busyness_predictor
import json

venues = pd.read_csv("data/processed/nyc_venues.csv")
predictor = load_zone_busyness_predictor()

result = predictor.predict_many(
    venues.head(20),
    date="2026-07-17",
    hour=14
)

print(json.dumps(result, indent=2))