import math

import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

from xgboost import XGBRegressor


df = pd.read_csv( "data/processed/zone_activity_hourly.csv", usecols=["zone_id", "date", "hour", "busyness_score"])

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

xg_model = XGBRegressor(
    n_estimators=300,
    learning_rate=0.03,
    max_depth=8,
    subsample=0.9,
    colsample_bytree=0.9,
    objective="reg:squarederror",
    tree_method="hist",
    random_state=1,
    n_jobs=-1
)
xg_model.fit(x_train, y_train)
xg_pred = xg_model.predict(x_test)

print("XGBoost Regressor")
print(f"MAE: {mean_absolute_error(y_test, xg_pred)}")
print(f"RMSE: {math.sqrt(mean_squared_error(y_test, xg_pred))}")
print(f"r2: {r2_score(y_test, xg_pred)}")
