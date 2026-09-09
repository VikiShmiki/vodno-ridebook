"""Health endpoint tests. This endpoint backs every Docker and Kubernetes probe."""


def test_health_reports_healthy_with_database(client):
    response = client.get("/api/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "healthy"
    assert body["database"] == "connected"
    assert body["version"]


def test_root_endpoint_describes_service(client):
    response = client.get("/")

    assert response.status_code == 200
    assert "version" in response.json()


def test_openapi_schema_is_served(client):
    assert client.get("/api/openapi.json").status_code == 200


def test_seeding_is_idempotent(client):
    """Seeding twice must not duplicate the demo data."""
    from app.core.seed import seed_if_empty

    seed_if_empty()
    first = len(client.get("/api/rides", params={"limit": 200}).json())
    seed_if_empty()
    second = len(client.get("/api/rides", params={"limit": 200}).json())

    assert first > 0
    assert first == second
