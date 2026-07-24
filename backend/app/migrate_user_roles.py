import argparse

from sqlalchemy import text

from .database import engine


def get_role_column_status(connection):
    user_count = connection.execute(text("SELECT COUNT(*) FROM users")).scalar_one()
    role_exists = connection.execute(
        text(
            "SELECT EXISTS ("
            "SELECT 1 FROM information_schema.columns "
            "WHERE table_schema = 'public' "
            "AND table_name = 'users' "
            "AND column_name = 'role'"
            ")"
        )
    ).scalar_one()

    return user_count, role_exists


def migrate_user_roles(apply=False):
    with engine.connect() as connection:
        user_count, role_exists = get_role_column_status(connection)

    print(f"Existing users: {user_count}")
    print(f"Role column exists: {role_exists}")

    if not apply:
        print("Dry run complete. No database changes were made.")
        return

    with engine.begin() as connection:
        connection.execute(
            text(
                "ALTER TABLE users "
                "ADD COLUMN IF NOT EXISTS role "
                "VARCHAR NOT NULL DEFAULT 'user'"
            )
        )
        connection.execute(
            text(
                "UPDATE users SET role = 'user' "
                "WHERE role IS NULL "
                "OR role NOT IN ('user', 'provider')"
            )
        )

    print("User role migration completed successfully.")


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    migrate_user_roles(apply=args.apply)
