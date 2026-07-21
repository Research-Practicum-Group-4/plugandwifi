import sys
import pandas as pd
import json


sys.path.append("data-ml/src")
from busyness_predictor import load_busyness_predictor

predictor = load_busyness_predictor()

venues = pd.read_csv("data/processed/nyc_venues.csv")

result = predictor.predict_many(
    venues.head(20),
    9,
    "weekday"
)

print(json.dumps(result, indent=2))