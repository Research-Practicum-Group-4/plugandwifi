from pathlib import Path

import geopandas as gpd
import pandas as pd
import requests


venue_file = Path("data/processed/nyc_venues.csv")
venues = pd.read_csv(venue_file)
venues = venues.drop(columns=["zone_id"], errors="ignore")

zone_file = Path("data/raw/tlc/taxi_zones.zip")
if not zone_file.exists():
    zone_file.parent.mkdir(parents=True, exist_ok=True)
    response = requests.get("https://d37ci6vzurychx.cloudfront.net/misc/taxi_zones.zip")
    response.raise_for_status()
    zone_file.write_bytes(response.content)

zones = gpd.read_file(f"zip://{zone_file}!taxi_zones/taxi_zones.shp")
zones = zones.rename(columns={"LocationID": "zone_id"})

venue_points = gpd.GeoDataFrame(venues, geometry=gpd.points_from_xy(venues["lon"], venues["lat"]), crs="EPSG:4326").to_crs(zones.crs)

venues = gpd.sjoin(venue_points, zones[["zone_id", "geometry"]], how="left", predicate="within").drop(columns=["geometry", "index_right"])

venues["zone_id"] = venues["zone_id"].astype("Int64")

temporary_file = venue_file.with_suffix(".temporary.csv")
venues.to_csv(temporary_file, index=False)
temporary_file.replace(venue_file)

