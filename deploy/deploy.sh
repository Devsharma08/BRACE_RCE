#!/bin/bash
# BRACE RCE — EC2 Deployment Script
# Run this on the EC2 instance to pull latest changes and restart services

set -euo pipefail

DEPLOY_DIR="/opt/brace"
REPO="https://github.com/Devsharma08/BRACE_RCE.git"

echo "=== Starting BRACE RCE deployment ==="

cd "$DEPLOY_DIR"

# 1. Pull latest changes from GitHub
echo "[1/6] Pulling latest changes from GitHub..."
git fetch --all
git reset --hard origin/main

# 2. Apply database schema (non-destructive - uses db push)
echo "[2/6] Applying database schema changes..."
APP_CONTAINER=$(docker ps -q -f name=brace_rce-app-1 2>/dev/null || docker ps -q -f name=app 2>/dev/null || echo "")
if [ -n "$APP_CONTAINER" ]; then
    docker exec "$APP_CONTAINER" sh -c "cd /app/server && npx prisma db push" 2>&1 || \
        echo "WARNING: Prisma db push failed, skipping..."
else
    echo "WARNING: App container not found, skipping schema push"
fi

# 3. Restart app container with updated code
echo "[3/6] Building and restarting app container..."
docker build -t brace-app:latest . 2>&1 || {
    echo "ERROR: Docker build failed"
    exit 1
}

# 4. Recreate containers with latest image
echo "[4/6] Restarting services..."
docker compose up -d --no-deps --force-recreate app 2>&1 || \
    docker-compose up -d --no-deps --force-recreate app 2>&1 || \
    echo "WARNING: Could not restart app container via compose"

# 5. Restart nginx (to pick up any config changes)
echo "[5/6] Reloading nginx..."
docker compose restart nginx 2>&1 || \
    docker-compose restart nginx 2>&1 || \
    echo "WARNING: Could not restart nginx"

# 6. Health check
echo "[6/6] Running health check..."
sleep 5
for i in {1..15}; do
    if curl -sf https://bracerce.server.devsharma.dev/health > /dev/null 2>&1; then
        echo "SUCCESS: Application is healthy"
        curl -s https://bracerce.server.devsharma.dev/health | python3 -m json.tool 2>/dev/null || true
        break
    fi
    echo "Waiting for app to start... ($i/15)"
    sleep 3
done

echo "=== Deployment complete ==="
