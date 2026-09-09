"""Road report endpoint tests."""

REPORT = {
    "category": "gravel",
    "latitude": 41.9906,
    "longitude": 21.4098,
    "description": "Loose gravel on the second hairpin.",
    "severity": "high",
}


def test_create_report_defaults_to_unresolved(client):
    response = client.post("/api/reports", json=REPORT)

    assert response.status_code == 201
    assert response.json()["resolved"] is False


def test_resolve_report_via_patch(client):
    report_id = client.post("/api/reports", json=REPORT).json()["id"]

    patched = client.patch(f"/api/reports/{report_id}", json={"resolved": True})
    assert patched.status_code == 200
    assert patched.json()["resolved"] is True


def test_filter_reports_by_resolved_and_category(client):
    client.post("/api/reports", json=REPORT)
    other_id = client.post("/api/reports", json={**REPORT, "category": "roadworks"}).json()["id"]
    client.patch(f"/api/reports/{other_id}", json={"resolved": True})

    assert len(client.get("/api/reports", params={"resolved": False}).json()) == 1
    assert len(client.get("/api/reports", params={"category": "roadworks"}).json()) == 1


def test_coordinates_outside_the_vodno_area_are_rejected(client):
    assert client.post("/api/reports", json={**REPORT, "latitude": 55.0}).status_code == 422


def test_unknown_category_is_rejected(client):
    assert client.post("/api/reports", json={**REPORT, "category": "ufo"}).status_code == 422


def test_delete_report(client):
    report_id = client.post("/api/reports", json=REPORT).json()["id"]

    assert client.delete(f"/api/reports/{report_id}").status_code == 204
    assert client.get("/api/reports").json() == []


def test_coordinates_must_fall_near_the_vodno_road(client):
    """The bounding box is tied to the real OpenStreetMap centreline."""
    on_road = {**REPORT, "latitude": 41.97459, "longitude": 21.42797}  # 2.6 km up
    assert client.post("/api/reports", json=on_road).status_code == 201

    # Skopje city centre is inside Skopje but nowhere near the climb.
    city_centre = {**REPORT, "latitude": 41.9965, "longitude": 21.4314}
    assert client.post("/api/reports", json=city_centre).status_code == 422
