import argparse

from sqlalchemy import inspect, text

from .database import engine
from .models import RefreshSession


def migrate_refresh_sessions(apply=False):
    with engine.connect() as connection:
        table_exists = inspect(connection).has_table("refresh_sessions")
        session_count = (
            connection.execute(
                text("SELECT COUNT(*) FROM refresh_sessions")
            ).scalar_one()
            if table_exists
            else 0
        )

    print(f"Refresh sessions table exists: {table_exists}")
    print(f"Existing refresh sessions: {session_count}")

    if not apply:
        print("Dry run complete. No database changes were made.")
        return

    RefreshSession.__table__.create(bind=engine, checkfirst=True)

    print("Refresh sessions migration completed successfully.")


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    migrate_refresh_sessions(apply=args.apply)
