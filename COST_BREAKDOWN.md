# Cost Breakdown - Staging MVP

**Effective:** 2026-03-03  
**Environment:** AWS us-east-1  
**Target:** $50-80/month

---

## 📊 Monthly Cost Estimate

### Database
- **RDS PostgreSQL 16** (single-AZ, db.t4g.micro)
  - Instance: db.t4g.micro @ $0.018/hour = ~$13/month
  - Storage: 20GB gp3 @ $0.10/GB = ~$2/month
  - Backup storage: ~5GB @ $0.023/GB = ~$0.12/month
  - **Subtotal: ~$15/month**

### Compute
- **ECS Fargate** (API service: 1 task, Worker service: 1 task)
  - vCPU: 2 tasks × 0.25 vCPU × $0.04048/hour = ~$7/month per vCPU
  - Memory: 2 tasks × 0.5 GB × $0.004445/hour = ~$3/month per 0.5GB
  - Task count: 1 API + 1 Worker = 2 tasks
  - **Subtotal: ~$20/month** (conservative estimate)

### Networking
- **ALB** (Application Load Balancer)
  - Base: $16/month
  - LCU (processed bytes): ~$0-5/month (low traffic)
  - **Subtotal: ~$16/month**

- **VPC Endpoints** (no NAT gateways!)
  - ECR API: $7.20/month
  - ECR DKR: $7.20/month
  - S3: Free (gateway endpoint)
  - CloudWatch Logs: $7.20/month
  - SQS: $7.20/month
  - Secrets Manager: $7.20/month
  - STS: $7.20/month
  - Data processing: ~$0.01/GB (minimal)
  - **Subtotal: ~$43/month** (7 interface endpoints)

### Storage
- **S3** (not used yet in MVP, but reserved for future)
  - Estimate: $0/month (< 1GB)

### Queues & Messaging
- **SQS** (2 queues + 2 DLQs)
  - Requests: Standard pricing (first 1M free per month, then $0.40 per M)
  - Estimate for 100 events/sec: ~$5-10/month
  - **Subtotal: ~$10/month**

### Monitoring
- **CloudWatch**
  - Logs: ~$0.50/GB ingested (minimal traffic = ~$2-3/month)
  - Alarms: 10 alarms @ $0.10/alarm = $1/month
  - Dashboard: Free
  - **Subtotal: ~$5/month**

### Secrets & Encryption
- **Secrets Manager**
  - Secret storage: ~$0.40/month (2 secrets)
  - API calls: ~$0.05/month (low traffic)
  - **Subtotal: ~$0.45/month**

---

## 💰 Total: ~$65-80/month (with VPC endpoints)

### Cost Drivers (in order)
1. **VPC Endpoints** ($43/month) — Only choice for "cheap + robust"
2. **ALB** ($16/month) — Required for HTTPS/TLS
3. **ECS Fargate** (~$20/month) — 2 small tasks (0.25 vCPU, 0.5 GB each)
4. **RDS PostgreSQL** (~$15/month) — Cheapest instance class (t4g.micro)
5. **SQS + DLQs** (~$10/month) — Event queues
6. **CloudWatch** (~$5/month) — Logs + alarms
7. **Other** (~$2/month) — Secrets, data transfer, misc

---

## 🔄 Compared to Overbuilt Stack (v1)

| Component | Cheap (Now) | Overbuilt (v1) | Savings |
|-----------|-----------|---|---------|
| Database | RDS t4g.micro single-AZ | Aurora (2x t4g.small, Multi-AZ) | -$50 |
| NAT Gateways | None (use endpoints) | 2x NAT @ $30/month | -$30 |
| ECS tasks | 2 small (0.25 vCPU) | Larger, with autoscaling | -$10 |
| Redis | None | ElastiCache t4g.small | -$30 |
| **Total** | **$65-80/month** | **$300+/month** | **-$250+** |

---

## 📈 Upgrade Path (When Metrics Justify)

1. **RDS scale-up** (~+$10/month)
   - Upgrade from t4g.micro → t4g.small when CPU > 80%
   
2. **RDS Multi-AZ** (~+$15/month)
   - Add failover replica when HA required
   
3. **Add Redis** (~+$30/month)
   - ElastiCache t4g.small when p95 latency > 100ms
   
4. **Add read replica** (~+$15/month)
   - For heavy reporting queries
   
5. **Only then Aurora** (~+$150/month)
   - If all above exhausted AND performance still insufficient

---

## 💡 Key Decisions

### Why VPC Endpoints (not NAT)?
- **Cost:** $43/month vs $30/month (NAT only slightly cheaper)
- **Architecture:** Endpoints are cleaner, more production-shaped
- **Security:** Private subnets stay private; no internet egress needed
- **Flexibility:** Easy to add NAT later if needed (rare)

### Why RDS (not DynamoDB)?
- **Constraints:** Ledger design requires ACID transactions + complex queries
- **Cost:** RDS single-AZ is cheaper than DynamoDB for this workload
- **Simplicity:** Schema can evolve; DynamoDB requires design finalization

### Why No Redis?
- **Target:** <20ms inventory balance query
- **Reality:** PostgreSQL indexes achieve this without cache layer
- **Data-driven:** Add only if actual p95 latency > 100ms
- **Cost:** $30/month saved; can add in Phase 2 with CacheProvider abstraction

---

## 📝 Notes for Scaling

- **Thresholds for upgrade to RDS Multi-AZ:**
  - RDS CPU consistently > 80%
  - Customer SLA requires 99.99% uptime
  - Data loss would be critical (business justifies cost)

- **Thresholds for upgrade to Redis:**
  - p95 latency for /inventory/balance > 100ms
  - p50 latency > 50ms consistently
  - Projection queries slow due to index scan (not network)

- **Thresholds for Kubernetes:**
  - ECS scaling insufficient (tasks can't handle load)
  - Multi-region required (ECS better for single region)
  - Team wants infrastructure flexibility (Kubernetes offers more)

---

**Bottom line:** Start cheap, measure real metrics, upgrade when data supports it.
