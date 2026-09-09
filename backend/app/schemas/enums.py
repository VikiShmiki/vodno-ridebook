"""Controlled vocabularies shared by the API and the frontend."""

from enum import StrEnum


class ReportCategory(StrEnum):
    GRAVEL = "gravel"
    WET_ROAD = "wet_road"
    DAMAGED_ASPHALT = "damaged_asphalt"
    ROADWORKS = "roadworks"
    TRAFFIC = "traffic"
    ANIMALS = "animals"
    POOR_VISIBILITY = "poor_visibility"
    OTHER = "other"


class Severity(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class Weather(StrEnum):
    SUNNY = "sunny"
    CLOUDY = "cloudy"
    RAIN = "rain"
    FOG = "fog"
    WIND = "wind"
    COLD = "cold"
