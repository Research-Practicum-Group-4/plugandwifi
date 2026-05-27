import sqlite3
import requests
import pandas as pd

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
NYC_BBOX     = "40.477,-74.259,40.917,-73.700" 

OUTPUT_DB  = "data/processed/venues.db"
OUTPUT_CSV = "data/processed/nyc_venues.csv"

OSM_TYPE_MAP = {
    "cafe":       "Coffee/Tea",
    "hotel":      "Hotel Lobby",
    "bakery":     "Bakery Products/Desserts",
    "restaurant": "Restaurant",
}

def fetch_from_osm() -> list[dict]:
    query = f"""
    [out:json][timeout:60];
    (
      node["amenity"="cafe"]({NYC_BBOX});
      way["amenity"="cafe"]({NYC_BBOX});
      node["tourism"="hotel"]({NYC_BBOX});
      way["tourism"="hotel"]({NYC_BBOX});
      node["shop"="bakery"]({NYC_BBOX});
      way["shop"="bakery"]({NYC_BBOX});
      node["amenity"="restaurant"]({NYC_BBOX});
      way["amenity"="restaurant"]({NYC_BBOX});
    );
    out center tags;
    """
    headers = {"User-Agent": "WorkshareApp/1.0 (workspace booking research)"}
    print("Querying OpenStreetMap...")
    resp = requests.post(OVERPASS_URL, data={"data": query}, headers=headers, timeout=120)
    resp.raise_for_status()
    elements = resp.json().get("elements", [])
    print(f"  Raw elements: {len(elements):,}")
    return elements



def parse_elements(elements: list[dict]) -> pd.DataFrame:
    rows = []
    for el in elements:
        tags = el.get("tags", {})

        # In case of node and way.
        lat = el.get("lat") or el.get("center", {}).get("lat")
        lon = el.get("lon") or el.get("center", {}).get("lon")
        if not lat or not lon:
            continue

        if tags.get("amenity") == "cafe":
            osm_type = "cafe"
        elif tags.get("tourism") == "hotel":
            osm_type = "hotel"
        elif tags.get("shop") == "bakery":
            osm_type = "bakery"
        elif tags.get("amenity") == "restaurant":
            osm_type = "restaurant"
        else:
            continue

        # OSM gives internet_access=wlan for wifi
        wifi_tag = tags.get("internet_access", "").lower()
        if wifi_tag in ("wlan", "yes"):
            has_wifi = True
        elif wifi_tag == "no":
            has_wifi = False
        else:
            has_wifi = None

        wifi_free = None
        if tags.get("internet_access:fee", "").lower() == "no":
            wifi_free = True
        elif tags.get("internet_access:fee", "").lower() == "yes":
            wifi_free = False

        rows.append({
            "venue_id": f"osm_{el['id']}",
            "name": tags.get("name", "Unnamed"),
            "osm_type": osm_type,
            "cuisine_type": OSM_TYPE_MAP[osm_type],
            "cuisine_detail": tags.get("cuisine", ""),
            "phone": tags.get("phone", tags.get("contact:phone", "")),
            "website": tags.get("website", tags.get("contact:website", "")),
            "building_number": tags.get("addr:housenumber", ""),
            "street": tags.get("addr:street", ""),
            "zipcode": tags.get("addr:postcode", ""),
            "lat": float(lat),
            "lon": float(lon),
            "opening_hours": tags.get("opening_hours", None),
            "has_wifi": has_wifi,
            "wifi_free": wifi_free,
            "outdoor_seating": tags.get("outdoor_seating", None),
            "hotel_stars": tags.get("stars", None),   
            "outlet_density":  None,   
            "noise_level": None,   
            "noise_score": None,
            "best_hours_for_work": None,
            "hourly_profile": None,
            "partner": False,
            "data_source": "openstreetmap",
        })

    df = pd.DataFrame(rows).drop_duplicates(subset="venue_id").reset_index(drop=True)
    print(df)
    return df


def assign_borough(df: pd.DataFrame) -> pd.DataFrame:
    def borough(row):
        lat, lon = row["lat"], row["lon"]
        if lon < -74.15:
            return "Staten Island"
        if lat > 40.78 and lon < -73.90:
            return "Bronx"
        if lat < 40.66:
            return "Brooklyn"
        if lon > -73.93:
            return "Queens"
        return "Manhattan"
    df["borough"] = df.apply(borough, axis=1)
    return df

def save(df: pd.DataFrame) -> None:
    con = sqlite3.connect(OUTPUT_DB)
    df.to_sql("venues", con, if_exists="replace", index=False)
    df.to_csv(OUTPUT_CSV, index=False)
    con.close()
    print(f"  Saved {len(df):,} venues → {OUTPUT_DB}")





if __name__ == "__main__":
    elements = fetch_from_osm()
    df       = parse_elements(elements)
    df       = assign_borough(df)

    print(f"\nVenue breakdown:")
    print(df["cuisine_type"].value_counts().to_string())

    print(f"\nWiFi data available for {df['has_wifi'].notna().sum()} venues")
    print(f"Opening hours available for {df['opening_hours'].notna().sum()} venues")

    save(df)

    # Runnig noise_model.py
    print("\nApplying noise model...")
    import sys
    sys.path.insert(0, "src")
    from noise_model import apply_to_venues
    apply_to_venues(OUTPUT_DB)

    print("\nSample:")
    con = sqlite3.connect(OUTPUT_DB)
    sample = pd.read_sql("""
        SELECT name, cuisine_type, borough, noise_level, has_wifi, opening_hours
        FROM venues
        ORDER BY RANDOM()
        LIMIT 12
    """, con)
    con.close()
    print(sample.to_string(index=False))
