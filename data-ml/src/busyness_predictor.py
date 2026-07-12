import numpy as np
import pandas as pd
import joblib


class BusynessPredictor:
    def __init__(
        self,
        model,
        feature_names,
        day_type_mapping,
        score_low,
        score_high,
        low_max=33,
        medium_max=66,
    ):
        self.model = model
        self.feature_names = feature_names
        self.day_type_mapping = day_type_mapping
        self.score_low = float(score_low)
        self.score_high = float(score_high)
        self.low_max = int(low_max)
        self.medium_max = int(medium_max)

    def _add_time_features(self, venues, hour, day_type):
        venues = venues.copy()

        day_type_key = day_type.lower()
        if day_type_key not in self.day_type_mapping:
            raise ValueError(
                f"Unknown day_type '{day_type}'. Expected one of: "
                f"{list(self.day_type_mapping.keys())}"
            )

        venues["day_type"] = self.day_type_mapping[day_type_key]
        venues["hour_sin"] = np.sin(2 * np.pi * hour / 24)
        venues["hour_cos"] = np.cos(2 * np.pi * hour / 24)

        return venues

    def _scale_to_score(self, predicted_ridership):
        score = (
            (predicted_ridership - self.score_low)
            / (self.score_high - self.score_low)
            * 100
        )
        return np.clip(score, 0, 100).round().astype(int)

    def _label(self, score):
        if score <= self.low_max:
            return "Low"
        if score <= self.medium_max:
            return "Medium"
        return "High"

    def predict_many(self, venues, hour, day_type):
        if isinstance(venues, pd.Series):
            venues = pd.DataFrame([venues])
        elif isinstance(venues, dict):
            venues = pd.DataFrame([venues])
        else:
            venues = venues.copy()

        venues = self._add_time_features(venues, hour, day_type)
        x = venues[self.feature_names]

        log_predictions = self.model.predict(x)
        predicted_ridership = np.exp(log_predictions)
        scores = self._scale_to_score(predicted_ridership)

        results = []
        for venue_id, score in zip(venues["venue_id"], scores):
            score = int(score)
            results.append(
                {
                    "venue_id": venue_id,
                    "busyness_score": score,
                    "busyness_label": self._label(score),
                }
            )

        return results

    def predict_one(self, venue, hour, day_type):
        return self.predict_many(venue, hour, day_type)[0]


def load_busyness_predictor(
    model_path="data-ml/models/busyness_predictor.joblib",
):
    return joblib.load(model_path)
