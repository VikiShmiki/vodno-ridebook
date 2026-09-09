#!/usr/bin/env bash
# Demonstration: Kubernetes replaces a deleted backend pod while the API keeps
# answering through the surviving replica.
set -euo pipefail

NAMESPACE="${NAMESPACE:-vodno-ridebook}"
HOST="${HOST:-vodno.local}"
URL="${URL:-http://127.0.0.1/api/health}"

echo "==> Backend pods before"
kubectl get pods -n "$NAMESPACE" -l app=backend -o wide

VICTIM="$(kubectl get pods -n "$NAMESPACE" -l app=backend -o jsonpath='{.items[0].metadata.name}')"
echo
echo "==> Polling the API in the background while '$VICTIM' is deleted"

(
  for _ in $(seq 1 60); do
    if curl -fsS -m 2 -H "Host: ${HOST}" "$URL" >/dev/null 2>&1; then echo -n "."; else echo -n "X"; fi
    sleep 0.5
  done
) &
POLLER=$!

kubectl delete pod "$VICTIM" -n "$NAMESPACE" --wait=false
wait "$POLLER"
echo

echo
echo "==> Backend pods after (a replacement is created automatically)"
kubectl get pods -n "$NAMESPACE" -l app=backend -o wide

echo
echo "==> Final API check"
curl -fsS -H "Host: ${HOST}" "$URL"; echo
echo
echo "Legend: '.' = request served, 'X' = request failed"
