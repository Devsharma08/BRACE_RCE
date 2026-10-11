# BRACE RCE - Production Deployment Plan

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        AWS / Vercel                             │
├─────────────────────────────────────────────────────────────────┤
│  Frontend (Vercel)          │  Backend (AWS ECS/Fargate)       │
│  - React + Vite             │  - Node.js + Express             │
│  - Static assets            │  - Socket.io (WebSockets)        │
│  - CDN edge caching         │  - Prisma ORM                    │
└─────────────────────────────┴───────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
   ┌──────────┐         ┌──────────┐         ┌──────────┐
   │  Neon    │         │  Upstash │         │ Piston   │
   │PostgreSQL│         │  Redis   │         │(ECS/EKS) │
   └──────────┘         └──────────┘         └──────────┘
```

## Services Required

| Service | Provider | Purpose | Est. Cost/Month |
|---------|----------|---------|-----------------|
| PostgreSQL | Neon | Primary database | $19 (Scale plan) |
| Redis | Upstash | Caching, sessions, rate limiting | Free tier → $40 |
| Code Execution | Piston | Sandbox for 5 languages | Self-hosted on ECS |
| Frontend Hosting | Vercel | Static hosting + edge functions | Free → $20 |
| Backend Hosting | AWS ECS/Fargate | Container orchestration | ~$50-100 |
| Monitoring | Sentry + CloudWatch | Error tracking + logs | Free tier → $26 |
| DNS/SSL | Cloudflare / Vercel | Domain + certificates | Free |

---

## Phase 1: Database Setup (Neon)

### 1.1 Create Neon Project
```bash
# Via Neon Console or CLI
neon projects create --name brace-rce-prod --region aws-us-east-1
```

### 1.2 Configure Database
- Enable **Connection Pooling** (PgBouncer) for production
- Get two connection strings:
  - `DATABASE_URL` - pooled endpoint (for app runtime)
  - `DIRECT_URL` - direct endpoint (for migrations)

### 1.3 Run Migrations
```bash
# Local with production DATABASE_URL
DATABASE_URL="postgresql://..." npx prisma migrate deploy

# Or use Neon's SQL Editor to run migration SQL
```

### 1.4 Seed Production Data
```bash
# Run seed scripts with production DATABASE_URL
DATABASE_URL="postgresql://..." pnpm run seed
DATABASE_URL="postgresql://..." pnpm run seed:learning-paths
```

---

## Phase 2: Redis Setup (Upstash)

### 2.1 Create Redis Database
- Via Upstash Console: Create database in same region as Neon (us-east-1)
- Enable **REST API** for serverless compatibility
- Get credentials:
  - `UPSTASH_REDIS_REST_URL`
  - `UPSTASH_REDIS_REST_TOKEN`
  - `REDIS_URL` (standard Redis protocol)

### 2.2 Configure for Production
- Set eviction policy: `allkeys-lru`
- Enable TLS
- Configure max memory policy

---

## Phase 3: Piston Code Execution Engine

### Option A: ECS Fargate (Recommended)
```yaml
# piston-task-definition.json
{
  "family": "piston",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "containerDefinitions": [{
    "name": "piston",
    "image": "ghcr.io/engineer-man/piston:latest",
    "portMappings": [{"containerPort": 2000, "protocol": "tcp"}],
    "command": ["--runtimes", "javascript,python,java,cpp,c"],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "/ecs/piston",
        "awslogs-region": "us-east-1",
        "awslogs-stream-prefix": "piston"
      }
    },
    "tmpfs": [{"containerPath": "/tmp", "size": 1024000}]
  }]
}
```

### Option B: EKS (If more control needed)
- Deploy via Helm chart
- Use Karpenter for node scaling

### 3.3 Security
- Place Piston in **private subnet**
- Only backend ECS service can access via Security Group
- No public internet access

---

## Phase 4: Backend Deployment (AWS ECS/Fargate)

### 4.1 Docker Image Build (GitHub Actions)
```yaml
# .github/workflows/deploy-backend.yml
name: Deploy Backend
on:
  push:
    branches: [main]
    paths: ['server/**']

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2
      
      - name: Build, tag, and push image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          cd server
          docker build -t $ECR_REGISTRY/brace-rce-backend:$IMAGE_TAG .
          docker push $ECR_REGISTRY/brace-rce-backend:$IMAGE_TAG
      
      - name: Update ECS service
        run: |
          aws ecs update-service \
            --cluster brace-rce-cluster \
            --service brace-rce-backend \
            --force-new-deployment
```

### 4.2 ECS Service Configuration
- **Task Definition**: 0.5 vCPU, 1 GB memory (adjust based on load)
- **Service**: Fargate, 2+ tasks for HA
- **Load Balancer**: Application Load Balancer (ALB)
- **Auto Scaling**: Target tracking (CPU > 70%, Request count > 1000/task)
- **Health Checks**: `/live` (liveness), `/ready` (readiness)

### 4.3 Environment Variables (AWS Systems Manager Parameter Store / Secrets Manager)
```bash
# Required secrets
DATABASE_URL
DIRECT_URL
JWT_SECRET
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
REDIS_URL
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GITHUB_KEY
SENTRY_DSN
PISTON_URL=http://piston-service:2000  # Internal service discovery
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### 4.4 Domain & SSL
- ALB with ACM certificate for `api.yourdomain.com`
- Route53 alias record pointing to ALB

---

## Phase 5: Frontend Deployment (Vercel)

### 5.1 Vercel Configuration
```json
// vercel.json
{
  "buildCommand": "pnpm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    }
  ],
  "env": {
    "VITE_BACKEND_URL": "https://api.yourdomain.com",
    "VITE_BASE_URL": "https://api.yourdomain.com",
    "VITE_API_URL": "https://api.yourdomain.com",
    "VITE_TURNSTILE_SITE_KEY": "@turnstile_site_key",
    "VITE_GOOGLE_CLIENT_ID": "@google_client_id"
  }
}
```

### 5.2 Environment Variables (Vercel Dashboard)
| Variable | Value |
|----------|-------|
| `VITE_BACKEND_URL` | `https://api.yourdomain.com` |
| `VITE_BASE_URL` | `https://api.yourdomain.com` |
| `VITE_API_URL` | `https://api.yourdomain.com` |
| `VITE_TURNSTILE_SITE_KEY` | From Cloudflare Turnstile |
| `VITE_GOOGLE_CLIENT_ID` | From Google Cloud Console |

### 5.3 Custom Domain
- Add `yourdomain.com` and `www.yourdomain.com` in Vercel
- Configure DNS (CNAME to `cname.vercel-dns.com`)

---

## Phase 6: Google OAuth Configuration

### 6.1 Google Cloud Console
1. Create OAuth 2.0 Client ID (Web Application)
2. Authorized JavaScript Origins:
   - `https://yourdomain.com`
   - `https://www.yourdomain.com`
3. Authorized Redirect URIs:
   - `https://api.yourdomain.com/api/v1/auth/google/callback`
   - `https://yourdomain.com/auth/callback` (if using frontend redirect)

### 6.2 Update Environment Variables
- Backend: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- Frontend: `VITE_GOOGLE_CLIENT_ID`

---

## Phase 7: Cloudflare Turnstile (Captcha)

### 7.1 Create Site
- Add domain `yourdomain.com`
- Get Site Key and Secret Key

### 7.2 Configure
- Frontend: `VITE_TURNSTILE_SITE_KEY`
- Backend: Add `TURNSTILE_SECRET_KEY` for server-side verification (if implemented)

---

## Phase 8: Monitoring & Observability

### 8.1 Sentry
```bash
# Backend - already integrated
SENTRY_DSN="https://xxx@oxxx.ingest.sentry.io/xxx"

# Frontend - add to main.tsx
import * as Sentry from "@sentry/react";
Sentry.init({ dsn: "https://xxx@oxxx.ingest.sentry.io/xxx" });
```

### 8.2 CloudWatch
- ECS service metrics (CPU, Memory, Request count)
- ALB metrics (Target response time, HTTP 5xx)
- Custom metrics via Prometheus endpoint (`/metrics`)

### 8.3 Logging
- Pino logs → CloudWatch Logs
- Structured JSON logging for querying

---

## Phase 9: CI/CD Pipeline

### 9.1 Backend (GitHub Actions → ECS)
```yaml
# On push to main:
# 1. Run tests
# 2. Build Docker image
# 3. Push to ECR
# 4. Deploy to ECS (blue/green or rolling)
```

### 9.2 Frontend (Vercel Git Integration)
- Connect GitHub repo to Vercel
- Automatic deployments on push to main
- Preview deployments for PRs

---

## Phase 10: Post-Deployment Verification

### 10.1 Smoke Tests
```bash
# Health checks
curl https://api.yourdomain.com/live
curl https://api.yourdomain.com/ready

# Auth flow
curl -X POST https://api.yourdomain.com/api/v1/auth/signup ...

# Execute code
curl -X POST https://api.yourdomain.com/api/v1/execute ...

# WebSocket test
# Connect to wss://api.yourdomain.com/socket.io/
```

### 10.2 Load Testing
```bash
# Use k6 or artillery
# Target: 100 concurrent users, 1000 req/min
# Verify auto-scaling triggers
```

### 10.3 Security Checklist
- [ ] HTTPS everywhere (HSTS enabled)
- [ ] CORS restricted to frontend domain
- [ ] CSRF protection enabled
- [ ] Rate limiting configured
- [ ] JWT secrets rotated
- [ ] Database SSL enforced
- [ ] Piston in private subnet
- [ ] Security headers (Helmet) configured

---

## Rollback Plan

### Backend Rollback
```bash
# Via ECS console or CLI
aws ecs update-service \
  --cluster brace-rce-cluster \
  --service brace-rce-backend \
  --task-definition brace-rce-backend:PREVIOUS_REVISION
```

### Frontend Rollback
- Vercel: Click "Rollback" on previous deployment in dashboard

### Database Rollback
- Neon: Point-in-time restore (PITR) to before migration
- Or run `prisma migrate resolve --rolled-back`

---

## Cost Optimization

| Component | Optimization |
|-----------|--------------|
| ECS Fargate | Use Fargate Spot for dev/staging; Savings Plans for prod |
| Neon | Enable auto-suspend for dev branches |
| Upstash | Pay-per-request model scales to zero |
| Vercel | Edge caching reduces function invocations |
| Piston | Scale to zero when idle (ECS capacity provider) |

---

## Checklist Summary

### Pre-Deployment
- [ ] Neon project created, migrations run, data seeded
- [ ] Upstash Redis created, credentials saved
- [ ] Piston deployed to ECS (private subnet)
- [ ] GitHub Actions secrets configured
- [ ] Domain purchased, DNS configured

### Backend Deploy
- [ ] ECR repository created
- [ ] ECS cluster + service created
- [ ] ALB + target group + health checks
- [ ] ACM certificate for api.yourdomain.com
- [ ] Parameter Store / Secrets Manager populated
- [ ] Auto-scaling policies attached
- [ ] CloudWatch alarms configured

### Frontend Deploy
- [ ] Vercel project connected to GitHub
- [ ] Environment variables set
- [ ] Custom domain configured
- [ ] Build succeeds

### Integration
- [ ] Google OAuth redirect URIs updated
- [ ] Turnstile domains configured
- [ ] CORS ALLOWED_ORIGINS updated
- [ ] End-to-end testing passed

### Post-Launch
- [ ] Monitoring dashboards created
- [ ] Alerting rules configured
- [ ] Load test completed
- [ ] Documentation updated