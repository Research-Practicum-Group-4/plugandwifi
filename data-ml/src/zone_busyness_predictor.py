import joblib
import numpy as np
import pandas as pd


class ZoneBusynessPredictor:
    def __init__(self,  model_path="data-ml/models/zone_busyness_model.joblib"):
        saved = joblib.load(model_path)
        if "zone_baselines" not in saved:
            raise RuntimeError(
                "This model artifact predates zone-mean encoding. "
                "Run data-ml/models/rf_zone_busyness_model.py to retrain it."
            )

        self.model = saved["model"]
        self.feature_names = saved["feature_names"]
        self.zone_baselines = saved["zone_baselines"]

    def predict_many(self, venues, date, hour):
        if isinstance(venues, dict):
            venues = pd.DataFrame([venues])
        elif isinstance(venues, pd.Series):
            venues = pd.DataFrame([venues])
        else:
            venues = venues.copy()

        date = pd.Timestamp(date)
        venues["is_weekend"] = int(date.dayofweek >= 5)
        venues["hour_sin"] = np.sin(2 * np.pi * hour / 24)
        venues["hour_cos"] = np.cos(2 * np.pi * hour / 24)
        venues["day_sin"] = np.sin(2 * np.pi * date.dayofweek / 7)
        venues["day_cos"] = np.cos(2 * np.pi * date.dayofweek / 7)
        venues["month_sin"] = np.sin(2 * np.pi * date.month / 12)
        venues["month_cos"] = np.cos(2 * np.pi * date.month / 12)
        venues["zone_baseline"] = venues["zone_id"].map(self.zone_baselines)

        valid = venues["zone_id"].notna() & venues["zone_baseline"].notna()
        venues["busyness_score"] = pd.NA

        if valid.any():
            scores = self.model.predict(venues.loc[valid, self.feature_names])
            venues.loc[valid, "busyness_score"] = (np.clip(scores, 0, 100).round().astype(int))

        results = []
        for _ , venue in venues.iterrows():
            score = venue["busyness_score"]
            if pd.isna(score):
                label = "Unavailable"
                score = None
            else:
                score = int(score)
                if score <= 33:
                    label = "Low"
                elif score <= 66:
                    label = "Medium"
                else:
                    label = "High"

            results.append(
                {
                    "venue_id": venue["venue_id"],
                    "busyness_score": score,
                    "busyness_label": label
                }
            )

        return results



def load_zone_busyness_predictor(
    model_path="data-ml/models/zone_busyness_model.joblib"
):
    return ZoneBusynessPredictor(model_path)
