"""Motorcycle garage endpoint tests."""

VALID = {"manufacturer": "Honda", "model": "CB500F", "year": 2020, "odometer": 12000}


def test_create_and_list_motorcycle(client):
    created = client.post("/api/motorcycles", json=VALID)
    assert created.status_code == 201
    assert created.json()["manufacturer"] == "Honda"

    listed = client.get("/api/motorcycles")
    assert listed.status_code == 200
    assert len(listed.json()) == 1


def test_reject_impossible_year(client):
    response = client.post("/api/motorcycles", json={**VALID, "year": 1200})
    assert response.status_code == 422


def test_delete_missing_motorcycle_returns_404(client):
    assert client.delete("/api/motorcycles/999").status_code == 404
