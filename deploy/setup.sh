#!/bin/bash
# BRACE RCE — EC2 User Data Bootstrap Script
# Amazon Linux 2023 | t4g.micro (1 vCPU, 1 GiB RAM)
# Paste this entire script into: EC2 > Instances > Launch > Advanced Details > User data (as text)

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

# ─── 2. Docker Compose (standalone binary) ──────────────────────────────────
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
# NOTE: If repo is private, configure SSH keys or use a PAT:
# sudo -u ec2-user git clone https://<TOKEN>@github.com/Devsharma08/BRACE_RCE.git .

# ─── 4. Environment file ────────────────────────────────────────────────────
  # Production .env — DO NOT commit this file (it is gitignored).
  # Replace placeholder values with real secrets from:
  #   - Google Cloud Console (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)
  #   - Gmail App Password (for OTP emails)
  #   - Your GitHub PAT (for problem import feature)
  #   - Neon Dashboard (DATABASE_URL, DIRECT_URL)
  cat > /opt/brace/.env << 'ENVEOF'
# Frontend is hosted on Vercel — no VITE_* build-time variables needed here.

# Backend Environment Variables
  # Neon Serverless PostgreSQL — replace with your Neon connection strings
  # Both urls from Neon Dashboard → Connection Details → Copy connection string
  DATABASE_URL="postgresql://USER:PASSWORD@ep-<name>-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
  DIRECT_URL="postgresql://USER:PASSWORD@ep-<name>.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"

GITHUB_KEY="your_github_token"
GOOGLE_CLIENT_ID="YOUR_GOOGLE_CLIENT_ID"
GOOGLE_CLIENT_SECRET="YOUR_GOOGLE_CLIENT_SECRET"

JWT_SECRET=changeme_to_a_long_random_string

# Gmail SMTP (OTP delivery)
GMAIL_USER="your_gmail@gmail.com"
GMAIL_APP_PASSWORD="your_app_password"

# Piston
PISTON_URL=http://piston:2000

# Redis (Docker internal hostname)
REDIS_URL=redis://redis:6379

# Frontend URL for CORS
FRONTEND_URL=https://bracerce.devsharma.dev

# Allowed CORS origins — NO localhost in production
ALLOWED_ORIGINS=https://bracerce.devsharma.dev,https://bracerce.server.devsharma.dev
ENVEOF

# ─── 5. Certbot / SSL ───────────────────────────────────────────────────────
mkdir -p /opt/brace/certbot/conf /opt/brace/certbot/www
# Obtain Let's Encrypt certificate (requires port 80 open in security group)
sudo -u ec2-user docker-compose -f /opt/brace/docker-compose.yml run --rm certbot \
  certonly --webroot --webroot-path=/var/www/certbot \
  --email admin@devsharma.dev \
  --agree-tos --no-eff-email \
  --domains bracerce.server.devsharma.dev || true

# ─── 6. Build and start containers ───────────────────────────────────────────
# t4g.micro has only 1 vCPU/1GB RAM — build with swap and memory limits.
# docker-compose build requires buildx 0.17+; use docker build directly.
sudo -u ec2-user docker build -t brace-app . || {
  echo "Docker build failed — check swap and memory."
  exit 1
}
sudo -u ec2-user docker-compose -f /opt/brace/docker-compose.yml up -d
# NOTE: If using pre-built images, use: docker-compose -f /opt/brace/docker-compose.yml pull && docker-compose -f /opt/brace/docker-compose.yml up -d

  # ─── 7. Database migration ──────────────────────────────────────────────────
  sleep 5  # Wait for containers to start
  CONTAINER_ID=$(sudo -u ec2-user docker ps -q -f name=brace-app-1 2>/dev/null || sudo -u ec2-user docker ps -q -f name=app 2>/dev/null | head -1)
  if [ -n "$CONTAINER_ID" ]; then
    sudo -u ec2-user docker exec "$CONTAINER_ID" sh -c "cd server && npx prisma db push" 2>&1
  fi

# ─── 8. Install Piston runtimes ─────────────────────────────────────────────
# Only install languages we support: JS, Java, Python, C, C++
# (Go and Rust were previously installed but removed per requirements)
# gcc provides compilation support for both C and C++
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

# ─── 9. Seed database (problems) ───────────────────────────────────────────
if [ -n "$CONTAINER_ID" ]; then
  sudo -u ec2-user docker cp /opt/brace/server/scripts/seed_problem_bank.js "$CONTAINER_ID:/app/server/scripts/seed_problem_bank.js" 2>/dev/null || true
  sudo -u ec2-user docker exec "$CONTAINER_ID" sh -c "cd server && node scripts/seed_problem_bank.js --write" 2>&1 || true
fi

echo "=== BRACE RCE deployment complete ==="
echo "Frontend: https://bracerce.devsharma.dev"
echo "Backend:  https://bracerce.server.devsharma.dev"
echo "Health:   https://bracerce.server.devsharma.dev/health"
