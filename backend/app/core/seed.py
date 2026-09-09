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

# Real coordinates on the road up to Sredno Vodno, taken from the same
# OpenStreetMap centreline the frontend draws. The trailing comment gives the
# distance from the foot of the climb.
_REPORTS = [
    (
        "damaged_asphalt",
        41.98268,
        21.42167,  # 0.8 km
        "Pothole in the right wheel track on the first long straight.",
        "medium",
    ),
    (
        "roadworks",
        41.97708,
        21.42646,  # 1.7 km
        "Single lane traffic control, roughly two kilometres up.",
        "low",
    ),
    (
        "gravel",
        41.97459,
        21.42797,  # 2.6 km
        "Loose gravel washed across the outside of the hairpin.",
        "high",
    ),
    (
        "wet_road",
        41.97599,
        21.41634,  # 4.5 km
        "Water running across the road in the shaded section near the top.",
        "medium",
    ),
    (
        "animals",
        41.97568,
        21.40853,  # 5.2 km, Sredno Vodno
        "Stray dogs on the roadside by the Sredno Vodno parking area.",
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
