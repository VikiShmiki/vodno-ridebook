#!/usr/bin/env bash
# Creates the local Kubernetes cluster used for the demonstration:
# a three node kind cluster plus the ingress-nginx controller.
#
#   ./scripts/kind-up.sh
#
# Requires: docker, kind, kubectl.
set -euo pipefail

CLUSTER="${CLUSTER:-vodno}"
INGRESS_MANIFEST="https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml"

if kind get clusters 2>/dev/null | grep -qx "$CLUSTER"; then
  echo "Cluster '$CLUSTER' already exists. Delete it first with: kind delete cluster --name $CLUSTER"
  exit 0
fi

echo "==> Creating kind cluster '$CLUSTER'"
# The control plane publishes host ports 80/443 and carries the ingress-ready
# label; the two workers give the anti-affinity rules something to spread over.
kind create cluster --name "$CLUSTER" --config=- <<YAML
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
  - role: control-plane
    kubeadmConfigPatches:
      - |
        kind: InitConfiguration
        nodeRegistration:
          kubeletExtraArgs:
            node-labels: "ingress-ready=true"
    extraPortMappings:
      - containerPort: 80
        hostPort: 80
        protocol: TCP
      - containerPort: 443
        hostPort: 443
        protocol: TCP
  - role: worker
  - role: worker
YAML

echo "==> Waiting for all nodes to be Ready"
kubectl wait --for=condition=Ready nodes --all --timeout=180s

echo "==> Installing ingress-nginx"
kubectl apply -f "$INGRESS_MANIFEST"

# The controller binds host ports 80/443, so it must land on the node that
# publishes them. Upstream no longer pins it, so the nodeSelector is added here.
echo "==> Pinning the controller to the node that publishes ports 80/443"
kubectl -n ingress-nginx patch deployment ingress-nginx-controller --type=strategic -p \
  '{"spec":{"template":{"spec":{"nodeSelector":{"kubernetes.io/os":"linux","ingress-ready":"true"}}}}}'

kubectl -n ingress-nginx rollout status deployment/ingress-nginx-controller --timeout=300s

echo
echo "Cluster is ready. Add the demo hostname to /etc/hosts once:"
echo "  echo '127.0.0.1 vodno.local' | sudo tee -a /etc/hosts"
