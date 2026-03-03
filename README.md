# Universal Inventory & Commerce Ops Platform

Event-driven inventory platform built on immutable ledgers, projections, and optional automation.

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 16
- Redis 7+
- pnpm

### Setup

```bash
# Install dependencies
pnpm install

# Start database (with Docker)
docker-compose up -d

# Create .env files (already included)
# - packages/db/.env.local
# - apps/api/.env.local

# Run migrations
pnpm db:migrate

# (Optional) Seed sample data
pnpm db:seed

# Start API
pnpm -F @inventory/api run dev
```

API runs at `http://localhost:3000`

## Architecture

See [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) for full design.

**Core Principles:**
- **Event-Driven:** All changes recorded as immutable events
- **Ledger-Based:** Inventory, Cost, Order ledgers (append-only)
- **Projection Model:** Materialized views for fast queries (<20ms)
- **Multi-Tenant:** Full data isolation from day 1
- **Idempotent:** Duplicate requests return same result

## Modules

### Inventory (`apps/api/src/inventory`)
Posts inventory events to ledger.

```bash
POST /inventory/events?tenant_id=t1
{
  "eventType": "RECEIPT",
  "effectiveAt": "2026-03-03T22:00:00Z",
  "skuId": "sku-123",
  "warehouseId": "wh-456",
  "qtyDelta": 100,
  "sourceSystem": "shopify",
  "sourceRef": "order-789"
}
```

### Projections (`apps/api/src/projection`)
Materializes views from ledger events.

```bash
POST /projections/refresh-balance?tenant_id=t1&sku_id=sku-123&warehouse_id=wh-456
POST /projections/refresh-all?tenant_id=t1
```

### Reporting (`apps/api/src/reporting`)
Fast query endpoints powered by projections.

```bash
GET /reporting/inventory-summary?tenant_id=t1
GET /reporting/low-stock?tenant_id=t1&threshold=10
```

### Automation (`apps/api/src/automation`)
Rules engine. Creates suggestions (non-mutating).

```bash
POST /automation/rules?tenant_id=t1
GET /automation/suggestions?tenant_id=t1
POST /automation/suggestions/:id/accept?tenant_id=t1
```

## Database Schema

Key tables:
- `tenants` — Tenant isolation
- `products`, `variants`, `skus` — Product catalog
- `warehouses`, `bins` — Location structure
- `inventory_events` — **Append-only ledger** (all qty movements)
- `cost_events` — **Append-only ledger** (all cost allocations)
- `inventory_balance_projections` — Materialized view (on-hand, reserved, available)
- `inventory_reservation_projections` — Materialized view (reserved quantities)
- `automation_rules`, `automation_suggestions` — Rules & suggestions

See [`docs/INVARIANTS.md`](./docs/INVARIANTS.md) for constraints.

## Testing

```bash
# Run all tests
pnpm test

# Run specific module tests
pnpm -F @inventory/core run test
pnpm -F @inventory/api run test

# With coverage
pnpm test:cov
```

## Development

```bash
# Watch mode
pnpm dev

# Build all packages
pnpm build

# Database studio (Prisma UI)
pnpm db:studio

# Migrations
pnpm db:migrate        # Create new migration
pnpm db:migrate:deploy # Deploy to prod
```

## Performance

**Targets:**
- Inventory balance query: **< 20ms**
- Dashboard load: **< 100ms**
- Complex analytics: **< 1s**

**How we achieve it:**
1. Precomputed projections (no ledger scans for UI)
2. Indexed on (tenant_id, sku_id, warehouse_id)
3. Redis caching for hot reads
4. Async projection refresh via workers

## Next Steps

- [ ] Run migrations
- [ ] Post sample events
- [ ] Verify <20ms latency on projection queries
- [ ] Build integration adapters (Shopify, Amazon, etc.)
- [ ] Expand automation rules
- [ ] Add ClickHouse for analytics

## Docs

- [`ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — Design & principles
- [`INVARIANTS.md`](./docs/INVARIANTS.md) — Database constraints & tests

## Status

**Phase 1 (MVP):** In progress
- ✅ Inventory ledger + projections
- ✅ Cost ledger (minimal)
- ✅ Catalog + Warehouses
- ✅ Automation rules (skeleton)
- ✅ Reporting endpoints
- ✅ Integration adapter interface
- ⏳ Full test suite & performance benchmarks
- ⏳ Docker deployment

**Phase 2:** Order ledger, full integrations

**Phase 3:** Advanced analytics, AI, multi-entity
