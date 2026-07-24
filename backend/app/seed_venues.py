import argparse
import csv
from pathlib import Path

from sqlalchemy import select, text
from sqlalchemy.dialects.postgresql import insert

from .database import SessionLocal
from .models import Venue

DEFAULT_CSV_PATH = (
    Path(__file__).resolve().parents[1] / "data" / "raw" / "nyc_venues.csv"
)

CSV_COLUMNS = (
    "venue_id",
    "name",
    "osm_type",
    "cuisine_type",
    "cuisine_detail",
    "phone",
    "website",
    "building_number",
    "street",
    "zipcode",
    "lat",
    "lon",
    "opening_hours",
    "has_wifi",
    "best_hours_for_work",
    "hourly_profile",
    "partner",
    "borough",
    "inferred_wifi",
    "wifi_user_reported",
    "nearest_subway",
    "nearest_subway_m",
    "nearest_bus",
    "nearest_bus_m",
    "plug_access",
    "plug_user_reported",
    "rating",
    "rating_user_reported",
    "hourly_price",
    "actual_hourly_price",
    "plug_norm",
    "wifi_norm",
    "rating_norm",
    "bus_norm",
    "train_norm",
)

TEXT_COLUMNS = (
    "name",
    "osm_type",
    "cuisine_type",
    "cuisine_detail",
    "phone",
    "website",
    "building_number",
    "street",
    "zipcode",
    "opening_hours",
    "best_hours_for_work",
    "hourly_profile",
    "borough",
    "nearest_subway",
    "nearest_bus",
)

BOOLEAN_COLUMNS = (
    "has_wifi",
    "inferred_wifi",
    "wifi_user_reported",
    "plug_user_reported",
)

INTEGER_COLUMNS = ("partner", "nearest_subway_m", "nearest_bus_m", "plug_access")

FLOAT_COLUMNS = (
    "lat",
    "lon",
    "rating",
    "rating_user_reported",
    "hourly_price",
    "actual_hourly_price",
    "plug_norm",
    "wifi_norm",
    "rating_norm",
    "bus_norm",
    "train_norm",
)

NORMALIZED_COLUMNS = ("plug_norm", "wifi_norm", "rating_norm", "bus_norm", "train_norm")


def clean_text(value):
    if value is None:
        return None

    value = value.strip()
    return value or None


def clean_bool(value):
    if value is None:
        return None

    value = value.strip().lower()

    if not value:
        return None
    if value in {"1", "1.0", "true", "yes"}:
        return True
    if value in {"0", "0.0", "false", "no"}:
        return False

    raise ValueError(f"Invalid boolean value: {value}")


def clean_int(value):
    if value is None:
        return None

    value = value.strip()
    return None if not value else int(float(value))


def clean_float(value):
    if value is None:
        return None

    value = value.strip()
    return None if not value else float(value)


def build_record(row, row_number):
    venue_id = clean_text(row["venue_id"])

    if not venue_id:
        raise ValueError(f"Row {row_number} has no venue_id.")

    record = {"venue_id": venue_id}

    for column in TEXT_COLUMNS:
        record[column] = clean_text(row[column])
    for column in BOOLEAN_COLUMNS:
        record[column] = clean_bool(row[column])
    for column in INTEGER_COLUMNS:
        record[column] = clean_int(row[column])
    for column in FLOAT_COLUMNS:
        record[column] = clean_float(row[column])

    for column in NORMALIZED_COLUMNS:
        value = record[column]
        if value is None or not 0 <= value <= 1:
            raise ValueError(f"Row {row_number} has invalid {column}: {value}")

    return record


def load_records(csv_path):
    records = []
    seen_ids = set()

    with csv_path.open("r", encoding="utf-8-sig", newline="") as csv_file:
        reader = csv.DictReader(csv_file)
        missing_columns = set(CSV_COLUMNS) - set(reader.fieldnames or [])

        if missing_columns:
            missing = ", ".join(sorted(missing_columns))
            raise ValueError(f"CSV is missing required columns: {missing}")

        for row_number, row in enumerate(reader, start=2):
            record = build_record(row, row_number)
            venue_id = record["venue_id"]

            if venue_id in seen_ids:
                raise ValueError(f"Duplicate venue_id at row {row_number}: {venue_id}")

            seen_ids.add(venue_id)
            records.append(record)

    return records


def add_normalized_columns(db):
    for column in NORMALIZED_COLUMNS:
        db.execute(
            text(
                f"ALTER TABLE venues ADD COLUMN IF NOT EXISTS {column} DOUBLE PRECISION"
            )
        )
    db.commit()


def upsert_batch(db, records):
    statement = insert(Venue.__table__).values(records)
    update_columns = {
        column: getattr(statement.excluded, column)
        for column in CSV_COLUMNS
        if column != "venue_id"
    }
    db.execute(
        statement.on_conflict_do_update(
            index_elements=[Venue.venue_id], set_=update_columns
        )
    )
    db.commit()


def seed_venues(csv_path=DEFAULT_CSV_PATH, apply=False, batch_size=500):
    if batch_size < 1:
        raise ValueError("batch-size must be at least 1.")

    csv_path = Path(csv_path).resolve()
    records = load_records(csv_path)
    venue_ids = {record["venue_id"] for record in records}

    with SessionLocal() as db:
        existing_ids = set(
            db.scalars(select(Venue.venue_id).where(Venue.venue_id.in_(venue_ids)))
        )

        insert_count = len(venue_ids - existing_ids)
        update_count = len(existing_ids)

        print(f"CSV validated: {len(records)} venues")
        print(f"Expected inserts: {insert_count}")
        print(f"Expected updates: {update_count}")

        if not apply:
            print("Dry run complete. No database changes were made.")
            return

        add_normalized_columns(db)

        for start in range(0, len(records), batch_size):
            batch = records[start : start + batch_size]
            upsert_batch(db, batch)
            print(f"Processed {min(start + batch_size, len(records))} venues")

    print("Venue import completed successfully.")


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv", type=Path, default=DEFAULT_CSV_PATH)
    parser.add_argument("--batch-size", type=int, default=500)
    parser.add_argument("--apply", action="store_true")
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()

    seed_venues(csv_path=args.csv, apply=args.apply, batch_size=args.batch_size)
