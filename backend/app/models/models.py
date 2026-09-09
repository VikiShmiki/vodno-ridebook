"""ORM models for motorcycles, rides and road reports."""

from datetime import UTC, datetime
from datetime import date as date_type
from datetime import time as time_type

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text, Time
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def _utcnow() -> datetime:
    return datetime.now(UTC)


class Motorcycle(Base):
    __tablename__ = "motorcycles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    manufacturer: Mapped[str] = mapped_column(String(80), nullable=False)
    model: Mapped[str] = mapped_column(String(80), nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    odometer: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    rides: Mapped[list["Ride"]] = relationship(back_populates="motorcycle")


class Ride(Base):
    __tablename__ = "rides"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    date: Mapped[date_type] = mapped_column(Date, nullable=False, index=True)
    time: Mapped[time_type | None] = mapped_column(Time, nullable=True)
    motorcycle_id: Mapped[int | None] = mapped_column(
        ForeignKey("motorcycles.id", ondelete="SET NULL"), nullable=True
    )
    weather: Mapped[str] = mapped_column(String(32), nullable=False)
    distance_km: Mapped[float | None] = mapped_column(Float, nullable=True)
    traffic_rating: Mapped[int] = mapped_column(Integer, nullable=False)
    road_quality_rating: Mapped[int] = mapped_column(Integer, nullable=False)
    road_cleanliness_rating: Mapped[int] = mapped_column(Integer, nullable=False)
    enjoyment_rating: Mapped[int] = mapped_column(Integer, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    motorcycle: Mapped[Motorcycle | None] = relationship(back_populates="rides")


class RoadReport(Base):
    __tablename__ = "road_reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    category: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[str] = mapped_column(String(16), nullable=False)
    resolved: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
