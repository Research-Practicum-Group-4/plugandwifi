from pathlib import Path

import geopandas as gpd
import pandas as pd


mta_file = Path("data/processed/mta_ridership_hourly.csv")
mta = pd.read_csv(mta_file)
mta = mta.drop(columns=["zone_id"], errors="ignore")

zone_file = Path("data/raw/tlc/taxi_zones.zip")

zones = gpd.read_file(f"zip://{zone_file}!taxi_zones/taxi_zones.shp")
zones = zones.rename(columns={"LocationID": "zone_id"})

station_locations = mta[["station_complex_id", "latitude", "longitude"]].drop_duplicates()

station_locations = gpd.GeoDataFrame(
    station_locations,
    geometry=gpd.points_from_xy(
        station_locations["longitude"],
        station_locations["latitude"],
    ),
    crs="EPSG:4326"
).to_crs(zones.crs)

station_zones = gpd.sjoin(
    station_locations,
    zones[["zone_id", "geometry"]],
    how="left",
    predicate="within",
)[["station_complex_id", "latitude", "longitude", "zone_id"]]

mta = mta.merge(station_zones, on=["station_complex_id", "latitude", "longitude"])

mta["zone_id"] = mta["zone_id"].astype(int)

mta_by_zone = (
    mta.groupby(
        ["zone_id", "date", "hour", "day_type"],
        as_index=False,
    )["total_ridership"]
    .sum()
    .rename(columns={"total_ridership": "mta_ridership"})
)
mta_by_zone.to_csv(
    "data/processed/mta_zone_hourly.csv",
    index=False
)

temporary_file = mta_file.with_suffix(".temporary.csv")
mta.to_csv(temporary_file, index=False)
temporary_file.replace(mta_file)
