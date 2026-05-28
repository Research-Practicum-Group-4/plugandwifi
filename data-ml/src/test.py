import pandas as pd

df = pd.read_csv("data/processed/nyc_venues.csv")

print((df["has_wifi"] == False).sum())