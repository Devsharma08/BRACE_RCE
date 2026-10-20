# --- STAGE 1: Build Frontend & Backend ---
FROM node:20-alpine AS builder

WORKDIR /app

RUN --mount=type=tmpfs,target=/root/.npm \
    npm install -g pnpm pm2 prisma

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/package.json ./server/

COPY server/prisma ./server/prisma/

RUN --mount=type=tmpfs,target=/root/.local/share/pnpm \
    --mount=type=tmpfs,target=/.pnpm-store \
    --mount=type=tmpfs,target=/tmp \
    pnpm install --frozen-lockfile

COPY . .

    # Generate Prisma Client & Build Server
    # t4g.micro (1GB RAM) needs more heap for TypeScript compilation
    ENV NODE_OPTIONS=--max-old-space-size=2048
    RUN cd server && npx prisma generate && pnpm run build

# Build Frontend
#
# Vite inlines VITE_* variables into the browser bundle at BUILD time, so they
# must exist in this stage. `.env` is dockerignored (never COPYed into the
# image), and docker-compose `environment:` only reaches the Express process —
# not the bundle — so these arrive as build args (docker-compose.yml build.args
# interpolates them from the project's .env file).
#
# When these are empty the app still builds, but the UI shows
# "Bot protection not configured" / "Google sign-in not configured".
ARG VITE_BACKEND_URL="/api"
ARG VITE_BASE_URL="/api"
ARG VITE_API_URL="/api"
ARG VITE_SOCKET_URL=""
ARG VITE_TURNSTLE_SITE_KEY=""
ARG VITE_GOOGLE_CLIENT_ID=""

# Export ARGs as ENV so Vite can inline them into the browser bundle at build time
ENV VITE_BACKEND_URL=${VITE_BACKEND_URL}
ENV VITE_BASE_URL=${VITE_BASE_URL}
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_SOCKET_URL=${VITE_SOCKET_URL}
ENV VITE_TURNSTLE_SITE_KEY=${VITE_TURNSTLE_SITE_KEY}
ENV VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}

# Loud (but non-fatal) build-time signal instead of a silent misconfiguration.
RUN if [ -z "$VITE_TURNSTILE_SITE_KEY" ] || [ -z "$VITE_GOOGLE_CLIENT_ID" ]; then \
      echo "WARNING: VITE_TURNSTILE_SITE_KEY and/or VITE_GOOGLE_CLIENT_ID build args are empty."; \
      echo "         The production bundle will render 'not configured' for bot protection and Google sign-in."; \
      echo "         Pass them via docker-compose build.args (read from .env)."; \
    fi

# NOTE on `docker build --check`: the SecretsUsedInArgOrEnv warning for
# VITE_TURNSTILE_SITE_KEY / VITE_GOOGLE_CLIENT_ID is expected and safe — both
# are PUBLIC browser values that Vite inlines into the JS bundle anyway (the
# Turnstile site key and OAuth client ID are designed to be shipped to clients).
# Real secrets (TURNSTILE_SECRET_KEY, GOOGLE_CLIENT_SECRET) are runtime-only
# `environment:` entries in docker-compose.yml and are never baked into the image.

RUN pnpm run build

# --- STAGE 2: Production Runner ---
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV NODE_MODE=production

RUN --mount=type=tmpfs,target=/root/.npm \
    --mount=type=tmpfs,target=/tmp \
    npm install -g pnpm pm2 prisma

# Copy workspace package manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/package.json ./server/

COPY server/prisma ./server/prisma/

RUN --mount=type=tmpfs,target=/root/.local/share/pnpm \
    --mount=type=tmpfs,target=/.pnpm-store \
    --mount=type=tmpfs,target=/tmp \
    pnpm install --prod --frozen-lockfile --ignore-scripts

RUN cd server && npx prisma generate

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/prisma ./server/prisma
COPY --from=builder /app/server/prisma.config.js ./server/prisma.config.js
COPY --from=builder /app/ecosystem.config.cjs ./ecosystem.config.cjs
COPY --from=builder /app/nginx.conf ./nginx.conf

# Create logs directory
RUN mkdir -p logs server/logs /app/frontend

# Copy frontend assets to shared volume mount point
COPY --from=builder /app/dist/index.html /app/frontend/index.html
COPY --from=builder /app/dist/assets /app/frontend/assets

EXPOSE 5000

# Copy frontend assets to shared volume, run migrations, then start with PM2
CMD ["sh", "-c", "cp -r /app/dist/* /app/frontend/ && cd server && npx prisma db push && npx pm2 start ../ecosystem.config.cjs --env production && pm2 logs --lines 1000 && wait"]
