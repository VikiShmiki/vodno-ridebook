"""Statistics aggregation tests."""

RIDE = {
    "date": "2026-05-14",
    "weather": "sunny",
    "distance_km": 20.0,
    "traffic_rating": 2,
    "road_quality_rating": 4,
    "road_cleanliness_rating": 3,
    "enjoyment_rating": 5,
}


def test_stats_on_empty_database(client):
    stats = client.get("/api/stats").json()

    assert stats["total_rides"] == 0
    assert stats["avg_road_quality"] is None
    assert stats["rides_by_month"] == []


def test_stats_aggregates_rides_and_reports(client):
    client.post("/api/rides", json=RIDE)
    client.post("/api/rides", json={**RIDE, "date": "2026-06-02", "road_quality_rating": 2})
    client.post(
        "/api/reports",
        json={
            "category": "gravel",
            "latitude": 41.99,
            "longitude": 21.41,
            "description": "Gravel.",
            "severity": "low",
        },
    )

    stats = client.get("/api/stats").json()

    assert stats["total_rides"] == 2
    assert stats["total_distance_km"] == 40.0
    assert stats["avg_road_quality"] == 3.0
    assert stats["open_reports"] == 1
    assert stats["rides_by_month"] == [
        {"month": "2026-05", "rides": 1},
        {"month": "2026-06", "rides": 1},
    ]
    assert stats["reports_by_category"] == {"gravel": 1}
    assert len(stats["best_rides"]) == 2
