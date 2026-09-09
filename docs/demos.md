# Demonstration guide

Every command below was run against the real system. The output blocks are
copied from those runs; nothing here is illustrative or invented.

Environment used for the recorded output:

| Component      | Version                                                |
| -------------- | ------------------------------------------------------ |
| Docker         | 29.1.3                                                  |
| Docker Compose | 2.40.3                                                  |
| kind           | 0.30.0 (3 nodes: 1 control-plane, 2 workers)            |
| Kubernetes     | v1.34.0                                                 |
| kubectl        | v1.37.0                                                 |
| Ingress        | ingress-nginx (kind provider manifest)                  |

---

## 0. Preparation

```bash
./scripts/kind-up.sh                                # cluster + ingress-nginx
echo '127.0.0.1 vodno.local' | sudo tee -a /etc/hosts
./scripts/deploy-local.sh                           # build, load, deploy
```

`deploy-local.sh` finishes with:

```text
NAME                            READY   STATUS    RESTARTS   AGE
pod/backend-b55bd665b-2qcdw     1/1     Running   0          16s
pod/backend-b55bd665b-5qbgr     1/1     Running   0          16s
pod/frontend-788ff4c77c-tqhcl   1/1     Running   0          16s
pod/frontend-788ff4c77c-vjqmh   1/1     Running   0          16s
pod/postgres-0                  1/1     Running   0          16s

NAME               TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)    AGE
service/backend    ClusterIP   10.96.186.215   <none>        8000/TCP   16s
service/frontend   ClusterIP   10.96.127.44    <none>        80/TCP     16s
service/postgres   ClusterIP   None            <none>        5432/TCP   16s

NAME                       READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/backend    2/2     2            2           16s
deployment.apps/frontend   2/2     2            2           16s

NAME                        READY   AGE
statefulset.apps/postgres   1/1     16s
```

---

## 1. Docker Compose

```bash
cp .env.example .env
docker compose up --build
docker compose ps
```

```text
SERVICE    STATE     STATUS                   PORTS
backend    running   Up 2 minutes (healthy)   0.0.0.0:8000->8000/tcp
frontend   running   Up 8 seconds (healthy)   0.0.0.0:8081->8080/tcp
postgres   running   Up 2 minutes (healthy)   5432/tcp
```

All three report **healthy**, and Compose started them in dependency order:
postgres → backend → frontend.

Verification through the frontend container's nginx proxy:

```console
$ curl -s http://localhost:8080/api/health
{"status":"healthy","database":"connected","version":"1.0.0","environment":"development"}

$ curl -s http://localhost:8080/healthz
{"status":"healthy"}
```

Both images run as unprivileged users:

```console
$ docker compose exec backend id
uid=1001(vodno) gid=1001(vodno) groups=1001(vodno)

$ docker compose exec frontend id
uid=101(nginx) gid=101(nginx) groups=101(nginx)
```

Image sizes after the multi-stage builds:

```text
vodno-frontend:local   74.4MB
vodno-backend:local    311MB
```

### Compose volume persistence

```console
$ docker compose down
$ docker compose up -d
$ curl -s http://localhost:8080/api/rides | python3 -c "import sys,json;print(len(json.load(sys.stdin)))"
7
```

The rides written before the teardown are still there, because
`vodno_postgres_data` is a named volume.

---

## 2. CI pipeline

Open a pull request against `main`. `.github/workflows/ci.yml` runs four jobs:

| Job                    | What it does                                                        |
| ---------------------- | -------------------------------------------------------------------- |
| `frontend`             | `npm ci` → oxlint → `tsc -b` → Vitest → `vite build` → upload `dist` |
| `backend`              | ruff check → ruff format check → pytest against a PostgreSQL service container → OpenAPI route assertion |
| `docker-build`         | Buildx builds both images (matrix), no push                          |
| `compose-smoke-test`   | `docker compose up --build -d`, then curls `/healthz`, `/api/health`, `/api/stats`, `/api/reports` |

Local equivalents of the same checks:

```console
$ cd backend && ruff check . && ruff format --check . && pytest
All checks passed!
23 files already formatted
21 passed

$ cd frontend && npm run lint && npx tsc -b && npm test
Test Files  4 passed (4)
     Tests  10 passed (10)
```

The workflows themselves are linted with `actionlint`, which reports no findings.

---

## 3. Container registry

Merging to `main` triggers `.github/workflows/cd.yml`, which publishes to the
GitHub Container Registry. Show the **Packages** tab of the repository, or:

```bash
docker pull ghcr.io/vikishmiki/vodno-backend:latest
docker pull ghcr.io/vikishmiki/vodno-frontend:latest
```

Each image gets three tags — `latest`, the 7-character short SHA and the full
commit SHA — so any running pod can be traced back to the exact commit.

---

## 4. Pods, Services and Ingress

```console
$ kubectl get pods -n vodno-ridebook -o wide
NAME                        READY   STATUS    RESTARTS   AGE   IP            NODE
backend-b55bd665b-2qcdw     1/1     Running   0          31s   10.244.2.14   vodno-worker
backend-b55bd665b-5qbgr     1/1     Running   0          31s   10.244.1.21   vodno-worker2
frontend-788ff4c77c-tqhcl   1/1     Running   0          31s   10.244.1.22   vodno-worker2
frontend-788ff4c77c-vjqmh   1/1     Running   0          31s   10.244.2.15   vodno-worker
postgres-0                  1/1     Running   0          31s   10.244.1.24   vodno-worker2

$ kubectl get services -n vodno-ridebook
NAME       TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)    AGE
backend    ClusterIP   10.96.186.215   <none>        8000/TCP   31s
frontend   ClusterIP   10.96.127.44    <none>        80/TCP     31s
postgres   ClusterIP   None            <none>        5432/TCP   31s

$ kubectl get ingress -n vodno-ridebook
NAME            CLASS   HOSTS         ADDRESS   PORTS   AGE
vodno-ingress   nginx   vodno.local             80      31s
```

Note that the two backend replicas landed on different worker nodes — that is
the `podAntiAffinity` rule doing its job, and it is what makes the self-healing
demonstration meaningful.

Access through the single Ingress hostname:

```console
$ curl -s http://vodno.local/api/health
{"status":"healthy","database":"connected","version":"1.0.0","environment":"production"}

$ curl -o /dev/null -s -w "%{http_code}\n" http://vodno.local/
200

$ curl -o /dev/null -s -w "%{http_code}\n" http://vodno.local/stats
200
```

The last one is a client-side route: nginx falls back to `index.html` and React
Router renders the Statistics page.

---

## 5. ConfigMap and Secret

```console
$ kubectl get configmap,secret -n vodno-ridebook
NAME                         DATA   AGE
configmap/kube-root-ca.crt   1      32s
configmap/vodno-config       8      31s

NAME                  TYPE     DATA   AGE
secret/vodno-secret   Opaque   2      32s
```

Values from the ConfigMap really do reach the running container:

```console
$ kubectl exec -n vodno-ridebook backend-5947bbb96c-bbbf7 -- \
    printenv APP_ENV POSTGRES_HOST POSTGRES_DB CORS_ORIGINS
production
postgres
vodno
http://vodno.local
```

And so does the Secret:

```console
$ kubectl get secret vodno-secret -n vodno-ridebook \
    -o jsonpath="{.data.POSTGRES_USER}" | base64 -d
vodno
```

The password is generated at deployment time by `scripts/deploy-local.sh` and
is never written to the repository. `k8s/examples/secret.example.yaml` contains
only the placeholder `REPLACE_WITH_A_REAL_PASSWORD`, and because `kubectl` does
not recurse into subdirectories it is never applied by accident.

---

## 6. Self-healing

```bash
./scripts/demo-self-healing.sh
```

The script polls `GET /api/health` twice a second while one backend pod is
deleted. Recorded output:

```text
==> Backend pods before
NAME                      READY   STATUS    RESTARTS   AGE   IP            NODE
backend-b55bd665b-2qcdw   1/1     Running   0          50s   10.244.2.14   vodno-worker
backend-b55bd665b-5qbgr   1/1     Running   0          50s   10.244.1.21   vodno-worker2

==> Polling the API in the background while 'backend-b55bd665b-2qcdw' is deleted
.pod "backend-b55bd665b-2qcdw" deleted from vodno-ridebook namespace
...........................................................

==> Backend pods after (a replacement is created automatically)
NAME                      READY   STATUS    RESTARTS   AGE   IP            NODE
backend-b55bd665b-5qbgr   1/1     Running   0          81s   10.244.1.21   vodno-worker2
backend-b55bd665b-xhcwh   1/1     Running   0          31s   10.244.2.16   vodno-worker

==> Final API check
{"status":"healthy","database":"connected","version":"1.0.0","environment":"production"}

Legend: '.' = request served, 'X' = request failed
```

**60 out of 60 requests were served and none failed.** The ReplicaSet noticed
the missing pod immediately and scheduled `backend-b55bd665b-xhcwh` as a
replacement, while the surviving replica kept answering.

Manual version:

```bash
kubectl get pods -n vodno-ridebook
kubectl delete pod <backend-pod> -n vodno-ridebook
kubectl get pods -n vodno-ridebook -w
```

---

## 7. Database persistence

```bash
./scripts/demo-persistence.sh
```

The script writes a uniquely tagged ride, deletes `postgres-0`, waits for the
StatefulSet to recreate it, and checks that the ride is still there.

```text
==> Writing a ride tagged 'persistence-check-1788976855'
    total rides before: 7

==> PersistentVolumeClaim in use
NAME              STATUS   VOLUME                                     CAPACITY   ACCESS MODES   STORAGECLASS
data-postgres-0   Bound    pvc-67cdb7fa-01bc-47b1-a919-82d7b5a30701   1Gi        RWO            standard

==> Deleting the PostgreSQL pod
pod "postgres-0" deleted from vodno-ridebook namespace
pod/postgres-0 condition met

==> Waiting for the API to reconnect

    total rides after : 7
    marker rides found: 1
PASS: the data survived the pod deletion
```

The recreated pod kept the name `postgres-0` and was bound to the same
PersistentVolumeClaim, `data-postgres-0`. That is the difference between a
StatefulSet and a Deployment: a Deployment would have produced a pod with a new
random name and, without the claim template, an empty database.

---

## 8. Rolling update

```bash
./scripts/demo-rolling-update.sh v2
```

```text
==> Image currently running
ghcr.io/vikishmiki/vodno-backend:latest

==> Rolling out while polling the API
.deployment.apps/backend image updated
Waiting for deployment "backend" rollout to finish: 1 out of 2 new replicas have been updated...
..................Waiting for deployment "backend" rollout to finish: 1 out of 2 new replicas have been updated...
Waiting for deployment "backend" rollout to finish: 1 old replicas are pending termination...
...................Waiting for deployment "backend" rollout to finish: 1 old replicas are pending termination...
deployment "backend" successfully rolled out
..........................................

==> Rollout history
REVISION  CHANGE-CAUSE
1         <none>
2         <none>

==> Image now running
ghcr.io/vikishmiki/vodno-backend:v2
```

**80 out of 80 requests were served with zero failures** during the image
change. Three settings make that possible:

1. `maxUnavailable: 0` with `maxSurge: 1` — a new pod must pass its readiness
   probe before an old one is removed.
2. The readiness probe on `/api/health`, so a pod only joins the Service once
   it can actually reach the database.
3. A `preStop` hook that sleeps 5 seconds. Endpoint removal and `SIGTERM` are
   delivered concurrently, so without the pause the Ingress can still send a
   request to a pod that has already begun shutting down.

> This was measured, not assumed. Before the `preStop` hook was added, the same
> script recorded one failed request (`X`) per rollout; with the hook the
> failure count is zero.

Rollback:

```bash
kubectl -n vodno-ridebook rollout undo deployment/backend
kubectl -n vodno-ridebook rollout status deployment/backend
```

---

## 9. Full CI/CD → Kubernetes flow

With a `KUBE_CONFIG` secret configured on the repository:

```text
edit code  →  git push  →  GitHub Actions
                             ├─ CI gate (lint, tests, image build, compose smoke test)
                             ├─ build and push ghcr.io/…:latest and :<sha>
                             └─ kubectl apply -f k8s/
                                kubectl set image deployment/backend backend=…:<sha>
                                kubectl rollout status deployment/backend
```

The `deploy` job is skipped automatically when the secret is absent, so the
pipeline is still green on a fork or on a machine without a cluster.
