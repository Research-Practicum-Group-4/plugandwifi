# There is a lot of difficulty with getting access to wifi data for premises. From OSM, only 867/approx 13,000 have wifi data. The workaround is to use the info provided by OSM but where there is NaN values, replace them with the following system: Assume that all cafes and hotels have wifi (inferred column). Create a column called wifi_user_reported which will allow users to report whether the venue had wifi during their visit. Once this data is collected, it will override the inferred value.

import sqlite3
import pandas as pd


WIFI_INFERRED: dict[str, bool | None] = {
    "Coffee/Tea": True,
    "Hotel Lobby": True,
    "Bakery Products/Desserts": None,
    "Restaurant": None,
}


def infer_wifi(cuisine: str) -> bool | None:
    return WIFI_INFERRED.get(cuisine)


def apply_to_venues(db_path: str = "data/processed/venues.db") -> pd.DataFrame:
    con    = sqlite3.connect(db_path)
    venues = pd.read_sql("SELECT * FROM venues", con)

    venues["inferred_wifi"] = venues["cuisine_type"].apply(infer_wifi).astype("boolean")
    venues["wifi_user_reported"] = pd.array([pd.NA] * len(venues), dtype="boolean")

    venues.to_sql("venues", con, if_exists="replace", index=False)
    venues.to_csv("data/processed/nyc_venues.csv", index=False)
    con.close()

    confirmed = venues["has_wifi"].notna().sum()
    inferred  = venues["inferred_wifi"].notna().sum()
    print(f"OSM-confirmed wifi: {confirmed:,} venues")
    print(f"Inferred wifi: {inferred:,} venues")
    print(f"Unknown: {(venues['inferred_wifi'].isna() & venues['has_wifi'].isna()).sum():,} venues")
    return venues


if __name__ == "__main__":
    df = apply_to_venues()
