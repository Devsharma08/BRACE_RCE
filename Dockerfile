# --- STAGE 1: Build Frontend & Backend ---
FROM node:20-alpine AS builder

WORKDIR /app

RUN --mount=type=tmpfs,target=/root/.npm \
    npm install -g pnpm pm2 prisma

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/package.json ./server/

COPY server/prisma ./server/prisma/

RUN --mount=type=cache,target=/root/.local/share/pnpm \
    pnpm install --frozen-lockfile

COPY . .

ENV NODE_OPTIONS=--max-old-space-size=2048
RUN cd server && npx prisma generate && pnpm run build

ARG VITE_BACKEND_URL="/api"
ARG VITE_BASE_URL="/api"
ARG VITE_API_URL="/api"
ARG VITE_SOCKET_URL=""
ARG VITE_TURNSTLE_SITE_KEY=""
ARG VITE_GOOGLE_CLIENT_ID=""

ENV VITE_BACKEND_URL=${VITE_BACKEND_URL}
ENV VITE_BASE_URL=${VITE_BASE_URL}
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_SOCKET_URL=${VITE_SOCKET_URL}
ENV VITE_TURNSTLE_SITE_KEY=${VITE_TURNSTLE_SITE_KEY}
ENV VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}

RUN if [ -z "$VITE_TURNSTILE_SITE_KEY" ] || [ -z "$VITE_GOOGLE_CLIENT_ID" ]; then \
      echo "WARNING: VITE_TURNSTILE_SITE_KEY and/or VITE_GOOGLE_CLIENT_ID build args are empty."; \
      echo "         The production bundle will render 'not configured' for bot protection and Google sign-in."; \
      echo "         Pass them via docker-compose build.args (read from .env)."; \
    fi

RUN pnpm run build

# --- STAGE 2: Production Runner ---
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV NODE_MODE=production

RUN --mount=type=tmpfs,target=/root/.npm \
    npm install -g pnpm pm2 prisma

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/package.json ./server/

COPY server/prisma ./server/prisma/

RUN --mount=type=cache,target=/root/.local/share/pnpm \
    pnpm install --prod --frozen-lockfile --ignore-scripts

RUN cd server && npx prisma generate

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/prisma ./server/prisma
COPY --from=builder /app/server/prisma.config.js ./server/prisma.config.js
COPY --from=builder /app/ecosystem.config.cjs ./ecosystem.config.cjs
COPY --from=builder /app/nginx.conf ./nginx.conf

RUN mkdir -p logs server/logs /app/frontend

COPY --from=builder /app/dist/index.html /app/frontend/index.html
COPY --from=builder /app/dist/assets /app/frontend/assets

EXPOSE 5000

CMD ["sh", "-c", "cp -r /app/dist/* /app/frontend/ && cd server && npx prisma db push && npx pm2 start ../ecosystem.config.cjs --env production && pm2 logs --lines 1000 && wait"]
