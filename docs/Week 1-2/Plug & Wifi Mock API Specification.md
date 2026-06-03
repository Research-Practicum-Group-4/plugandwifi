# Plug & Wifi - Mock API Specification (Sprint 1)

## Design Principles

* Use collected feature names whenever possible.
* Avoid unnecessary renaming between Data Collection → Database → Backend → Frontend.
* Separate features into:

  * Display
  * Filtering
  * Machine Learning
* Clearly distinguish:

  * Directly Collected Features
  * Generated Features
  * Future Features
* Exclude public holiday logic from Sprint 1.

---

# Feature Classification

## 1. Display

The feature is shown to users on the screen.

### Directly Collected

* venue_id
* name
* osm_type
* cuisine_type
* cuisine_detail
* phone
* website
* building_number
* street
* zipcode
* opening_hours
* has_wifi
* wifi_free
* hotel_stars

### Generated

* borough
* opening_now
* distance_km
* noise_score
* noise_level
* best_hours_for_work

### Provider Data

* seats_avail
* total_seats

---

## 2. Filtering

The feature is used to narrow down search results.

### Supported Filters

* cuisine_type
* borough
* has_wifi
* wifi_free
* opening_now
* noise_level

### Future Filters

* nearest_subway_m
* nearest_bus_m
* actual_hourly_price
* rating_user_reported

---

## 3. Machine Learning

The feature is used for venue ranking and recommendation.

### ML Features

* cuisine_type
* cuisine_detail
* borough
* distance_km
* opening_now
* has_wifi
* wifi_free
* noise_score
* hourly_profile
* best_hours_for_work
* seats_avail
* total_seats

### Future ML Features

* nearest_subway_m
* nearest_bus_m
* actual_hourly_price
* rating
* rating_user_reported
* wifi_user_reported
* plug_user_reported
* inferred_wifi

---

# Venue List API

## GET /api/venues

### Query Parameters

| Parameter    | Type    |
| ------------ | ------- |
| cuisine_type | string  |
| borough      | string  |
| has_wifi     | boolean |
| wifi_free    | boolean |
| opening_now  | boolean |
| noise_level  | string  |
| sort_by      | string  |

### Example

GET /api/venues?has_wifi=true&opening_now=true

### Response

```json
[
  {
    "venue_id": "osm_12345",
    "name": "Starbucks Ranelagh",
    "cuisine_type": "Coffee/Tea",
    "distance_km": 0.8,
    "has_wifi": true,
    "wifi_free": true,
    "opening_now": true,
    "noise_score": 0.44,
    "noise_level": "moderate",
    "seats_avail": 12,
    "total_seats": 20
  }
]
```

---

# Venue Detail API

## GET /api/venues/{venue_id}

### Response

```json
{
  "venue_id": "osm_12345",
  "name": "Starbucks Ranelagh",
  "osm_type": "cafe",

  "cuisine_type": "Coffee/Tea",
  "cuisine_detail": "coffee_shop",

  "phone": "+353100000000",
  "website": "https://example.ie",

  "building_number": "12",
  "street": "Main Street",
  "zipcode": "D06 ABC1",
  "borough": "Dublin South",

  "lat": 53.309,
  "lon": -6.255,

  "opening_hours": "Mo-Su 08:00-22:00",
  "opening_now": true,

  "has_wifi": true,
  "wifi_free": true,

  "hotel_stars": null,

  "noise_score": 0.44,
  "noise_level": "moderate",

  "hourly_profile": {
    "08": {
      "score": 0.80,
      "label": "loud"
    },
    "14": {
      "score": 0.44,
      "label": "moderate"
    }
  },

  "best_hours_for_work": [10, 14, 15, 16],

  "distance_km": 0.8,

  "seats_avail": 12,
  "total_seats": 20
}
```

---

# Availability API

## GET /api/venues/{venue_id}/availability

```json
{
  "venue_id": "osm_12345",
  "available_slots": [
    {
      "slot_id": 1,
      "start_time": "09:00",
      "end_time": "10:00",
      "available": true
    }
  ]
}
```

---

# Booking API

## POST /api/bookings

### Request

```json
{
  "venue_id": "osm_12345",
  "slot_id": 1,
  "duration_hours": 1
}
```

### Response

```json
{
  "booking_id": 101,
  "status": "confirmed",
  "message": "Booking created successfully."
}
```

---

# Future Features (Not Included in Sprint 1)

## Transportation

* nearest_subway
* nearest_subway_m
* nearest_bus
* nearest_bus_m

## Pricing

* hourly_price
* actual_hourly_price

## Ratings

* rating
* rating_user_reported

## WiFi & Plug Crowdsourcing

* wifi_user_reported
* plug_user_reported
* inferred_wifi

## Infrastructure

* outlet_density

---

# Generated Features

| Feature             | Generated From          |
| ------------------- | ----------------------- |
| borough             | lat, lon                |
| distance_km         | user location, lat, lon |
| opening_now         | opening_hours           |
| noise_score         | cuisine_type            |
| noise_level         | noise_score             |
| hourly_profile      | cuisine_type            |
| best_hours_for_work | hourly_profile          |

---

# Directly Collected Features

* venue_id
* name
* osm_type
* cuisine_type
* cuisine_detail
* phone
* website
* building_number
* street
* zipcode
* lat
* lon
* opening_hours
* has_wifi
* wifi_free
* hotel_stars

---

# Provider Features

* seats_avail
* total_seats
