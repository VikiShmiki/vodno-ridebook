#!/usr/bin/env bash
# Demonstration: a new image tag is rolled out with zero downtime.
#
#   ./scripts/demo-rolling-update.sh v2
set -euo pipefail

TAG="${1:-v2}"
NAMESPACE="${NAMESPACE:-vodno-ridebook}"
REGISTRY="${REGISTRY:-ghcr.io/vikishmiki}"
CLUSTER="${CLUSTER:-vodno}"
HOST="${HOST:-vodno.local}"
URL="${URL:-http://127.0.0.1/api/health}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

IMAGE="${REGISTRY}/vodno-backend:${TAG}"

echo "==> Building and loading ${IMAGE}"
docker build -t "$IMAGE" "${ROOT}/backend"
kind load docker-image "$IMAGE" --name "$CLUSTER"

echo
echo "==> Image currently running"
kubectl get deployment backend -n "$NAMESPACE" -o jsonpath='{.spec.template.spec.containers[0].image}{"\n"}'

echo
echo "==> Rolling out while polling the API"
(
  for _ in $(seq 1 80); do
    if curl -fsS -m 2 -H "Host: ${HOST}" "$URL" >/dev/null 2>&1; then echo -n "."; else echo -n "X"; fi
    sleep 0.5
  done
) &
POLLER=$!

kubectl -n "$NAMESPACE" set image deployment/backend "backend=${IMAGE}"
kubectl -n "$NAMESPACE" rollout status deployment/backend --timeout=300s
wait "$POLLER"
echo

echo
echo "==> Rollout history"
kubectl -n "$NAMESPACE" rollout history deployment/backend
echo
echo "==> Image now running"
kubectl get deployment backend -n "$NAMESPACE" -o jsonpath='{.spec.template.spec.containers[0].image}{"\n"}'
echo
echo "Roll back with: kubectl -n ${NAMESPACE} rollout undo deployment/backend"
echo "Legend: '.' = request served, 'X' = request failed"
