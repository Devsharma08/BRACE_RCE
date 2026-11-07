# =====================================================================
# BRACE RCE — Single-Container Dockerfile
#
# Consolidates every runtime dependency into one image:
#   • Node.js app (API + Socket.io + PM2 cluster/worker)
#   • Piston code execution engine (Java, JavaScript, Python, C, C++)
#   • Language runtimes: gcc, g++, openjdk-17, python3
#
# Build:  docker build -t brace-app:latest .
# Run:    docker run --privileged -p 5000:5000 -p 2000:2000 \
#             --env-file .env brace-app:latest
# =====================================================================

# ── Stage 1: Build the BRACE application ─────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm pm2 prisma

# Install workspace manifests first (better layer caching)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/package.json ./server/
COPY server/prisma ./server/prisma/

RUN --mount=type=cache,target=/.pnpm-store \
    pnpm --store=/.pnpm-store install --frozen-lockfile

# Copy source and build
COPY . .

ENV NODE_OPTIONS=--max-old-space-size=2048
RUN cd server && npx prisma generate && pnpm run build

# ── Stage 2: Production runtime — Piston base + Node.js app ──────────
# The Piston image (ghcr.io/engineer-man/piston) already contains all
# language runtimes (gcc, g++, openjdk, python3) plus the Piston API
# server at /piston_api. We layer Node.js + the built BRACE app on top.
FROM ghcr.io/engineer-man/piston:latest

ENV NODE_ENV=production
ENV NODE_MODE=production
ENV PISTON_URL=http://127.0.0.1:2000
ENV PORT=5000

# Add Node.js 20 + pnpm + pm2 + prisma on top of Piston's base
RUN apt-get update && apt-get install -y --no-install-recommends \
        curl gnupg ca-certificates \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && npm install -g pnpm pm2 prisma \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy built app from builder stage
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/prisma ./server/prisma
COPY --from=builder /app/ecosystem.config.cjs ./ecosystem.config.cjs
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml

# Install production Node.js dependencies only
RUN --mount=type=cache,target=/.pnpm-store \
    pnpm --store=/.pnpm-store install --prod --frozen-lockfile --ignore-scripts

# Generate Prisma client against the production schema
RUN npx prisma generate

# Custom entrypoint: starts Piston (background), waits, then starts app
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# App port (5000) + Piston port (2000)
EXPOSE 5000 2000

ENTRYPOINT ["docker-entrypoint.sh"]
