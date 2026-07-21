# Database Configuration

The backend reads its database connection from `DATABASE_URL`. Copy
`.env.example` to `.env` and provide local secret values without committing the
resulting `.env` file.

PostgreSQL connections use configurable SQLAlchemy pooling and TCP keepalive
settings. The available settings are `DB_POOL_SIZE`, `DB_MAX_OVERFLOW`,
`DB_POOL_RECYCLE`, `DB_POOL_TIMEOUT`, `DB_CONNECT_TIMEOUT`,
`DB_KEEPALIVES_IDLE`, `DB_KEEPALIVES_INTERVAL`, and
`DB_KEEPALIVES_COUNT`.

## Venue Data Import

Run the importer from the `backend` directory. Its default mode validates
`data/raw/nyc_venues.csv` and reports expected inserts and updates without
changing the database.

```bash
python -m app.seed_venues
```

After reviewing the dry-run result, explicitly enable the migration and batched
upsert with:

```bash
python -m app.seed_venues --apply
```

The importer adds missing normalized venue columns and uses `venue_id` as the
PostgreSQL conflict key, so rerunning it does not create duplicate venues.
