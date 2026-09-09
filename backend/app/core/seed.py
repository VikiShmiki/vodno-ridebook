"""Optional demo data, inserted only when the database is still empty.

Enabled with SEED_DATA=true so a freshly started Docker Compose or Kubernetes
environment shows a populated dashboard during the demonstration.
"""

import logging
from datetime import date, time, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models import Motorcycle, Ride, RoadReport

logger = logging.getLogger(__name__)

# Coordinates along the road from Skopje up to Sredno Vodno.
_REPORTS = [
    (
        "gravel",
        41.9906,
        21.4098,
        "Loose gravel spread across the outside of the second hairpin.",
        "high",
    ),
    (
        "damaged_asphalt",
        41.9938,
        21.4051,
        "Pothole in the right wheel track just after the bus stop.",
        "medium",
    ),
    (
        "wet_road",
        41.9971,
        21.3999,
        "Water running across the road from the spring, slippery in the shade.",
        "medium",
    ),
    (
        "roadworks",
        41.9885,
        21.4143,
        "Single lane traffic control near the lower parking area.",
        "low",
    ),
    (
        "animals",
        42.0012,
        21.3958,
        "Stray dogs on the roadside close to the upper viewpoint.",
        "medium",
    ),
]

_RIDES = [
    (0, "sunny", 24.0, 4, 4, 3, 5, "Clear evening run, road mostly clean."),
    (6, "cloudy", 21.5, 3, 3, 3, 4, "Busy with cyclists on the lower section."),
    (13, "rain", 18.0, 4, 2, 2, 3, "Wet and greasy, took it very easy."),
    (27, "sunny", 26.5, 5, 4, 4, 5, "Best ride so far, empty road early in the morning."),
    (41, "wind", 20.0, 4, 3, 3, 4, "Strong crosswind near the top."),
    (55, "fog", 16.0, 5, 3, 3, 3, "Very poor visibility above the halfway point."),
]


def seed_if_empty() -> None:
    session: Session = SessionLocal()
    try:
        if session.scalar(select(func.count(Ride.id))):
            logger.info("Seed skipped: rides table already populated")
            return

        motorcycle = Motorcycle(manufacturer="Yamaha", model="MT-07", year=2021, odometer=18400)
        session.add(motorcycle)
        session.flush()

        today = date.today()
        for days_ago, weather, distance, quality, traffic, clean, enjoyment, notes in _RIDES:
            session.add(
                Ride(
                    date=today - timedelta(days=days_ago),
                    time=time(18, 30),
                    motorcycle_id=motorcycle.id,
                    weather=weather,
                    distance_km=distance,
                    road_quality_rating=quality,
                    traffic_rating=traffic,
                    road_cleanliness_rating=clean,
                    enjoyment_rating=enjoyment,
                    notes=notes,
                )
            )

        for category, latitude, longitude, description, severity in _REPORTS:
            session.add(
                RoadReport(
                    category=category,
                    latitude=latitude,
                    longitude=longitude,
                    description=description,
                    severity=severity,
                )
            )

        session.commit()
        logger.info("Seeded %s demo rides and %s demo reports", len(_RIDES), len(_REPORTS))
    finally:
        session.close()
