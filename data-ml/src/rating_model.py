import pandas as pd
import sqlite3
import numpy as np

def apply_to_venues(db_path):
    con = sqlite3.connect(db_path)
    venues = pd.read_sql("SELECT * from venues", con)

    synth_ratings = np.random.normal(loc=3.5, scale=1, size=len(venues))

    synth_ratings = np.round(synth_ratings, 1)

    venues["rating"] = np.clip(synth_ratings, 0 , 5)

    venues["rating_user_reported"] = None

    venues.to_sql("venues", con, if_exists="replace", index=False)
    venues.to_csv("data/processed/nyc_venues", index=False)
    con.close()