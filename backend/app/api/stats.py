"""Aggregated riding statistics for the dashboard and statistics page."""

from collections import Counter

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.core.database import get_db
from app.models import Motorcycle, Ride, RoadReport
from app.schemas import MonthCount, StatsResponse

router = APIRouter(prefix="/stats", tags=["stats"])


def _rounded(value: float | None) -> float | None:
    return round(float(value), 2) if value is not None else None


@router.get("", response_model=StatsResponse)
def get_stats(db: Session = Depends(get_db)) -> StatsResponse:
    averages = db.execute(
        select(
            func.count(Ride.id),
            func.coalesce(func.sum(Ride.distance_km), 0.0),
            func.avg(Ride.road_quality_rating),
            func.avg(Ride.traffic_rating),
            func.avg(Ride.road_cleanliness_rating),
            func.avg(Ride.enjoyment_rating),
        )
    ).one()
    total_rides, total_distance, avg_quality, avg_traffic, avg_clean, avg_enjoy = averages

    open_reports = db.scalar(
        select(func.count(RoadReport.id)).where(RoadReport.resolved.is_(False))
    )
    resolved_reports = db.scalar(
        select(func.count(RoadReport.id)).where(RoadReport.resolved.is_(True))
    )
    total_motorcycles = db.scalar(select(func.count(Motorcycle.id)))

    # Grouping is done in Python so the query stays portable across Postgres
    # and the SQLite database used by the test suite.
    ride_dates = db.scalars(select(Ride.date)).all()
    month_counter = Counter(ride_date.strftime("%Y-%m") for ride_date in ride_dates)
    rides_by_month = [
        MonthCount(month=month, rides=count) for month, count in sorted(month_counter.items())
    ]

    category_rows = db.execute(
        select(RoadReport.category, func.count(RoadReport.id)).group_by(RoadReport.category)
    ).all()

    best_rides = list(
        db.scalars(
            select(Ride)
            .options(selectinload(Ride.motorcycle))
            .order_by(Ride.enjoyment_rating.desc(), Ride.date.desc())
            .limit(3)
        )
    )

    return StatsResponse(
        total_rides=total_rides or 0,
        total_distance_km=round(float(total_distance or 0.0), 1),
        total_motorcycles=total_motorcycles or 0,
        open_reports=open_reports or 0,
        resolved_reports=resolved_reports or 0,
        avg_road_quality=_rounded(avg_quality),
        avg_traffic=_rounded(avg_traffic),
        avg_cleanliness=_rounded(avg_clean),
        avg_enjoyment=_rounded(avg_enjoy),
        rides_by_month=rides_by_month,
        best_rides=best_rides,
        reports_by_category=dict(category_rows),
    )
