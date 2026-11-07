# =====================================================================
# BRACE RCE — Single-Container Dockerfile (Single Stage)
#
# Consolidates every runtime dependency into one image:
#   • Node.js app (API + Socket.io + PM2 cluster/worker) on Node.js 20
#   • Piston code execution engine (Java, JavaScript, Python, C, C++)
#   • Language runtimes: gcc, g++, openjdk-17, python3
#
# Build:  docker build -t brace-app:latest .
# Run:    docker run --privileged -p 5000:5000 -p 2000:2000 \
#             --env-file .env brace-app:latest
# =====================================================================

FROM node:20-alpine

ENV NODE_ENV=production
ENV NODE_MODE=production
ENV PISTON_URL=http://127.0.0.1:2000
ENV PORT=5000

# Install language runtimes required by Piston for all 5 languages
RUN apk add --no-cache \
        gcc g++ make musl-dev \
        openjdk17 \
        python3 \
        curl \
        ca-certificates \
        redis

# Copy Piston code execution engine from official image
COPY --from=ghcr.io/engineer-man/piston:latest /piston_api /piston_api

# Reinstall Piston npm deps so native modules compile for Alpine/Node.js 20
RUN cd /piston_api && npm install --production --ignore-scripts 2>/dev/null || true

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy workspace manifests (better layer caching)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/package.json ./server/
COPY server/prisma ./server/prisma/

# Install production Node.js dependencies only (no dev deps needed at runtime)
RUN pnpm install --prod --frozen-lockfile --ignore-scripts --store=/.pnpm-store

# Copy source and pre-built dist
COPY . .

# Generate Prisma client (needed at runtime)
RUN cd server && npx prisma generate

# Copy entrypoint
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# App port (5000) + Piston port (2000)
EXPOSE 5000 2000

ENTRYPOINT ["docker-entrypoint.sh"]
