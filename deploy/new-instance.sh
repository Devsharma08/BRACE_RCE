#!/bin/bash
# BRACE RCE — New EC2 Instance Deployment Script
# Run this on a fresh Amazon Linux 2023 instance
# Requires: pre-configured .env file with secrets (see .env.example)

set -euo pipefail

# ─── 0. Swap (required for Docker builds on t4g.micro) ───────────────────────
fallocate -l 4G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=4096
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# ─── 1. System setup ─────────────────────────────────────────────────────────
dnf update -y
dnf install -y docker git curl

# Start Docker daemon
systemctl enable --now docker
usermod -aG docker ec2-user

# ─── 2. Docker Compose ───────────────────────────────────────────────────────
DOCKER_COMPOSE_VERSION="2.29.2"
ARCH=$(uname -m)
case "$ARCH" in
  aarch64|arm64) COMPOSE_ARCH="aarch64" ;;
  x86_64) COMPOSE_ARCH="x86_64" ;;
  *) echo "Unsupported architecture: $ARCH"; exit 1 ;;
esac
curl -L "https://github.com/docker/compose/releases/download/v${DOCKER_COMPOSE_VERSION}/docker-compose-linux-${COMPOSE_ARCH}" \
  -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
ln -s /usr/local/bin/docker-compose /usr/bin/docker-compose

# ─── 3. Workspace ────────────────────────────────────────────────────────────
mkdir -p /opt/brace
chown -R ec2-user:ec2-user /opt/brace
cd /opt/brace

# Clone the repository
sudo -u ec2-user git clone https://github.com/Devsharma08/BRACE_RCE.git .

# ─── 4. Environment file ─────────────────────────────────────────────────────
# Copy environment template and edit with your secrets before running
cat > /opt/brace/.env << 'ENVEOF'
# Backend Environment Variables
# See .env.example for the full template with documented variables
# Fill these in before deploying:
# DATABASE_URL=
# DIRECT_URL=
# GITHUB_KEY=
# JWT_SECRET=
# GMAIL_USER=
# GMAIL_APP_PASSWORD=
# GOOGLE_CLIENT_ID=
# GOOGLE_CLIENT_SECRET=
# PISTON_URL=http://piston:2000
# REDIS_URL=redis://redis:6379
# FRONTEND_URL=
# ALLOWED_ORIGINS=
ENVEOF

# ─── 5. SSL Certificates ─────────────────────────────────────────────────────
mkdir -p /opt/brace/certbot/conf /opt/brace/certbot/www

# ─── 6. Build and start containers ───────────────────────────────────────────
sudo -u ec2-user docker build -t brace-app . || {
  echo "Docker build failed — check swap and memory."
  exit 1
}
sudo -u ec2-user docker-compose -f /opt/brace/docker-compose.yml up -d

# ─── 7. Database migration ──────────────────────────────────────────────────
sleep 10
CONTAINER_ID=$(sudo -u ec2-user docker ps -q -f name=app 2>/dev/null | head -1)
if [ -n "$CONTAINER_ID" ]; then
  sudo -u ec2-user docker exec "$CONTAINER_ID" sh -c "cd server && npx prisma db push" 2>&1
fi

# ─── 8. Install PM2 and start processes ──────────────────────────────────────
if [ -n "$CONTAINER_ID" ]; then
  sudo -u ec2-user docker exec "$CONTAINER_ID" npm install -g pm2
  sudo -u ec2-user docker exec "$CONTAINER_ID" pm2 start ecosystem.config.cjs
  sudo -u ec2-user docker exec "$CONTAINER_ID" pm2 save
fi

# ─── 9. Install Piston runtimes ──────────────────────────────────────────────
PISTON_INSTALL_SCRIPT="
runtimes = [
  {'language': 'python', 'version': '3.12.0', 'runtime': 'python'},
  {'language': 'node', 'version': '20.11.1', 'runtime': 'node'},
  {'language': 'java', 'version': '15.0.2', 'runtime': 'java'},
  {'language': 'gcc', 'version': '10.2.0', 'runtime': 'gcc'},
]
import requests
for r in runtimes:
  resp = requests.post('http://localhost:2000/api/v2/packages', json=r)
  print(f\"Install {r['language']}: {resp.status_code} {resp.text[:100]}\")
"
docker run --rm --network=container:piston alpine sh -c "
  apk add --no-cache python3 py3-pip curl > /dev/null 2>&1
  pip3 install requests > /dev/null 2>&1
  python3 -c \"$PISTON_INSTALL_SCRIPT\"
" 2>&1 || true

echo "=== BRACE RCE deployment complete ==="
echo "Backend:  https://bracerce.server.devsharma.dev"
echo "Health:   https://bracerce.server.devsharma.dev/health"