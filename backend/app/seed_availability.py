from datetime import date, time

from .database import SessionLocal
from .models import AvailabilitySlot


def seed_availability():

    db = SessionLocal()

    slot1 = AvailabilitySlot(
        venue_id="osm_296568074",
        date=date(2026, 6, 15),
        start_time=time(9, 0),
        end_time=time(12, 0),
        available=True,
        available_seats=10,
    )

    slot2 = AvailabilitySlot(
        venue_id="osm_305499273",
        date=date(2026, 6, 15),
        start_time=time(9, 0),
        end_time=time(12, 0),
        available=False,
        available_seats=0,
    )

    db.add(slot1)
    db.add(slot2)

    db.commit()

    db.close()

    print("Availability seeded")


if __name__ == "__main__":
    seed_availability()
