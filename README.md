# Vodno Ridebook

A small Waze-style web application for motorcycle riders on the road up to
**Sredno Vodno** in Skopje, built as the project for a *Continuous Integration
and Delivery* course.

Riders report the conditions that actually matter on two wheels — gravel,
standing water, broken asphalt, roadworks, animals — and log their rides with
ratings for road quality, traffic, cleanliness and enjoyment.

The application is intentionally small. The point of the project is the
**DevOps implementation around it**: containerisation, Docker Compose, a
GitHub Actions CI/CD pipeline, a container registry, and a full Kubernetes
deployment with ConfigMaps, Secrets, a StatefulSet, an Ingress, self-healing
and rolling updates.

![Dashboard](docs/images/dashboard.png)

---

## Table of contents

- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Repository layout](#repository-layout)
- [Local development with Docker Compose](#local-development-with-docker-compose)
- [Running without containers](#running-without-containers)
- [API](#api)
- [CI/CD](#cicd)
- [Kubernetes deployment](#kubernetes-deployment)
- [Demonstrations](#demonstrations)
- [Map data and attribution](#map-data-and-attribution)
- [Documentation](#documentation)

---

## Architecture

```text
                         Browser
                            |
                            v
                 +---------------------+
                 |   Ingress (nginx)   |   host: vodno.local
                 +----------+----------+
                     /              \
                    /  "/"           \  "/api"
                   v                  v
        +------------------+   +------------------+
        | Frontend Service |   | Backend Service  |
        |   ClusterIP :80  |   |  ClusterIP :8000 |
        +--------+---------+   +--------+---------+
                 |                      |
        +--------v---------+   +--------v---------+
        |  Frontend Pods   |   |   Backend Pods   |
        |  React + nginx   |   |     FastAPI      |
        |   2 replicas     |   |    2 replicas    |
        +------------------+   +--------+---------+
                                        |
                               +--------v---------+
                               | PostgreSQL Svc   |  headless
                               +--------+---------+
                                        |
                               +--------v---------+
                               |   postgres-0     |
                               |   StatefulSet    |
                               +--------+---------+
                                        |
                               +--------v---------+
                               |       PVC        |  1Gi, ReadWriteOnce
                               +------------------+
```

The frontend never calls the backend by absolute URL. It always requests
relative `/api/...` paths, and the routing layer in front of it decides where
those go:

| Environment    | `/api` is handled by                      |
| -------------- | ----------------------------------------- |
| `npm run dev`  | the Vite dev proxy → `localhost:8000`     |
| Docker Compose | nginx in the frontend container → `backend:8000` |
| Kubernetes     | the Ingress → the backend Service         |

That is why the same image runs unchanged in every environment.

---

## Tech stack

| Layer     | Technology                                                    |
| --------- | ------------------------------------------------------------- |
| Frontend  | React 19, Vite 8, TypeScript, React Router, oxlint, Vitest     |
| Backend   | Python 3.12, FastAPI, SQLAlchemy 2, Pydantic v2, ruff, pytest  |
| Database  | PostgreSQL 16                                                  |
| Runtime   | Docker (multi-stage, non-root), Docker Compose                 |
| CI/CD     | GitHub Actions, GitHub Container Registry                      |
| Orchestr. | Kubernetes (kind for local demos), ingress-nginx               |

---

## Repository layout

```text
vodno-ridebook/
├── backend/                FastAPI application
│   ├── app/
│   │   ├── api/            routers: health, rides, reports, motorcycles, stats
│   │   ├── core/           settings, database, seed data
│   │   ├── models/         SQLAlchemy ORM models
│   │   └── schemas/        Pydantic request/response models
│   ├── tests/              pytest suite
│   └── Dockerfile
├── frontend/               React + Vite application
│   ├── src/
│   │   ├── api/            REST client and data hooks
│   │   ├── components/     shared UI, icon set and the road map
│   │   ├── pages/          Dashboard, Ride log, Road reports, Statistics
│   │   └── test/           Vitest suite
│   ├── src/data/           generated road geometry (OpenStreetMap)
│   ├── nginx/              runtime nginx config template
│   └── Dockerfile
├── k8s/                    Kubernetes manifests
│   └── examples/           Secret template (not applied automatically)
├── scripts/                cluster setup, deployment, demos and report build
├── .github/workflows/      ci.yml and cd.yml
├── docs/                   elaborat, demo guide, diagrams and screenshots
├── docker-compose.yml
└── .env.example
```

---

## Local development with Docker Compose

Prerequisites: Docker and the Compose plugin.

```bash
cp .env.example .env      # adjust POSTGRES_PASSWORD before anything real
docker compose up --build
```

| Service   | URL                             |
| --------- | ------------------------------- |
| Frontend  | <http://localhost:8080>         |
| Backend   | <http://localhost:8000/api/health> |
| API docs  | <http://localhost:8000/api/docs>   |

Compose starts three services:

- **postgres** — PostgreSQL 16 with a named volume `vodno_postgres_data`, so
  data survives `docker compose down`. Health check: `pg_isready`.
- **backend** — waits for postgres to report *healthy* before starting, then
  creates the schema and (with `SEED_DATA=true`) inserts demo data.
- **frontend** — waits for the backend to report *healthy*, then serves the
  static bundle and proxies `/api` to `backend:8000`.

Useful commands:

```bash
docker compose ps                 # service state and health
docker compose logs -f backend    # follow backend logs
docker compose down               # stop, keep the database volume
docker compose down -v            # stop and delete the database volume
```

> If host port 8080 is already taken, set `FRONTEND_PORT` in `.env`.

---

## Running without containers

```bash
# Backend (needs a PostgreSQL instance, or set DATABASE_URL to SQLite)
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
ruff check . && ruff format --check . && pytest
uvicorn app.main:app --reload

# Frontend
cd frontend
npm ci
npm run lint && npx tsc -b && npm test
npm run dev          # http://localhost:5173, proxies /api to localhost:8000
```

---

## API

All endpoints are served under `/api`. Interactive docs: `/api/docs`.

| Method   | Path                     | Description                                  |
| -------- | ------------------------ | -------------------------------------------- |
| `GET`    | `/api/health`            | Health + database connectivity (probe target) |
| `GET`    | `/api/rides`             | List rides, newest first                      |
| `POST`   | `/api/rides`             | Log a ride                                    |
| `GET`    | `/api/rides/{id}`        | Single ride                                   |
| `DELETE` | `/api/rides/{id}`        | Delete a ride                                 |
| `GET`    | `/api/reports`           | Road reports, filterable by `resolved`/`category` |
| `POST`   | `/api/reports`           | Report a road condition                       |
| `PATCH`  | `/api/reports/{id}`      | Update or resolve a report                    |
| `DELETE` | `/api/reports/{id}`      | Delete a report                               |
| `GET`    | `/api/motorcycles`       | List motorcycles                              |
| `POST`   | `/api/motorcycles`       | Add a motorcycle                              |
| `GET`    | `/api/stats`             | Aggregated riding statistics                  |

`GET /api/health` returns `200` when the database answers and `503` when it
does not, so Kubernetes removes an isolated pod from the Service endpoints
instead of routing traffic to it:

```json
{ "status": "healthy", "database": "connected", "version": "1.0.0", "environment": "production" }
```

---

## CI/CD

### When a pull request is opened (`.github/workflows/ci.yml`)

```text
checkout
  ├─ frontend  → npm ci → oxlint → tsc → vitest → vite build → upload dist
  ├─ backend   → pip install → ruff check → ruff format --check
  │              → pytest against a PostgreSQL 16 service container
  │              → OpenAPI schema validation
  ├─ docker    → build the backend and frontend images (matrix, no push)
  └─ compose   → docker compose up --build, curl /healthz and /api/health
```

Nothing is published from a pull request.

### When a commit lands on `main` (`.github/workflows/cd.yml`)

```text
push to main
    ↓
CI gate (ci.yml is re-used via workflow_call — identical checks)
    ↓
build both images with Buildx
    ↓
push to ghcr.io tagged:  latest · <short-sha> · <full-sha>
    ↓
[only if the KUBE_CONFIG secret exists]
kubectl apply -f k8s/  →  kubectl set image  →  kubectl rollout status
```

Published images:

```text
ghcr.io/vikishmiki/vodno-backend:latest
ghcr.io/vikishmiki/vodno-backend:<commit-sha>
ghcr.io/vikishmiki/vodno-frontend:latest
ghcr.io/vikishmiki/vodno-frontend:<commit-sha>
```

**Secrets.** No credential is hardcoded anywhere.

| Secret          | Required | Purpose                                                     |
| --------------- | -------- | ----------------------------------------------------------- |
| `GITHUB_TOKEN`  | built in | Pushes images to GHCR. Provided automatically by Actions.    |
| `KUBE_CONFIG`   | optional | Base64-encoded kubeconfig. When absent, the deploy job is skipped. |

To enable the deployment job:

```bash
base64 -w0 ~/.kube/config | gh secret set KUBE_CONFIG
```

---

## Kubernetes deployment

Everything lives in the **`vodno-ridebook`** namespace.

| Object                          | Kind                  | Notes                                        |
| ------------------------------- | --------------------- | -------------------------------------------- |
| `vodno-ridebook`                | Namespace             | Isolates the whole application                |
| `vodno-config`                  | ConfigMap             | App env, DB host/port/name, CORS, seed flag   |
| `vodno-secret`                  | Secret                | `POSTGRES_USER`, `POSTGRES_PASSWORD`          |
| `postgres`                      | StatefulSet + headless Service | 1 replica, `volumeClaimTemplates` → 1Gi PVC |
| `backend`                       | Deployment + Service + PDB | 2 replicas, probes on `/api/health`       |
| `frontend`                      | Deployment + Service  | 2 replicas, probes on `/healthz`              |
| `vodno-ingress`                 | Ingress               | `vodno.local`, `/api` → backend, `/` → frontend |

### Quick start on a local kind cluster

```bash
./scripts/kind-up.sh                              # 3-node cluster + ingress-nginx
echo '127.0.0.1 vodno.local' | sudo tee -a /etc/hosts
./scripts/deploy-local.sh                         # build, load, deploy, wait
```

Then open <http://vodno.local>.

### Manual deployment

```bash
# 1. Namespace first
kubectl apply -f k8s/namespace.yaml

# 2. The Secret is never committed — generate it (recommended)
kubectl -n vodno-ridebook create secret generic vodno-secret \
  --from-literal=POSTGRES_USER=vodno \
  --from-literal=POSTGRES_PASSWORD="$(openssl rand -base64 24)"
#    ...or copy and edit the template: k8s/examples/secret.example.yaml → k8s/secret.yaml

# 3. Everything else
kubectl apply -f k8s/

# 4. Inspect
kubectl get all -n vodno-ridebook
kubectl get ingress,configmap,secret,pvc -n vodno-ridebook
```

`kubectl` does not recurse into subdirectories, so `k8s/examples/` is never
applied by accident.

> **Note on ordering.** `kubectl apply -f k8s/` resets the image to the tag
> written in the manifests. The CD workflow therefore applies the manifests
> *before* running `kubectl set image`, never after.

---

## Demonstrations

Each demonstration has a script under `scripts/`; step-by-step commands and
recorded output are in **[docs/demos.md](docs/demos.md)**.

| # | What is demonstrated       | How                                      |
| - | -------------------------- | ---------------------------------------- |
| 1 | Full stack on Docker Compose | `docker compose up --build`            |
| 2 | CI pipeline                | Open a pull request, watch the Actions tab |
| 3 | Registry images            | The **Packages** tab of the GitHub repository |
| 4 | Pods, Services, Ingress    | `kubectl get pods,svc,ingress -n vodno-ridebook` |
| 5 | ConfigMap and Secret       | `kubectl exec … -- printenv APP_ENV POSTGRES_HOST` |
| 6 | **Self-healing**           | `./scripts/demo-self-healing.sh`         |
| 7 | **Database persistence**   | `./scripts/demo-persistence.sh`          |
| 8 | **Rolling update**         | `./scripts/demo-rolling-update.sh v2`    |

---

## Map data and attribution

The map is not a decorative squiggle: it draws the **real centreline of the
road** up to Sredno Vodno, derived from **OpenStreetMap** data
(© OpenStreetMap contributors, [ODbL 1.0](https://opendatacommons.org/licenses/odbl/)).

The geometry is fetched once and committed to the repository, so the running
application never calls a third-party service and the build works offline:

```bash
python3 scripts/fetch-road-geometry.py   # rewrites frontend/src/data/vodnoRoad.ts
```

The 5.25 km climb is stored as 100 points, simplified with Douglas-Peucker to
under one pixel of error at the size the map is drawn.

---

## Documentation

- **[docs/elaborat.md](docs/elaborat.md)** — the project report (the graded deliverable),
  also rendered to [`docs/elaborat.pdf`](docs/elaborat.pdf) (10 pages)
- **[docs/demos.md](docs/demos.md)** — full demonstration guide with recorded output
- **[docs/architecture.md](docs/architecture.md)** — diagrams and design decisions

Rebuild the PDF after editing the report:

```bash
python3 -m pip install markdown
./scripts/build-elaborat.sh
```
