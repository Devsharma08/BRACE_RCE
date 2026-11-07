#!/bin/sh
set -eu

# =====================================================================
# BRACE RCE — Single Container Entrypoint (POSIX sh)
#
# Starts all services in one container:
#   1. Piston code execution engine (background, port 2000)
#   2. BRACE Node.js app (PM2 cluster + worker, port 5000)
#
# On SIGTERM/SIGINT, both services are shut down gracefully.
# =====================================================================

PISTON_PID=""
PM2_PID=""
PG_PID=""

# Strip surrounding quotes from DATABASE_URL/DIRECT_URL
# (Docker --env-file preserves quotes which breaks Prisma connection string parsing)
for var in DATABASE_URL DIRECT_URL; do
  eval "val=\$$var"
  case "$val" in
    \"*\")
      val="${val#\"}"; val="${val%\"}"
      eval "$var=\"\$val\"; export $var"
      ;;
  esac
done

cleanup() {
  code=${1:-0}
  echo "[entrypoint] Shutting down (code=$code)..."
  [ -n "${PM2_PID:-}" ] && kill -TERM "$PM2_PID" 2>/dev/null || true
  [ -n "${PISTON_PID:-}" ] && kill -TERM "$PISTON_PID" 2>/dev/null || true
  [ -n "${PG_PID:-}" ] && kill -TERM "$PG_PID" 2>/dev/null || true
  wait 2>/dev/null || true
  exit "$code"
}

trap 'cleanup 143' TERM
trap 'cleanup 130' INT

echo "[entrypoint] Initializing cgroups for Piston sandbox isolation..."

# ── Piston cgroup setup (required for container isolation) ─────────────
mkdir -p /sys/fs/cgroup
mkdir -p /sys/fs/cgroup/isolate/init
echo 1 > /sys/fs/cgroup/isolate/cgroup.procs 2>/dev/null || true
echo '+cpuset +cpu +io +memory +pids' > /sys/fs/cgroup/cgroup.subtree_control 2>/dev/null || true
cd /sys/fs/cgroup/isolate
echo 1 > init/cgroup.procs 2>/dev/null || true
echo '+cpuset +memory' > cgroup.subtree_control 2>/dev/null || true
echo "[entrypoint] cgroup initialized"

# ── Start Redis (background, port 6379) ────────────────────────────────
echo "[entrypoint] Starting Redis on port 6379..."
redis-server --daemonize yes --save "" --appendonly no 2>/dev/null || true
sleep 1
if redis-cli ping 2>/dev/null | grep -q PONG; then
  echo "[entrypoint] Redis is ready"
else
  echo "[entrypoint] WARNING: Redis did not start"
fi

# ── Start PostgreSQL (background, port 5432) ───────────────────────────
echo "[entrypoint] Starting PostgreSQL on port 5432..."
mkdir -p /run/postgresql
chown -R postgres:postgres /run/postgresql /var/lib/postgresql 2>/dev/null || true
su - postgres -c "pg_ctl initdb -D /var/lib/postgresql/data -o '--auth=trust'" 2>/dev/null || true
su - postgres -c "pg_ctl start -D /var/lib/postgresql/data -o '-c listen_addresses=127.0.0.1'" 2>/dev/null || true
PG_PID=$(pgrep -u postgres postgres 2>/dev/null | head -1)
sleep 2
# Create database and user
su - postgres -c "psql -c \"CREATE USER brace_user WITH PASSWORD 'brace_password';\"" 2>/dev/null || true
su - postgres -c "psql -c \"CREATE DATABASE brace_rce OWNER brace_user;\"" 2>/dev/null || true
su - postgres -c "psql -c \"GRANT ALL PRIVILEGES ON DATABASE brace_rce TO brace_user;\"" 2>/dev/null || true
if su - postgres -c "psql -d brace_rce -tAc \"SELECT 1 FROM pg_database WHERE datname='brace_rce'\"" 2>/dev/null | grep -q 1; then
  echo "[entrypoint] PostgreSQL is ready (database: brace_rce)"
else
  echo "[entrypoint] WARNING: PostgreSQL database setup may have failed"
fi

# Ensure Piston directories exist
mkdir -p /piston /piston/packages 2>/dev/null || true
chown -R root:root /piston_api /piston 2>/dev/null || true

# ── Start Piston code execution engine (background) ────────────────────
echo "[entrypoint] Starting Piston code execution engine on port 2000..."
PORT=2000
export PORT
ulimit -n 65536
node /piston_api/src &
PISTON_PID=$!

# Wait for Piston to become ready
echo "[entrypoint] Waiting for Piston to be ready..."
i=0
while [ "$i" -lt 60 ]; do
  if curl -sf http://127.0.0.1:2000/api/v2/runtimes >/dev/null 2>&1; then
    echo "[entrypoint] Piston is ready"
    break
  fi
  i=$((i + 1))
  if [ "$i" -eq 60 ]; then
    echo "[entrypoint] WARNING: Piston did not become ready in time"
  fi
  sleep 1
done

# ── Run Prisma migrations ──────────────────────────────────────────────
echo "[entrypoint] Running Prisma database push..."
cd /app/server
npx prisma db push --accept-data-loss 2>&1 || echo "[entrypoint] Prisma push failed (DB may already be migrated)"

# ── Start BRACE application via PM2 ────────────────────────────────────
echo "[entrypoint] Starting BRACE application on port ${PORT:-5000}..."
cd /app/server
npx pm2 start ../ecosystem.config.cjs --env production --no-daemon &
PM2_PID=$!

# Wait for either Piston or PM2 to exit
wait $PISTON_PID $PM2_PID
cleanup $?
