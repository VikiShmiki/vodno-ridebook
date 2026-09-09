#!/usr/bin/env python3
"""Regenerate the real geometry of the road up to Sredno Vodno.

The frontend draws the actual road rather than a decorative curve. The shape is
fetched once from OpenStreetMap data (via the public OSRM routing service),
simplified, and written to a TypeScript module that is committed to the
repository - so the application itself never calls a third-party service at
runtime and the build stays reproducible offline.

    python3 scripts/fetch-road-geometry.py

Data source: OpenStreetMap, (c) OpenStreetMap contributors, ODbL 1.0.
"""

from __future__ import annotations

import json
import math
import sys
import urllib.request
from pathlib import Path

# The climb only: from the foot of Salvador Allende, where the road leaves the
# Skopje street grid, up to the Sredno Vodno plateau. The city approach is not
# interesting to a rider and would flatten the interesting part of the map.
START = (41.98807, 21.41768)  # foot of the climb
END = (41.97568, 21.40853)  # Sredno Vodno

OSRM = "https://router.project-osrm.org/route/v1/driving"
# Douglas-Peucker tolerance. At the size the map is drawn one pixel is roughly
# nine metres, so three metres of error is invisible.
EPSILON_METRES = 3.0

OUTPUT = Path(__file__).resolve().parent.parent / "frontend/src/data/vodnoRoad.ts"


def fetch_route() -> tuple[list[tuple[float, float]], float]:
    url = (
        f"{OSRM}/{START[1]},{START[0]};{END[1]},{END[0]}"
        "?overview=full&geometries=geojson"
    )
    with urllib.request.urlopen(url, timeout=60) as response:  # noqa: S310
        payload = json.load(response)

    if payload.get("code") != "Ok":
        raise SystemExit(f"OSRM returned {payload.get('code')}: {payload.get('message')}")

    route = payload["routes"][0]
    points = [(lat, lon) for lon, lat in route["geometry"]["coordinates"]]
    return points, route["distance"]


def _projector(points: list[tuple[float, float]]):
    """Local equirectangular projection to metres, good enough over 5 km."""
    mean_lat = sum(lat for lat, _ in points) / len(points)
    metres_per_deg_lat = 111_320.0
    metres_per_deg_lon = 111_320.0 * math.cos(math.radians(mean_lat))

    def project(point: tuple[float, float]) -> tuple[float, float]:
        return point[1] * metres_per_deg_lon, point[0] * metres_per_deg_lat

    return project


def simplify(points: list[tuple[float, float]], epsilon: float) -> list[tuple[float, float]]:
    project = _projector(points)

    def perpendicular_distance(point, start, end) -> float:
        (px, py), (ax, ay), (bx, by) = project(point), project(start), project(end)
        dx, dy = bx - ax, by - ay
        if dx == 0 and dy == 0:
            return math.hypot(px - ax, py - ay)
        t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
        return math.hypot(px - (ax + t * dx), py - (ay + t * dy))

    def douglas_peucker(chunk):
        if len(chunk) < 3:
            return list(chunk)
        index, furthest = 0, 0.0
        for i in range(1, len(chunk) - 1):
            distance = perpendicular_distance(chunk[i], chunk[0], chunk[-1])
            if distance > furthest:
                index, furthest = i, distance
        if furthest > epsilon:
            return douglas_peucker(chunk[: index + 1])[:-1] + douglas_peucker(chunk[index:])
        return [chunk[0], chunk[-1]]

    sys.setrecursionlimit(10_000)
    return douglas_peucker(points)


def render(points: list[tuple[float, float]], length_metres: float) -> str:
    lats = [lat for lat, _ in points]
    lons = [lon for _, lon in points]
    body = "\n".join(f"  [{lat:.5f}, {lon:.5f}]," for lat, lon in points)

    return f'''/**
 * Real centreline of the road from Skopje up to Sredno Vodno.
 *
 * GENERATED FILE - do not edit by hand.
 * Regenerate with: python3 scripts/fetch-road-geometry.py
 *
 * Derived from OpenStreetMap data, (c) OpenStreetMap contributors, ODbL 1.0.
 * Simplified with Douglas-Peucker at {EPSILON_METRES:.0f} m, which is well under one
 * pixel at the size the map is drawn.
 */

/** Ordered [latitude, longitude] pairs, from the foot of the climb to the top. */
export const ROAD_POINTS: ReadonlyArray<readonly [number, number]> = [
{body}
]

/** Bounding box of the road, used to project coordinates onto the drawing. */
export const ROAD_BOUNDS = {{
  minLat: {min(lats):.5f},
  maxLat: {max(lats):.5f},
  minLon: {min(lons):.5f},
  maxLon: {max(lons):.5f},
}} as const

/** Road length in kilometres, as returned by the routing engine. */
export const ROAD_LENGTH_KM = {length_metres / 1000:.2f}

export const ROAD_START_LABEL = 'Skopje'
export const ROAD_END_LABEL = 'Sredno Vodno'

export const ROAD_ATTRIBUTION = '© OpenStreetMap contributors'
'''


def main() -> int:
    print(f"Fetching the climb {START} -> {END}")
    points, length = fetch_route()
    print(f"  {len(points)} raw points, {length / 1000:.2f} km")

    simplified = simplify(points, EPSILON_METRES)
    print(f"  {len(simplified)} points after simplification at {EPSILON_METRES:.0f} m")

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(render(simplified, length), encoding="utf-8")
    print(f"Wrote {OUTPUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
