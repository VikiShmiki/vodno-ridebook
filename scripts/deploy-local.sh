#!/usr/bin/env bash
# Builds both images, loads them into the kind cluster and deploys the whole
# application into the vodno-ridebook namespace.
#
#   ./scripts/deploy-local.sh            # build, load and deploy
#   TAG=v2 ./scripts/deploy-local.sh     # deploy a specific tag (rolling update)
set -euo pipefail

CLUSTER="${CLUSTER:-vodno}"
NAMESPACE="${NAMESPACE:-vodno-ridebook}"
REGISTRY="${REGISTRY:-ghcr.io/vikishmiki}"
TAG="${TAG:-latest}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

BACKEND_IMAGE="${REGISTRY}/vodno-backend:${TAG}"
FRONTEND_IMAGE="${REGISTRY}/vodno-frontend:${TAG}"

echo "==> Building images"
docker build -t "$BACKEND_IMAGE"  "${ROOT}/backend"
docker build -t "$FRONTEND_IMAGE" "${ROOT}/frontend"

echo "==> Loading images into kind cluster '$CLUSTER'"
kind load docker-image "$BACKEND_IMAGE" "$FRONTEND_IMAGE" --name "$CLUSTER"

echo "==> Creating namespace"
kubectl apply -f "${ROOT}/k8s/namespace.yaml"

# The Secret is generated imperatively so no credential is ever committed.
if ! kubectl -n "$NAMESPACE" get secret vodno-secret >/dev/null 2>&1; then
  echo "==> Generating the vodno-secret Secret"
  kubectl -n "$NAMESPACE" create secret generic vodno-secret \
    --from-literal=POSTGRES_USER=vodno \
    --from-literal=POSTGRES_PASSWORD="$(openssl rand -base64 24)"
else
  echo "==> Secret vodno-secret already exists, keeping it"
fi

echo "==> Applying manifests"
kubectl apply -f "${ROOT}/k8s/"

# Only needed when deploying a tag other than the one in the manifests.
if [[ "$TAG" != "latest" ]]; then
  echo "==> Rolling to tag '${TAG}'"
  kubectl -n "$NAMESPACE" set image deployment/backend  "backend=${BACKEND_IMAGE}"
  kubectl -n "$NAMESPACE" set image deployment/frontend "frontend=${FRONTEND_IMAGE}"
fi

echo "==> Waiting for rollouts"
kubectl -n "$NAMESPACE" rollout status statefulset/postgres --timeout=300s
kubectl -n "$NAMESPACE" rollout status deployment/backend  --timeout=300s
kubectl -n "$NAMESPACE" rollout status deployment/frontend --timeout=300s

echo
kubectl get all -n "$NAMESPACE"
echo
echo "Application: http://vodno.local/    (or: curl -H 'Host: vodno.local' http://127.0.0.1/api/health)"
