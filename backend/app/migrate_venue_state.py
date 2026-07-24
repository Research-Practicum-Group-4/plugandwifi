import argparse

from sqlalchemy import text

from .database import engine


def get_venue_state_column_status(connection):
    venue_count = connection.execute(text("SELECT COUNT(*) FROM venues")).scalar_one()
    state_exists = connection.execute(
        text(
            "SELECT EXISTS ("
            "SELECT 1 FROM information_schema.columns "
            "WHERE table_schema = 'public' "
            "AND table_name = 'venues' "
            "AND column_name = 'state'"
            ")"
        )
    ).scalar_one()

    return venue_count, state_exists


def migrate_venue_state(apply=False):
    with engine.connect() as connection:
        venue_count, state_exists = get_venue_state_column_status(connection)

    print(f"Existing venues: {venue_count}")
    print(f"State column exists: {state_exists}")

    if not apply:
        print("Dry run complete. No database changes were made.")
        return

    with engine.begin() as connection:
        connection.execute(
            text(
                "ALTER TABLE venues "
                "ADD COLUMN IF NOT EXISTS state "
                "VARCHAR NOT NULL DEFAULT 'Active'"
            )
        )
        connection.execute(
            text("UPDATE venues SET state = 'Active' WHERE state IS NULL")
        )

    print("Venue state migration completed successfully.")


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    migrate_venue_state(apply=args.apply)
