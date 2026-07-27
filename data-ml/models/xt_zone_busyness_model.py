import math

import numpy as np
import pandas as pd
from sklearn.ensemble import ExtraTreesRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score



df = pd.read_csv("data/processed/zone_activity_hourly.csv", usecols=["zone_id", "date", "hour", "busyness_score"])

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

train_zone_baselines = train_df.groupby("zone_id")["busyness_score"].mean()

train_df["zone_baseline"] = train_df["zone_id"].map(train_zone_baselines)
test_df["zone_baseline"] = test_df["zone_id"].map(train_zone_baselines)

feat = [
    "zone_baseline",
    "is_weekend",
    "hour_sin",
    "hour_cos",
    "day_sin",
    "day_cos",
    "month_sin",
    "month_cos"
]

x_train = train_df[feat]
y_train = train_df["busyness_score"]

x_test = test_df[feat]
y_test = test_df["busyness_score"]

xt_model = ExtraTreesRegressor(
    n_estimators= 25,
    max_features = 6,
    min_samples_leaf = 50,
    random_state = 1,
    n_jobs = -1
)
xt_model.fit(x_train, y_train)
xt_pred = xt_model.predict(x_test)

print("Extra Trees Regressor")
print(f"MAE: {mean_absolute_error(y_test, xt_pred)}")
print(f"RMSE: {math.sqrt(mean_squared_error(y_test, xt_pred))}")
print(f"r2: {r2_score(y_test, xt_pred)}")
