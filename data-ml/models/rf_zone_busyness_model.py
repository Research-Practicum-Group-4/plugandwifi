import math

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score


df = pd.read_csv("data/processed/zone_activity_hourly.csv",usecols=["zone_id", "date", "hour", "busyness_score"])

df["date"] = pd.to_datetime(df["date"])
df["day_of_week"] = df["date"].dt.dayofweek
df["month"] = df["date"].dt.month
df["is_weekend"] = (df["day_of_week"] >= 5).astype(int)

df["hour_sin"] = np.sin(2 * np.pi * df["hour"] / 24)
df["hour_cos"] = np.cos(2 * np.pi * df["hour"] / 24)
df["day_sin"] = np.sin(2 * np.pi * df["day_of_week"] / 7)
df["day_cos"] = np.cos(2 * np.pi * df["day_of_week"] / 7)
df["month_sin"] = np.sin(2 * np.pi * df["month"] / 12)
df["month_cos"] = np.cos(2 * np.pi * df["month"] / 12)

train_df = df[df["date"] < "2025-01-01"].copy()
test_df = df[(df["date"] >= "2025-01-01") & (df["date"] < "2026-01-01")].copy()

feat = [
    "zone_id",
    "is_weekend",
    "hour_sin",
    "hour_cos",
    "day_sin",
    "day_cos",
    "month_sin",
    "month_cos",
]

x_train = train_df[feat]
y_train = train_df["busyness_score"]

x_test = test_df[feat]
y_test = test_df["busyness_score"]

rf_model = RandomForestRegressor(
    n_estimators=25,
    max_features=6,
    min_samples_leaf=50,
    random_state=1,
    n_jobs=-1
)
rf_model.fit(x_train, y_train)
rf_pred = rf_model.predict(x_test)

print("Random Forest Regressor")
print(f"MAE: {mean_absolute_error(y_test, rf_pred)}")
print(f"RMSE: {math.sqrt(mean_squared_error(y_test, rf_pred))}")
print(f"r2: {r2_score(y_test, rf_pred)}")

final_model = RandomForestRegressor(
    n_estimators=25,
    max_features=6,
    min_samples_leaf=50,
    random_state=1,
    n_jobs=-1
)
final_model.fit(df[feat], df["busyness_score"])

joblib.dump(
    {
        "model": final_model,
        "feature_names": feat,
        "target": "busyness_score",
        "known_zone_ids": sorted(df["zone_id"].unique().tolist())
    },
    "data-ml/models/zone_busyness_model.joblib"
)
