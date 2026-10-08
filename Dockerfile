# --- STAGE 1: Build Frontend & Backend ---
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy workspace package manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/package.json ./server/

# Copy Prisma schema BEFORE install (needed for postinstall)
COPY server/prisma ./server/prisma/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source files
COPY . .

# Generate Prisma Client & Build Server
RUN cd server && npx prisma generate && pnpm run build

# Build Frontend
RUN pnpm run build

# --- STAGE 2: Production Runner ---
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

RUN npm install -g pnpm

# Copy workspace package manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/package.json ./server/

# Copy Prisma schema (needed for prisma generate)
COPY server/prisma ./server/prisma/

# Install production dependencies WITHOUT postinstall scripts
RUN pnpm install --prod --frozen-lockfile --ignore-scripts

# Generate Prisma Client (prisma is not in prod deps, use npx)
RUN cd server && npx prisma generate

# Copy built artifacts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/prisma ./server/prisma

EXPOSE 5000

CMD ["sh", "-c", "cd server && npx prisma migrate deploy && node dist/index.js"]