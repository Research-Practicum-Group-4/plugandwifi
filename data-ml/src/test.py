import pandas as pd

df = pd.read_csv("data/processed/nyc_venues.csv")

coverage = (df.notna().sum() / len(df) * 100).round(1)
print(coverage.to_string())