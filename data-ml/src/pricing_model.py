import sqlite3
import pandas as pd
import numpy as np

def apply_to_venues(db_path):

    con = sqlite3.connect(db_path)
    venues = pd.read_sql("SELECT * from venues", con)
    
    synth_prices = np.random.normal(loc=9, scale=4, size=len(venues))

    venues["hourly_price"] = np.clip(np.round(synth_prices, 2), 0, None)

    venues["actual_hourly_price"] = None

    venues.to_sql("venues", con, index=False, if_exists="replace")
    venues.to_csv("data/processed/nyc_venues.csv", index=False)
    con.close()


if __name__ == "__main__":
    apply_to_venues("data/processed/venues.db")