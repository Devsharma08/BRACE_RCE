# --- STAGE 1: Build Frontend & Backend ---
FROM node:20-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm pm2

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/package.json ./server/

COPY server/prisma ./server/prisma/

RUN pnpm install --frozen-lockfile

COPY . .

# Generate Prisma Client & Build Server
RUN cd server && npx prisma generate && pnpm run build

# Build Frontend
RUN pnpm run build

# --- STAGE 2: Production Runner ---
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV NODE_MODE=production

RUN npm install -g pnpm pm2

# Copy workspace package manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/package.json ./server/

COPY server/prisma ./server/prisma/

RUN pnpm install --prod --frozen-lockfile --ignore-scripts

RUN cd server && npx prisma generate

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/prisma ./server/prisma
COPY --from=builder /app/ecosystem.config.cjs ./ecosystem.config.cjs
COPY --from=builder /app/nginx.conf ./nginx.conf

# Create logs directory
RUN mkdir -p logs

EXPOSE 5000

# Run migrations then start with PM2 (API server + queue worker)
CMD ["sh", "-c", "cd server && npx prisma migrate deploy && npx pm2 start ../ecosystem.config.cjs --env production && pm2 logs --lines 1000 && wait"]
