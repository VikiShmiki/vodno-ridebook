"""Ride log endpoint tests."""

RIDE = {
    "date": "2026-05-14",
    "time": "18:30:00",
    "weather": "sunny",
    "distance_km": 22.5,
    "traffic_rating": 3,
    "road_quality_rating": 4,
    "road_cleanliness_rating": 4,
    "enjoyment_rating": 5,
    "notes": "Clean road, light traffic.",
}


def test_create_get_and_delete_ride(client):
    created = client.post("/api/rides", json=RIDE)
    assert created.status_code == 201
    ride_id = created.json()["id"]

    fetched = client.get(f"/api/rides/{ride_id}")
    assert fetched.status_code == 200
    assert fetched.json()["enjoyment_rating"] == 5

    assert client.delete(f"/api/rides/{ride_id}").status_code == 204
    assert client.get(f"/api/rides/{ride_id}").status_code == 404


def test_rides_are_returned_newest_first(client):
    client.post("/api/rides", json={**RIDE, "date": "2026-01-10"})
    client.post("/api/rides", json={**RIDE, "date": "2026-06-01"})

    dates = [ride["date"] for ride in client.get("/api/rides").json()]
    assert dates == ["2026-06-01", "2026-01-10"]


def test_rating_outside_one_to_five_is_rejected(client):
    assert client.post("/api/rides", json={**RIDE, "traffic_rating": 9}).status_code == 422


def test_unknown_weather_value_is_rejected(client):
    assert client.post("/api/rides", json={**RIDE, "weather": "hail"}).status_code == 422


def test_ride_cannot_reference_missing_motorcycle(client):
    response = client.post("/api/rides", json={**RIDE, "motorcycle_id": 424242})
    assert response.status_code == 422


def test_ride_embeds_its_motorcycle(client):
    motorcycle_id = client.post(
        "/api/motorcycles",
        json={"manufacturer": "Yamaha", "model": "MT-07", "year": 2021, "odometer": 100},
    ).json()["id"]

    client.post("/api/rides", json={**RIDE, "motorcycle_id": motorcycle_id})

    ride = client.get("/api/rides").json()[0]
    assert ride["motorcycle"]["model"] == "MT-07"
