#!/usr/bin/env bash
# Demonstration: data written to PostgreSQL survives deletion of the database
# pod, because the StatefulSet re-attaches the same PersistentVolumeClaim.
set -euo pipefail

NAMESPACE="${NAMESPACE:-vodno-ridebook}"
HOST="${HOST:-vodno.local}"
BASE="${BASE:-http://127.0.0.1/api}"
MARKER="persistence-check-$(date +%s)"

api() { curl -fsS -H "Host: ${HOST}" "$@"; }

echo "==> Writing a ride tagged '${MARKER}'"
api -X POST "${BASE}/rides" -H 'Content-Type: application/json' -d "{
  \"date\": \"$(date +%F)\",
  \"weather\": \"sunny\",
  \"distance_km\": 21,
  \"traffic_rating\": 3,
  \"road_quality_rating\": 4,
  \"road_cleanliness_rating\": 4,
  \"enjoyment_rating\": 5,
  \"notes\": \"${MARKER}\"
}" > /dev/null

BEFORE="$(api "${BASE}/stats" | python3 -c 'import json,sys; print(json.load(sys.stdin)["total_rides"])')"
echo "    total rides before: ${BEFORE}"

echo
echo "==> PersistentVolumeClaim in use"
kubectl get pvc -n "$NAMESPACE"

echo
echo "==> Deleting the PostgreSQL pod"
kubectl delete pod postgres-0 -n "$NAMESPACE"
kubectl wait --for=condition=Ready pod/postgres-0 -n "$NAMESPACE" --timeout=300s

echo
echo "==> Waiting for the API to reconnect"
for _ in $(seq 1 60); do
  api "${BASE}/health" >/dev/null 2>&1 && break
  sleep 2
done

AFTER="$(api "${BASE}/stats" | python3 -c 'import json,sys; print(json.load(sys.stdin)["total_rides"])')"
FOUND="$(api "${BASE}/rides?limit=200" | python3 -c "import json,sys; print(sum(1 for r in json.load(sys.stdin) if r['notes'] == '${MARKER}'))")"

echo
echo "    total rides after : ${AFTER}"
echo "    marker rides found: ${FOUND}"
[[ "$BEFORE" == "$AFTER" && "$FOUND" == "1" ]] \
  && echo "PASS: the data survived the pod deletion" \
  || { echo "FAIL: data was lost"; exit 1; }
