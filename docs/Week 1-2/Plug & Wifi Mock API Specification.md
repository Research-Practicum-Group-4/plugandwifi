# Plug & Wifi - Mock API Specification (Sprint 1 Final)

---

# Design Principles

* Use collected feature names whenever possible.
* Avoid unnecessary renaming between Data Collection, Database, Backend, Frontend, and ML.
* Separate features into:

  * Display
  * Filtering
  * Machine Learning
* Clearly distinguish:

  * Directly Collected Features
  * Generated Features
  * Future Features
* Exclude public holiday logic from Sprint 1.
* Use mock values where real data is not yet available.

---

# Feature Classification

## 1. Display

The feature is shown to users on the screen to provide information.

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

### Sprint 1

* cuisine_type
* borough
* has_wifi
* wifi_free
* opening_now
* noise_level

### Future

* nearest_subway_m
* nearest_bus_m
* actual_hourly_price
* rating_user_reported

---

## 3. Machine Learning

The feature is used to improve recommendations and help provide more suitable venues to users.

### Sprint 1

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

### Future

* nearest_subway_m
* nearest_bus_m
* actual_hourly_price
* rating
* rating_user_reported
* wifi_user_reported
* plug_user_reported
* inferred_wifi

---

# Database Schema

## users

```sql
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## providers

```sql
CREATE TABLE providers (
    provider_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id),

    company_name TEXT,
    contact_email TEXT,
    contact_phone TEXT,

    verified BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## venues

```sql
CREATE TABLE venues (
    venue_id TEXT PRIMARY KEY,

    name TEXT,
    osm_type TEXT,

    cuisine_type TEXT,
    cuisine_detail TEXT,

    phone TEXT,
    website TEXT,

    building_number TEXT,
    street TEXT,
    zipcode TEXT,

    borough TEXT,

    lat DECIMAL(9,6),
    lon DECIMAL(9,6),

    opening_hours TEXT,
    opening_now BOOLEAN,

    has_wifi BOOLEAN,
    wifi_free BOOLEAN,

    hotel_stars TEXT,

    noise_score DECIMAL(4,3),
    noise_level TEXT,

    hourly_profile JSONB,
    best_hours_for_work JSONB,

    distance_km DECIMAL(5,2),

    seats_avail INTEGER,
    total_seats INTEGER
);
```

---

## availability_slots

```sql
CREATE TABLE availability_slots (
    slot_id SERIAL PRIMARY KEY,

    venue_id TEXT REFERENCES venues(venue_id),

    start_time TIMESTAMP,
    end_time TIMESTAMP,

    available BOOLEAN DEFAULT TRUE
);
```

---

## bookings

```sql
CREATE TABLE bookings (
    booking_id SERIAL PRIMARY KEY,

    user_id INTEGER REFERENCES users(user_id),

    venue_id TEXT REFERENCES venues(venue_id),

    slot_id INTEGER REFERENCES availability_slots(slot_id),

    duration_hours INTEGER,

    booking_status TEXT DEFAULT 'confirmed',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

# Authentication APIs

## POST /api/auth/register

### Request

```json
{
  "full_name": "Sunmin Lee",
  "email": "sunmin@test.com",
  "password": "123456"
}
```

### Response

```json
{
  "message": "User created successfully"
}
```

---

## POST /api/auth/login

### Request

```json
{
  "email": "sunmin@test.com",
  "password": "123456"
}
```

### Response

```json
{
  "access_token": "mock_jwt_token",
  "user": {
    "user_id": 1,
    "full_name": "Sunmin Lee",
    "email": "sunmin@test.com",
    "role": "user"
  }
}
```

---

## POST /api/auth/logout

### Response

```json
{
  "message": "Logged out successfully"
}
```

---

# User APIs

## GET /api/users/me

### Response

```json
{
  "user_id": 1,
  "full_name": "Sunmin Lee",
  "email": "sunmin@test.com",
  "role": "user"
}
```

---

## GET /api/users/me/bookings

### Response

```json
[
  {
    "booking_id": 101,
    "venue_name": "Starbucks Ranelagh",
    "date": "2026-06-03",
    "start_time": "09:00",
    "end_time": "10:00",
    "status": "confirmed"
  }
]
```

---

# Provider APIs

## GET /api/providers/me

### Response

```json
{
  "provider_id": 1,
  "company_name": "Starbucks Dublin",
  "contact_email": "provider@test.com",
  "contact_phone": "+353100000000",
  "verified": true
}
```

---

## GET /api/providers/me/venues

### Response

```json
[
  {
    "venue_id": "osm_12345",
    "name": "Starbucks Ranelagh",
    "seats_avail": 12,
    "total_seats": 20
  }
]
```

---

## PATCH /api/providers/venues/{venue_id}

### Request

```json
{
  "seats_avail": 15
}
```

### Response

```json
{
  "message": "Venue updated successfully"
}
```

---

# Venue APIs

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

```http
GET /api/venues?has_wifi=true&opening_now=true
```

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
  "zipcode": "D06ABC1",

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

# Availability APIs

## GET /api/venues/{venue_id}/availability

### Response

```json
{
  "venue_id": "osm_12345",
  "available_slots": [
    {
      "slot_id": 1,
      "start_time": "2026-06-03T09:00:00",
      "end_time": "2026-06-03T10:00:00",
      "available": true
    },
    {
      "slot_id": 2,
      "start_time": "2026-06-03T10:00:00",
      "end_time": "2026-06-03T11:00:00",
      "available": false
    }
  ]
}
```

---

# Booking APIs

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
  "message": "Booking created successfully"
}
```

---

## GET /api/bookings/{booking_id}

### Response

```json
{
  "booking_id": 101,
  "user_id": 1,
  "venue_id": "osm_12345",
  "slot_id": 1,
  "duration_hours": 1,
  "booking_status": "confirmed"
}
```

---

## DELETE /api/bookings/{booking_id}

### Response

```json
{
  "booking_id": 101,
  "status": "cancelled"
}
```

---

# Future Features

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

## User Crowdsourced Data

* wifi_user_reported
* plug_user_reported

## ML Generated

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
