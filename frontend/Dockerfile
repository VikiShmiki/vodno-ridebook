# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Stage 1 - compile the React application.
# ---------------------------------------------------------------------------
FROM node:26-alpine AS builder

WORKDIR /app

# Dependencies are installed from the lockfile first so this layer is reused
# whenever only application source changes.
COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig*.json vite.config.ts index.html ./
COPY public ./public
COPY src ./src

RUN npm run build

# ---------------------------------------------------------------------------
# Stage 2 - serve the static bundle.
# nginx-unprivileged listens on 8080 and runs as UID 101 without root.
# ---------------------------------------------------------------------------
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime

# Apply outstanding Alpine security patches. The base image has already
# dropped to uid 101, so this needs root and must drop back afterwards.
USER root
RUN apk upgrade --no-cache
USER 101

# Default target for the /api proxy; overridden per environment.
ENV BACKEND_URL=http://backend:8000

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template

EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=4s --start-period=10s --retries=3 \
    CMD wget -qO- http://127.0.0.1:8080/healthz > /dev/null || exit 1
