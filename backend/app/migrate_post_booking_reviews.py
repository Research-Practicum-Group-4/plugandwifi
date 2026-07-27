import argparse

from sqlalchemy import inspect, text

from .database import engine
from .models import PostBookingReview


def migrate_post_booking_reviews(apply=False):
    with engine.connect() as connection:
        inspector = inspect(connection)
        table_exists = inspector.has_table("post_booking_reviews")
        existing_columns = (
            {column["name"] for column in inspector.get_columns("post_booking_reviews")}
            if table_exists
            else set()
        )
        review_count = (
            connection.execute(text("SELECT COUNT(*) FROM post_booking_reviews")).scalar_one()
            if table_exists
            else 0
        )

    print(f"Post-booking reviews table exists: {table_exists}")
    print(f"Existing reviews: {review_count}")
    print(f"Existing columns: {', '.join(sorted(existing_columns)) or 'none'}")

    if not apply:
        print("Dry run complete. No database changes were made.")
        return

    PostBookingReview.__table__.create(bind=engine, checkfirst=True)

    with engine.begin() as connection:
        connection.execute(
            text("ALTER TABLE post_booking_reviews ADD COLUMN IF NOT EXISTS comment TEXT")
        )

    print("Post-booking reviews migration completed successfully.")


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    migrate_post_booking_reviews(apply=args.apply)
