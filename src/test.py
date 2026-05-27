import pandas as pd

df = pd.read_csv("data/processed/nyc_venues.csv")

print((df["inferred_wifi"].count()))