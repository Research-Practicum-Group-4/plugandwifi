import argparse

from sqlalchemy import text

from .database import engine


def get_venue_listing_column_status(connection):
    venue_count = connection.execute(
        text("SELECT COUNT(*) FROM venues")
    ).scalar_one()
    column_rows = connection.execute(
        text(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_schema = 'public' "
            "AND table_name = 'venues' "
            "AND column_name IN "
            "('seat_capacity', 'amenity_tags', 'rules_text')"
        )
    ).all()
    existing_columns = {
        column_name
        for column_name, in column_rows
    }

    return venue_count, existing_columns


def migrate_venue_listing_fields(apply=False):
    with engine.connect() as connection:
        venue_count, existing_columns = get_venue_listing_column_status(
            connection
        )

    print(f"Existing venues: {venue_count}")
    print(
        "Existing listing columns: "
        f"{', '.join(sorted(existing_columns)) or 'none'}"
    )

    if not apply:
        print("Dry run complete. No database changes were made.")
        return

    with engine.begin() as connection:
        connection.execute(
            text(
                "ALTER TABLE venues "
                "ADD COLUMN IF NOT EXISTS seat_capacity INTEGER"
            )
        )
        connection.execute(
            text(
                "ALTER TABLE venues "
                "ADD COLUMN IF NOT EXISTS amenity_tags TEXT"
            )
        )
        connection.execute(
            text(
                "ALTER TABLE venues "
                "ADD COLUMN IF NOT EXISTS rules_text TEXT"
            )
        )

    print("Venue listing fields migration completed successfully.")


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    migrate_venue_listing_fields(apply=args.apply)
