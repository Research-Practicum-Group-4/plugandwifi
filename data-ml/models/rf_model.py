import pandas as pd
import numpy as np
from sklearn.preprocessing import LabelEncoder
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import math
import seaborn as sns
import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split
import re

df = pd.read_csv("data/processed/mta_ridership.csv")

df["hour_sin"] = np.sin(2 * np.pi * df["hour"] / 24)
df["hour_cos"] = np.cos(2 * np.pi * df["hour"] / 24)
df["is_morning_peak"] = df["hour"].between(7, 10).astype(int)
df["is_evening_peak"] = df["hour"].between(16, 19).astype(int)
df["is_late_night"] = df["hour"].between(0, 5).astype(int)

def extract_subway_lines(station_complex):
    groups = re.findall(r"\(([^()]*)\)", str(station_complex))

    route_group = groups[-1]
    return [line.strip() for line in route_group.split(",")]

df["subway_lines"] = df["station_complex"].apply(extract_subway_lines)
df["line_count"] = df["subway_lines"].apply(len)

df["day_type"] = df["day_type"].str.lower()

le = LabelEncoder()

df["day_type"] = le.fit_transform(df["day_type"])

df["day_type"] = df["day_type"].astype("category")
df["station_complex_id"] = df["station_complex_id"].astype("category")

### 2nd iteration
df["log_avg_ridership"] = np.log(df["avg_ridership"])

y = df["log_avg_ridership"]
x = df[["latitude","longitude","hour","day_type"]]

###NEED TO HOLD OUT ON ENTIRE STATIONS IN THE TRAIN TEST SPLIT OTHERWISE COMPARING SAME STATIONS AT SLIGHTLY DIFFERENT HOURS AND GIVING INFLATED OOB R VALUE
# x_train, x_test, y_train, y_test = train_test_split(x, y, test_size=0.2, random_state=1)

rng = np.random.default_rng(50)
station_ids = df["station_complex_id"].unique()
n_test = int(0.2 * len(station_ids))
test_ids = rng.choice(station_ids, size=n_test, replace=False)

test_df  = df[df["station_complex_id"].isin(test_ids)].copy()
train_df = df.drop(test_df.index).copy()

train_stations = train_df[["station_complex_id", "latitude", "longitude"]].drop_duplicates().reset_index(drop=True)

feat = ["latitude", "longitude", "day_type", "line_count", "is_morning_peak", "is_evening_peak", "is_late_night", "hour_sin", "hour_cos",]

x_train = train_df[feat]
y_train = train_df["log_avg_ridership"]

x_test  = test_df[feat]
y_test  = test_df["log_avg_ridership"]

model = RandomForestRegressor(n_estimators=500, max_features=5, random_state=1)
rf = model.fit(x_train, y_train)

pred = rf.predict(x_test)

print(mean_absolute_error(y_true=np.exp(y_test), y_pred=np.exp(pred)))
print(math.sqrt(mean_squared_error(y_true=np.exp(y_test), y_pred=np.exp(pred))))
print(r2_score(y_true=np.exp(y_test), y_pred=np.exp(pred)))