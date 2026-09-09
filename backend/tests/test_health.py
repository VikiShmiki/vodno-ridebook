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
