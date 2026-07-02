import pandas as pd
from sodapy import Socrata

client = Socrata("data.ny.gov", None, timeout = 300)

results = client.get("5wq4-mkjj",
                     select = "station_complex_id, station_complex, borough, latitude, longitude, date_extract_hh(transit_timestamp) AS hour, sum(ridership) AS total_ridership, case(date_extract_dow(transit_timestamp) IN (0,6), 'weekend', true, 'weekday') AS day_type, count(distinct date_trunc_ymd(transit_timestamp)) AS num_days",  
                     where = "transit_timestamp >= '2026-03-11T00:00:00'",
                     group = "station_complex_id, station_complex, borough, latitude, longitude, date_extract_hh(transit_timestamp), case(date_extract_dow(transit_timestamp) IN (0,6), 'weekend', true, 'weekday')",
                     limit = 50000
                     )

results_df = pd.DataFrame.from_records(results)

for col in ["total_ridership", "num_days", "latitude", "longitude", "hour"]:
    results_df[col] = pd.to_numeric(results_df[col])

results_df["avg_ridership"] = results_df["total_ridership"] / results_df["num_days"]

results_df.to_csv("data/processed/mta_ridership.csv", index = False)