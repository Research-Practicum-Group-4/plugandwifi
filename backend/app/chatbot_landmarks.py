import re
import unicodedata

CHATBOT_LANDMARKS = {
    "Times Square": (40.7580, -73.9855),
    "Central Park": (40.7829, -73.9654),
    "Empire State Building": (40.7484, -73.9857),
    "Grand Central Terminal": (40.7527, -73.9772),
    "Bryant Park": (40.7536, -73.9832),
    "Rockefeller Center": (40.7587, -73.9787),
    "Columbus Circle": (40.7681, -73.9819),
    "Union Square": (40.7359, -73.9911),
    "Washington Square Park": (40.7308, -73.9973),
    "Madison Square Park": (40.7420, -73.9880),
    "Flatiron Building": (40.7411, -73.9897),
    "Chelsea Market": (40.7420, -74.0062),
    "The High Line": (40.7480, -74.0048),
    "Hudson Yards": (40.7538, -74.0022),
    "Penn Station": (40.7505, -73.9934),
    "Wall Street": (40.7074, -74.0113),
    "World Trade Center": (40.7126, -74.0099),
    "Battery Park": (40.7033, -74.0170),
    "Columbia University": (40.8075, -73.9626),
    "NYU": (40.7295, -73.9965),
}

CHATBOT_LOCATION_ALIASES = {
    "grand central": "Grand Central Terminal",
    "grand central station": "Grand Central Terminal",
    "high line": "The High Line",
    "new york university": "NYU",
    "nyu campus": "NYU",
    "pennsylvania station": "Penn Station",
    "rockefeller plaza": "Rockefeller Center",
    "wtc": "World Trade Center",
}

CHATBOT_AREA_COORDINATES = {
    "manhattan": (40.7580, -73.9855),
    "midtown": (40.7549, -73.9840),
    "soho": (40.7233, -74.0030),
    "lower manhattan": (40.7075, -74.0113),
    "upper east side": (40.7736, -73.9566),
    "upper west side": (40.7870, -73.9754),
}


def normalize_chatbot_location_name(value: str) -> str:
    ascii_value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", " ", ascii_value.lower()).strip()


def resolve_known_chatbot_location(value: str):
    normalized = normalize_chatbot_location_name(value)
    normalized_landmarks = {
        normalize_chatbot_location_name(name): coordinates
        for name, coordinates in CHATBOT_LANDMARKS.items()
    }

    if normalized in normalized_landmarks:
        return normalized_landmarks[normalized]

    canonical_name = CHATBOT_LOCATION_ALIASES.get(normalized)
    if canonical_name:
        return CHATBOT_LANDMARKS[canonical_name]

    return CHATBOT_AREA_COORDINATES.get(normalized)
