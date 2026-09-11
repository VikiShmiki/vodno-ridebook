# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Stage 1 - build the dependency virtualenv.
# Compilers and build caches stay in this stage and never reach the runtime
# image.
# ---------------------------------------------------------------------------
FROM python:3.12-slim AS builder

ENV PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /build

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ---------------------------------------------------------------------------
# Stage 2 - runtime.
# ---------------------------------------------------------------------------
FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH"

# Apply outstanding OS security patches, then create the unprivileged account
# the image runs as. Both happen in one layer so the apt lists never persist.
# Without this the image inherits whatever CVEs the base tag was built with,
# which the Trivy scan in CI would reject.
RUN apt-get update \
    && apt-get upgrade -y --no-install-recommends \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --gid 1001 vodno \
    && useradd --uid 1001 --gid vodno --create-home --shell /usr/sbin/nologin vodno

WORKDIR /app

COPY --from=builder /opt/venv /opt/venv
COPY --chown=vodno:vodno app ./app

USER vodno

EXPOSE 8000

# Docker-level health check. Kubernetes uses its own HTTP probes against the
# same endpoint and ignores this instruction.
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/api/health', timeout=4).status == 200 else 1)"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers"]
