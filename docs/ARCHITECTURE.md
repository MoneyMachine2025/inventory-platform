# Universal Inventory & Commerce Ops Platform - Architecture

## Core Principles

### 1. Event-Driven Architecture
All system state changes are recorded as immutable events in append-only ledgers.

**Benefits:**
- Complete auditability
- No data corruption (ledger is never mutated)
- Reliable synchronization
- Ability to rebuild projections

### 2. Ledger-Based Core
Three foundational ledgers maintain all state:

1. **Inventory Ledger** - Tracks all quantity movements
   - Fields: sku_id, warehouse_id, bin_id, serial_code, lot_code, qty_delta, event_type, effective_at, recorded_at
   - Append-only
   - Unique constraint on (tenant_id, idempotency_key)

2. **Cost Ledger** - Tracks cost allocations
   - Cost types: FREIGHT, INSURANCE, DUTY, BROKERAGE, INBOUND_SHIPPING, WAREHOUSE_FEE, OTHER
   - Append-only
   - Allocates to shipments, receipts, lots

3. **Order Ledger** - Tracks order lifecycle and reservations
   - Manages sales orders, purchase orders, reservations, fulfillment, returns

### 3. Projection Model (High Performance)
Ledgers are not queried directly for UI. Instead, projections (materialized read models) power all queries.

**Projection Types:**
- `inventory_balance_projections` - Current on-hand, reserved, available quantities
- `inventory_reservation_projections` - Total reserved quantities per SKU/Warehouse
- Future: order_status, cost_allocations, etc.

**Benefits:**
- Queries are blazingly fast (<20ms for hot reads)
- Scalable reporting
- Simplified UI dashboards
- Can be regenerated from ledger any time

### 4. Multi-Tenancy
Every table includes `tenant_id` as a partition key. Row-level security or query-layer filtering ensures data isolation.

### 5. Idempotency
Every event ingestion is idempotent via:
- Stable idempotency_key = hash(source_system:source_ref)
- Unique constraint on (tenant_id, idempotency_key)
- Duplicate posts return existing event

---

## System Design

### Tech Stack
- **Backend:** NestJS (TypeScript)
- **Database:** PostgreSQL 16
- **ORM:** Prisma
- **Queue:** BullMQ + Redis (abstracted for SQS swap)
- **Cache:** Redis
- **Storage:** S3 (stub interface for now)
- **Analytics:** ClickHouse (future)

### Directory Structure
```
inventory-platform/
├── apps/
│   └── api/                    # NestJS API
│       ├── src/
│       │   ├── inventory/      # Ledger posting
│       │   ├── projection/     # Projection refresh logic
│       │   ├── reporting/      # Fast query endpoints
│       │   ├── automation/     # Rules & suggestions
│       │   ├── integration/    # Adapter interface
│       │   ├── health/         # Health checks
│       │   ├── prisma/         # Database service
│       │   └── app.module.ts
│       └── main.ts
├── packages/
│   ├── db/                     # Prisma schema + migrations
│   │   ├── prisma/schema.prisma
│   │   └── migrations/
│   ├── core/                   # Domain models, validators, DTOs
│   │   └── src/
│   │       ├── idempotency.ts
│   │       └── dto/
│   └── workers/                # Projection refresh workers
└── docs/
    ├── ARCHITECTURE.md         # This file
    └── INVARIANTS.md           # Database constraints
```

### Module Boundaries

1. **InventoryModule**
   - Responsibility: Post events to inventory ledger
   - Exports: InventoryService
   - Enforces: Idempotency, qty validation, serial constraints

2. **ProjectionModule**
   - Responsibility: Compute and refresh materialized views
   - Exports: ProjectionService
   - Reads from ledger, writes to projection tables

3. **ReportingModule**
   - Responsibility: Fast query endpoints for dashboards
   - Reads from projection tables only
   - Target: <100ms response time

4. **AutomationModule**
   - Responsibility: Rules engine & suggestions
   - Never mutates ledgers directly
   - Creates "proposed actions" that users can accept/reject
   - When accepted, generates events

5. **IntegrationModule**
   - Responsibility: Adapter interface for external systems
   - Converts external data → canonical events
   - Handles Shopify, Amazon, QuickBooks, FedEx, etc.

---

## Data Flow

### Ingestion (Event Posting)
```
External System → Adapter → PostInventoryEventDto → InventoryService.postEvent()
  → Validate (qty, serial) → Generate idempotency key → Ledger Insert
  → Event ID returned
```

### Projection Refresh
```
Ledger Events → ProjectionService.refresh*() → Read all events for SKU/WH
  → Compute balances → Upsert projection table
```

### Query (Dashboard/Reporting)
```
User Query → ReportingController → Projection Table (indexed, hot cache)
  → <20ms response (no ledger scan)
```

---

## Performance Guarantees

- **Inventory Availability Query:** < 20ms (from projection + cache)
- **Dashboard Load:** < 100ms (aggregated projections)
- **Complex Analytics:** < 1s (with appropriate indexes)

**Strategies:**
- Precomputed projections (no real-time scanning)
- Indexed ledgers for rare direct queries (e.g., audit trails)
- Redis caching for hot projections
- Database query planner optimization
- Asynchronous projection refresh via workers

---

## Automation Engine

Automation is **optional and configurable per tenant**.

### Rules Structure
```
Trigger → Condition → Action

Example:
Trigger: inventory_level_change
Condition: inventory < reorder_point
Action: create_reorder_suggestion
```

### Suggestions (Non-Mutating)
- Rules generate suggestions (advisory)
- Suggestions never mutate ledgers directly
- User accepts/rejects suggestion
- On acceptance, actual event is created

### Automation Types (v1)
- Inventory: Reorder, stockout alerts, low stock
- Order: Auto-reservation, warehouse routing (stubs)
- Procurement: Reorder triggers, PO suggestions (stubs)

---

## Security & Governance

- **Row-Level Security:** `tenant_id` enforced at query layer
- **RBAC (stub):** Roles = OWNER, ADMIN, OPS, WAREHOUSE, FINANCE
- **Audit Trail:** All events immutable; full history available
- **Idempotency:** Prevents duplicate charges/inventory double-counts

---

## Integration Adapter Pattern

```typescript
interface IntegrationAdapter {
  ingest(externalData): InventoryEventDto[];
  export(ledgerEvents): ExternalFormat;
}
```

Adapters convert vendor formats to canonical events. Examples:
- Shopify → OrderCreated, ItemReserved, ItemShipped
- FedEx → TrackingReceived, ShipmentDelivered
- QuickBooks → CostAssignment, COGSCalculation

---

## Roadmap

### Phase 1 (MVP - Now)
✅ Inventory ledger + projections
✅ Cost ledger (minimal)
✅ Catalog + Warehouses
✅ Automation rules (skeleton)
✅ Reporting endpoints
✅ Integration adapter interface

### Phase 2
- Full Order ledger
- Advanced cost allocation
- Full integrations (Shopify, Amazon, QuickBooks)
- Worker/queue system for async projections

### Phase 3
- Advanced analytics (ClickHouse)
- AI forecasting
- Full automation expansion
- Multi-entity/intercompany

---

## Notes for Developers

1. **Always append to ledgers** — never update a row in the ledger tables
2. **Projections are computed views** — regenerate them any time without data loss
3. **Idempotency is non-negotiable** — every external input must have stable source_ref + idempotency key
4. **Test at multiple levels:** unit tests for validators, integration tests for ledger → projection flow
5. **Index ledger queries** — effective_at, event_type, sku_id, warehouse_id for fast audits
6. **Cache projection reads** — Redis TTL on balance queries to hit <20ms SLA
