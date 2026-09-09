"""Pydantic request and response models."""

from datetime import date as date_type
from datetime import datetime
from datetime import time as time_type

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.enums import ReportCategory, Severity, Weather


class HealthResponse(BaseModel):
    status: str
    database: str
    version: str
    environment: str


# --- Motorcycle ---------------------------------------------------------


class MotorcycleCreate(BaseModel):
    manufacturer: str = Field(min_length=1, max_length=80)
    model: str = Field(min_length=1, max_length=80)
    year: int = Field(ge=1900, le=2100)
    odometer: int = Field(default=0, ge=0)


class MotorcycleRead(MotorcycleCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime


# --- Ride ---------------------------------------------------------------


class RideCreate(BaseModel):
    date: date_type
    time: time_type | None = None
    motorcycle_id: int | None = None
    weather: Weather
    distance_km: float | None = Field(default=None, ge=0, le=1000)
    traffic_rating: int = Field(ge=1, le=5)
    road_quality_rating: int = Field(ge=1, le=5)
    road_cleanliness_rating: int = Field(ge=1, le=5)
    enjoyment_rating: int = Field(ge=1, le=5)
    notes: str | None = Field(default=None, max_length=2000)


class RideRead(RideCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    motorcycle: MotorcycleRead | None = None


# --- Road report --------------------------------------------------------


class RoadReportCreate(BaseModel):
    category: ReportCategory
    # Bounding box around the real road up to Sredno Vodno (the OpenStreetMap
    # centreline spans 41.9727..41.9881 N, 21.4085..21.4288 E), widened by
    # roughly 600 m so a report taken slightly off the centreline still fits.
    latitude: float = Field(ge=41.965, le=41.995)
    longitude: float = Field(ge=21.400, le=21.436)
    description: str = Field(min_length=1, max_length=1000)
    severity: Severity = Severity.MEDIUM


class RoadReportUpdate(BaseModel):
    description: str | None = Field(default=None, min_length=1, max_length=1000)
    severity: Severity | None = None
    resolved: bool | None = None


class RoadReportRead(RoadReportCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    resolved: bool
    created_at: datetime


# --- Statistics ---------------------------------------------------------


class MonthCount(BaseModel):
    month: str
    rides: int


class StatsResponse(BaseModel):
    total_rides: int
    total_distance_km: float
    total_motorcycles: int
    open_reports: int
    resolved_reports: int
    avg_road_quality: float | None
    avg_traffic: float | None
    avg_cleanliness: float | None
    avg_enjoyment: float | None
    rides_by_month: list[MonthCount]
    best_rides: list[RideRead]
    reports_by_category: dict[str, int]
