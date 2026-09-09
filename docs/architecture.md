# Architecture and design decisions

## 1. Application architecture

```text
┌──────────────────────────────────────────────────────────────────┐
│                            Browser                               │
│                React SPA (Vite build, served statically)         │
└───────────────────────────────┬──────────────────────────────────┘
                                │  HTTP, relative /api/... paths
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Routing layer (per environment)               │
│  dev: Vite proxy   ·   compose: nginx   ·   k8s: Ingress         │
└───────────────┬───────────────────────────┬──────────────────────┘
                │ "/"                       │ "/api"
                ▼                           ▼
   ┌────────────────────────┐   ┌────────────────────────────┐
   │  Static bundle (nginx) │   │  FastAPI (uvicorn, :8000)  │
   │  index.html, JS, CSS   │   │  routers → services → ORM  │
   └────────────────────────┘   └─────────────┬──────────────┘
                                              │ SQLAlchemy 2.0 (psycopg 3)
                                              ▼
                                 ┌────────────────────────┐
                                 │     PostgreSQL 16      │
                                 │ motorcycles · rides ·  │
                                 │      road_reports      │
                                 └────────────────────────┘
```

### Data model

```text
motorcycles                rides                          road_reports
-----------                -----                          ------------
id            PK   ┌────<  id                 PK          id            PK
manufacturer       │      date                            category
model              │      time                            latitude
year               │      motorcycle_id  FK ──┘           longitude
odometer           │      weather                         description
created_at         │      distance_km                     severity
                   │      traffic_rating                  resolved
                   │      road_quality_rating             created_at
                   │      road_cleanliness_rating
                   │      enjoyment_rating
                   │      notes
                   └───── created_at
```

`rides.motorcycle_id` is nullable with `ON DELETE SET NULL`: a ride is still a
valid record after the bike it was ridden on is removed from the garage.

---

## 2. Kubernetes architecture

```text
                            Internet / laptop
                                    │
                          http://vodno.local
                                    │
                      ┌─────────────▼──────────────┐
                      │   ingress-nginx controller │
                      │   Ingress: vodno-ingress   │
                      └──────┬──────────────┬──────┘
                        "/"  │              │  "/api"
                             ▼              ▼
              ┌────────────────────┐  ┌────────────────────┐
              │  Service frontend  │  │  Service backend   │
              │  ClusterIP :80     │  │  ClusterIP :8000   │
              └─────────┬──────────┘  └─────────┬──────────┘
                        │                       │
        ┌───────────────┴─────┐     ┌───────────┴───────────┐
        ▼                     ▼     ▼                       ▼
  ┌───────────┐        ┌───────────┐ ┌───────────┐   ┌───────────┐
  │ frontend  │        │ frontend  │ │  backend  │   │  backend  │
  │  pod (1)  │        │  pod (2)  │ │  pod (1)  │   │  pod (2)  │
  └───────────┘        └───────────┘ └─────┬─────┘   └─────┬─────┘
   nginx :8080          nginx :8080        │               │
   probe /healthz       probe /healthz     └───────┬───────┘
                                                   │ probe /api/health
                                        ┌──────────▼──────────┐
                                        │  Service postgres   │
                                        │  headless (None)    │
                                        └──────────┬──────────┘
                                                   │
                                        ┌──────────▼──────────┐
                                        │     postgres-0      │
                                        │     StatefulSet     │
                                        └──────────┬──────────┘
                                                   │
                                        ┌──────────▼──────────┐
                                        │  PVC data-postgres-0│
                                        │  1Gi, ReadWriteOnce │
                                        └─────────────────────┘

  Configuration:  ConfigMap vodno-config ──► backend, frontend
  Credentials:    Secret    vodno-secret ──► backend, postgres
  Namespace:      vodno-ridebook (everything above)
```

---

## 3. Design decisions

### Relative API paths instead of a build-time API URL

A Vite build normally bakes `VITE_API_URL` into the JavaScript bundle, which
means one image per environment. Instead the frontend always requests
`/api/...` and the routing layer resolves it. One image runs unchanged in
development, Compose and Kubernetes — exactly the property a CI/CD pipeline
needs, since the image tested in CI is the image that reaches the cluster.

### `/api/health` checks the database

The endpoint executes `SELECT 1` and returns `503` when it fails. Combined with
the readiness probe this means a backend pod that has lost its database is
removed from the Service endpoints instead of returning errors to users. The
liveness probe uses the same path but with a much higher failure threshold, so a
brief database blip does not restart otherwise healthy pods.

### Startup bootstrap under a PostgreSQL advisory lock

Both backend replicas start simultaneously and both run schema creation and
optional seeding. During testing this produced duplicated demo data — 12 rides
instead of 6. Schema creation and seeding now run inside
`pg_advisory_lock(4711)`, so exactly one replica performs the work and the
others find it already done. The lock is released automatically if the holding
process dies.

`Base.metadata.create_all()` is used rather than Alembic. For a schema this
size it keeps the project explainable, and the advisory lock removes the
concurrency problem that would otherwise argue for a migration tool. A
production system with evolving schemas would use Alembic in an init container.

### PostgreSQL as a StatefulSet

A Deployment gives pods random names and, on rescheduling, a new pod with no
guaranteed relationship to the old volume. The StatefulSet gives a stable
identity (`postgres-0`) and a `volumeClaimTemplates` entry that binds the same
PersistentVolumeClaim on every restart. Section 7 of
[demos.md](demos.md) shows the data surviving a pod deletion.

### `maxUnavailable: 0` plus a `preStop` drain hook

Endpoint removal and `SIGTERM` are delivered to a terminating pod at the same
time, so for a short window the Ingress can still route to a pod that has begun
shutting down. Measured across a rolling update, this cost exactly one failed
request. A five-second `preStop` sleep gives kube-proxy and the Ingress
controller time to drop the pod first; the failure count is then zero.

### Container hardening

Both application images run as non-root (`uid 1001` for the backend,
`uid 101` for nginx-unprivileged), with `readOnlyRootFilesystem: true`,
`allowPrivilegeEscalation: false` and all capabilities dropped. The writable
paths each service genuinely needs — `/tmp` for the backend, and
`/etc/nginx/conf.d`, `/var/cache/nginx` and `/tmp` for nginx — are mounted as
`emptyDir` volumes.

### Schematic map instead of a tile map

The road reports page draws the road as an SVG polyline and snaps each report
onto it by projecting its coordinates. This avoids an external map dependency,
an API key and roughly 150 kB of JavaScript, which suits a project whose focus
is the delivery pipeline rather than cartography.

---

## 4. Known limitations

- **No authentication.** Anyone who can reach the Ingress can post or delete a
  report. Adding it was explicitly out of scope for the first version.
- **Single PostgreSQL replica.** The StatefulSet is not a replicated cluster,
  so the database is a single point of failure; only the stateless tiers are
  highly available.
- **`SEED_DATA=true` in the demo ConfigMap.** Convenient for a presentation,
  but a real deployment would leave it off.
- **`kubectl apply -f k8s/` resets the image tag** to the value in the
  manifests. The CD workflow therefore applies manifests before running
  `kubectl set image`. A GitOps tool such as Argo CD, with the tag committed to
  the repository, would remove this ordering constraint.
- **The ingress hostname `vodno.local`** requires an `/etc/hosts` entry; there
  is no public DNS record.
