import sqlite3
import pandas as pd
import numpy as np

probs = {
    "hotel": 0.7, 
    "cafe": 0.35, 
    'restaurant': 0.1,
    "bakery": 0.05
    }

def apply_to_venues(DB_path):
    con = sqlite3.connect("data/processed/venues.db")
    venues = pd.read_sql("SELECT * from venues", con)

    for venue in probs.keys():
        venues.loc[venues["cuisine_type"] == venue, "plug_access"] = np.random.choice([True,False], size = (venues["cuisine_type"] == venue).sum(), p = [probs.get(venue), 1 - probs.get(venue)])
    
    venues["plug_user_reported"] = None

    venues.to_sql("venues", con, if_exists="replace", index=False)
    venues.to_csv("data/processed/nyc_venues.csv", index=False)
    con.close()