import pandas as pd
from sodapy import Socrata


client = Socrata("data.ny.gov", None, timeout=300)

output = "data/processed/mta_ridership_hourly.csv"
first_month = True

for month in pd.period_range("2024-01", "2026-04", freq="M"):
    start = month.start_time.strftime("%Y-%m-%dT%H:%M:%S")
    end = (month + 1).start_time.strftime("%Y-%m-%dT%H:%M:%S")
    dataset_id = "wujg-7c2s" if month.year == 2024 else "5wq4-mkjj"

    print(f"Downloading MTA ridership for {month}")

    results = client.get_all(
        dataset_id,
        select=(
            "station_complex_id, station_complex, borough, latitude, "
            "longitude, date_trunc_ymd(transit_timestamp) AS date, "
            "date_extract_hh(transit_timestamp) AS hour, "
            "sum(ridership) AS total_ridership, "
            "case(date_extract_dow(transit_timestamp) IN (0,6), "
            "'weekend', true, 'weekday') AS day_type"
        ),
        where=(
            f"transit_timestamp >= '{start}' "
            f"AND transit_timestamp < '{end}'"
        ),
        group=(
            "station_complex_id, station_complex, borough, latitude, "
            "longitude, date_trunc_ymd(transit_timestamp), "
            "date_extract_hh(transit_timestamp), "
            "case(date_extract_dow(transit_timestamp) IN (0,6), "
            "'weekend', true, 'weekday')"
        ),
        order=(
            "date_trunc_ymd(transit_timestamp), "
            "date_extract_hh(transit_timestamp), station_complex_id"
        ),
        limit=50000,
    )

    results_df = pd.DataFrame.from_records(results)

    if results_df.empty:
        raise RuntimeError(f"No MTA ridership data returned for {month}")

    for col in ["total_ridership", "latitude", "longitude", "hour"]:
        results_df[col] = pd.to_numeric(results_df[col])

    results_df["date"] = pd.to_datetime(results_df["date"]).dt.date

    results_df.to_csv(
        output,
        mode="w" if first_month else "a",
        header=first_month,
        index=False,
    )

    first_month = False
    print(f"Saved {len(results_df):,} rows for {month}")
