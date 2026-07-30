import pandas as pd
import numpy as np
from sklearn.neighbors import NearestNeighbors
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import math
import re

df = pd.read_csv("data/processed/mta_ridership.csv")

df["log_avg_ridership"] = np.log(df["avg_ridership"])



rng = np.random.default_rng(50)

station_ids = df["station_complex_id"].unique()
n_test = int(0.2 * len(station_ids))
test_ids = rng.choice(station_ids, size=n_test, replace=False)

test_df  = df[df["station_complex_id"].isin(test_ids)].copy()
train_df = df.drop(test_df.index).copy()

train_stations = train_df[["station_complex_id", "latitude", "longitude"]].drop_duplicates().reset_index(drop=True)

K=1

knn = NearestNeighbors(n_neighbors=K).fit(train_stations[["latitude", "longitude"]].to_numpy())

lookup = train_df.set_index(["station_complex_id", "hour", "day_type"])["log_avg_ridership"]

def predict(lat, lon, hour, day_type, k=K):
    dists, idxs = knn.kneighbors([[lat, lon]], n_neighbors = k)
    dists, idxs = dists[0], idxs[0]

    vals, weights = [], []
    for d, i in zip(dists, idxs):
        sid = train_stations.loc[i, "station_complex_id"]
        key = (sid, hour, day_type)
        if key in lookup.index:
            vals.append(lookup.loc[key])
            weights.append(1.0/(d + 1e-12))
    
    if not vals:
        return np.nan
    return np.exp(np.average(vals, weights=weights))




test_df["pred_knn"] = test_df.apply(
    lambda r: predict(r["latitude"], r["longitude"], r["hour"], r["day_type"], k=10), axis=1)

test_df["pred_baseline"] = test_df.apply(
    lambda r: predict(r["latitude"], r["longitude"], r["hour"], r["day_type"], k=1), axis=1)

def mae(pred, actual):
    m = pred.notna() & actual.notna()
    return mean_absolute_error(actual[m], pred[m])


print(round(mae(test_df["pred_baseline"], test_df["avg_ridership"]), 1))
print(round(mae(test_df["pred_knn"], test_df["avg_ridership"]), 1))

valid = test_df["pred_knn"].notna() & test_df["avg_ridership"].notna()
y_true = test_df.loc[valid, "avg_ridership"]
y_pred = test_df.loc[valid, "pred_knn"]

print(round(math.sqrt(mean_squared_error(y_true, y_pred)), 1))
print(round(r2_score(y_true, y_pred), 3))
