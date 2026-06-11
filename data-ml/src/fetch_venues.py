import sqlite3
import requests
import pandas as pd

Overpass_url = "https://overpass-api.de/api/interpreter"
NYC_BBOX     = "40.477,-74.259,40.917,-73.700" 

DB  = "data/processed/venues.db"
CSV_out = "data/processed/nyc_venues.csv"

def fetch_from_osm():
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
    
    resp = requests.get(Overpass_url, data={"data": query}, headers={"User-Agent": "Adam"}, timeout=120)
    resp.raise_for_status()
    elements = resp.json().get("elements", [])
    return elements


def parse_elements(elements):
    rows = []
    for el in elements:
        tags = el.get("tags", {})

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

        wifi_tag = tags.get("internet_access", "").lower()
        if wifi_tag in ("wlan", "yes"):
            has_wifi = True
        elif wifi_tag == "no":
            has_wifi = False
        else:
            has_wifi = None

        rows.append({
            "venue_id": f"osm_{el['id']}",
            "name": tags.get("name", "Unnamed"),
            "osm_type": osm_type,
            "cuisine_type": osm_type,
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
            "best_hours_for_work": None,
            "hourly_profile": None,
            "partner": False,
        })

    df = pd.DataFrame(rows)
    print(df)
    return df


def assign_borough(df):
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

def save(df):
    con = sqlite3.connect(DB)
    df.to_sql("venues", con, if_exists="replace", index=False)
    df.to_csv(CSV_out, index=False)
    con.close()


if __name__ == "__main__":
    elements = fetch_from_osm()
    df = parse_elements(elements)
    df = assign_borough(df)

    save(df)

    from noise_model import apply_to_venues as apply_noise
    apply_noise(DB)

    from wifi_model import apply_to_venues as apply_wifi
    apply_wifi(DB)

    from transit_model import apply_to_venues as apply_transit
    apply_transit(DB)

    from plug_model import apply_to_venues as apply_plug
    apply_plug(DB)

    from rating_model import apply_to_venues as apply_ratings
    apply_ratings(DB)

    from pricing_model import apply_to_venues as apply_prices
    apply_prices(DB)
